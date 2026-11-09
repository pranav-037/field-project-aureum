import { DecodedUser, Action, Resource } from './types';
import { AuthorizationError } from '../errors';

interface Rule {
  action: string;       // exact action name or '*' for wildcard
  condition?: string;   // JavaScript expression evaluated against { user, resource }
}

/**
 * Declarative policy rules – RBAC layer
 * Each role maps to an array of permitted actions with optional ABAC conditions.
 */
const rules: Record<string, Rule[]> = {
  /* ── Individual Collectors ── */
  COLLECTOR: [
    { action: 'artwork:view' },
    {
      action: 'artwork:view:private',
      condition: "resource.ownerAddress && user.walletAddress && resource.ownerAddress.toLowerCase() === user.walletAddress.toLowerCase()",
    },
    {
      action: 'artwork:transfer:initiate',
      condition: "resource.ownerAddress && user.walletAddress && resource.ownerAddress.toLowerCase() === user.walletAddress.toLowerCase()",
    },
    {
      action: 'artwork:transfer:accept',
      condition: "resource.buyerAddress && user.walletAddress && resource.buyerAddress.toLowerCase() === user.walletAddress.toLowerCase()",
    },
    {
      action: 'artwork:transfer:cancel',
      condition: "resource.ownerAddress && user.walletAddress && resource.ownerAddress.toLowerCase() === user.walletAddress.toLowerCase()",
    },
    { action: 'activity:create' },
    {
      action: 'document:download',
      condition: "resource.ownerAddress && user.walletAddress && resource.ownerAddress.toLowerCase() === user.walletAddress.toLowerCase()",
    },
  ],

  /* ── Authenticating Institutions ── */
  AUTHENTICATOR: [
    { action: 'artwork:view' },
    { action: 'artwork:create' },
    {
      action: 'artwork:update',
      condition: "resource.issuerInstitutionId && user.institutionId && resource.issuerInstitutionId === user.institutionId",
    },
    {
      action: 'artwork:view:private',
      condition: "Array.isArray(resource.sharedWithInstitutionIds) && user.institutionId && resource.sharedWithInstitutionIds.includes(user.institutionId)",
    },
    {
      action: 'artwork:transfer:initiate',
      condition: "resource.delegation && resource.delegation.institutionId === user.institutionId && resource.delegation.expiresAt > Date.now()",
    },
    { action: 'activity:create' },
    {
      action: 'document:download',
      condition: "Array.isArray(resource.sharedWithInstitutionIds) && user.institutionId && resource.sharedWithInstitutionIds.includes(user.institutionId)",
    },
  ],

  /* ── Platform Administrators ── */
  ADMIN: [
    { action: 'artwork:view' },
    { action: 'artwork:view:private' },
    { action: 'institution:approve' },
    { action: 'institution:revoke' },
    { action: 'admin:multisig:approve' },
    { action: 'activity:create' },
    { action: 'document:download' },
    // NOTE: artwork:create, artwork:update, artwork:transfer:* are NOT granted
    // to admins — they manage the registry, not artwork provenance.
    // artwork:delete is never granted to any role (immutability constraint).
  ],
};

/**
 * Global ABAC deny rules – evaluated BEFORE role rules.
 * If any deny rule matches, the action is blocked regardless of role.
 */
const denyRules: Rule[] = [
  // Immutability: nobody can update or delete finalized provenance blocks
  { action: 'artwork:update', condition: "resource.isFinalized === true" },
  // Transfer lifecycle: block new transfers on PENDING or DISPUTED artworks
  { action: 'artwork:transfer:initiate', condition: "resource.status === 'PENDING' || resource.status === 'DISPUTED'" },
];

/* ────────────────────────────────────────────────── */

/** Evaluate a condition string in a minimal sandbox */
function evalCondition(
  condition: string | undefined,
  ctx: { user: DecodedUser; resource: Partial<Resource> },
): boolean {
  if (!condition) return true;
  // eslint-disable-next-line no-new-func
  const fn = new Function('user', 'resource', `return (${condition});`);
  try {
    return !!fn(ctx.user, ctx.resource);
  } catch {
    return false;
  }
}

/**
 * Main authorisation entry point.
 * Throws AuthorizationError when the action is denied.
 */
export async function authorize(
  user: DecodedUser,
  action: Action,
  resource?: Partial<Resource>,
): Promise<void> {
  const ctx = { user, resource: resource ?? {} };

  // 1. Check global deny rules first
  for (const deny of denyRules) {
    if (deny.action === action && evalCondition(deny.condition, ctx)) {
      throw new AuthorizationError(
        `Action "${action}" is blocked by a system-wide constraint.`,
      );
    }
  }

  // 2. Look up role-based allow rules
  const roleRules = rules[user.role] ?? [];
  const matching = roleRules.find((r) => r.action === action || r.action === '*');

  if (!matching) {
    throw new AuthorizationError(
      `Action "${action}" is not permitted for role "${user.role}".`,
    );
  }

  // 3. Evaluate the ABAC condition on the matching rule
  if (!evalCondition(matching.condition, ctx)) {
    throw new AuthorizationError(
      `Attribute condition failed for action "${action}".`,
    );
  }
}

/**
 * Filter a list of resources, returning only those the user is authorized to access.
 */
export async function filterResources<T extends Partial<Resource>>(
  user: DecodedUser,
  action: Action,
  resources: T[],
): Promise<T[]> {
  const result: T[] = [];
  for (const r of resources) {
    try {
      await authorize(user, action, r);
      result.push(r);
    } catch {
      // silently drop unauthorized items
    }
  }
  return result;
}
