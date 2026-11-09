import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { DecodedUser, Action, Resource } from './types';
import { AuthorizationError } from '../errors';

type Rule = {
  action: string; // may be '*'
  condition?: string; // JavaScript expression string
};

let rules: Record<string, Rule[]> = {};

/** Load RBAC/ABAC rules from YAML file (called once at server start) */
export async function loadRules() {
  const filePath = path.resolve(__dirname, 'rules.yaml');
  const raw = await fs.promises.readFile(filePath, 'utf8');
  const parsed = yaml.load(raw) as Record<string, any>;
  rules = Object.fromEntries(
    Object.entries(parsed).map(([role, specs]) => [
      role,
      (specs as any[]).map((s) => ({ action: s.action, condition: s.condition })),
    ]),
  );
}

/** Simple sandboxed evaluation of a condition string */
function evalCondition(
  condition: string | undefined,
  ctx: { user: DecodedUser; resource?: Resource },
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

/** Main authorisation entry point – throws AuthorizationError when denied */
export async function authorize(
  user: DecodedUser,
  action: Action,
  resource?: Resource,
): Promise<void> {
  const roleRules = rules[user.role] ?? [];
  const matching = roleRules.find((r) => r.action === action || r.action === '*');
  if (!matching) {
    throw new AuthorizationError(`Action "${action}" not permitted for role ${user.role}`);
  }
  // resource is intentionally optional – conditions that reference it must guard accordingly
  const allowed = evalCondition(matching.condition, { user, resource });
  if (!allowed) {
    throw new AuthorizationError(`Condition failed for action "${action}"`);
  }
}

/** Filter a list of resources according to the policy */
export async function filterResources<T extends Resource>(
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
