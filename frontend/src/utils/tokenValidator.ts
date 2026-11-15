import { z } from 'zod';

export const APP_ROLES = ['ADMIN', 'AUTHENTICATOR', 'VIEWER', 'COLLECTOR'] as const;
export const CLOCK_SKEW_MS = 30_000;

export const AppRoleSchema = z.enum(APP_ROLES);
export type AppRole = z.infer<typeof AppRoleSchema>;

export const AuthAttributesSchema = z
  .object({
    approved: z.boolean().optional(),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    institutionId: z.string().min(1).optional(),
    jurisdiction: z.string().min(1).optional(),
    department: z.string().min(1).optional(),
    tenantId: z.string().min(1).optional(),
    clearanceLevel: z.number().finite().nonnegative().optional(),
    region: z.string().min(1).optional(),
    accountStatus: z.string().min(1).optional(),
  })
  .passthrough();

export type AuthAttributes = z.infer<typeof AuthAttributesSchema>;

const MetadataSchema = z
  .object({
    role: z.string().optional(),
    roles: z.array(AppRoleSchema).optional(),
    permissions: z.array(z.string().min(1)).optional(),
    attributes: AuthAttributesSchema.optional(),
  })
  .passthrough();

const JwtPayloadSchema = z
  .object({
    sub: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    email: z.string().email(),
    exp: z.number().int().positive(),
    iat: z.number().int().positive().optional(),
    role: z.string().optional(),
    roles: z.array(AppRoleSchema).optional(),
    permissions: z.array(z.string().min(1)).optional(),
    attributes: AuthAttributesSchema.optional(),
    app_metadata: MetadataSchema.optional(),
    user_metadata: MetadataSchema.optional(),
  })
  .passthrough();

const InstitutionSchema = z
  .object({
    id: z.string().min(1).optional(),
    name: z.string().min(1).optional(),
    jurisdiction: z.string().min(1).optional(),
    registrationNumber: z.string().optional(),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
    status: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
  })
  .passthrough();

const UserProfileSchema = z
  .object({
    id: z.string().min(1),
    email: z.string().trim().max(254).email().transform((email) => email.toLowerCase()),
    name: z.string().trim().min(1),
    role: AppRoleSchema,
    roles: z.array(AppRoleSchema).optional(),
    permissions: z.array(z.string().min(1)).optional(),
    attributes: AuthAttributesSchema.optional(),
    walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable().optional(),
    institution: InstitutionSchema.nullable().optional(),
    avatarUrl: z.string().nullable().optional(),
    createdAt: z.union([z.string(), z.date()]).optional(),
    updatedAt: z.union([z.string(), z.date()]).optional(),
  })
  .passthrough();

export type ValidatedAuthUser = z.infer<typeof UserProfileSchema> & {
  roles: AppRole[];
  permissions: string[];
  attributes: AuthAttributes;
};

export interface AuthAuthorization {
  userId: string;
  email: string;
  exp: number;
  roles: AppRole[];
  permissions: string[];
  attributes: AuthAttributes;
}

export interface ValidatedAuthSession {
  user: ValidatedAuthUser;
  authorization: AuthAuthorization;
}

export type AuthSessionValidation =
  | { success: true; session: ValidatedAuthSession }
  | { success: false; reason: string };

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeJwtPayload(token: string): unknown | null {
  try {
    const segments = token.split('.');
    if (segments.length !== 3 || !segments[1]) return null;
    return JSON.parse(decodeBase64Url(segments[1])) as unknown;
  } catch {
    return null;
  }
}

export function validateAuthSession(token: string, rawUser: unknown): AuthSessionValidation {
  if (typeof token !== 'string' || token.length === 0) {
    return { success: false, reason: 'Missing authentication token.' };
  }

  const payloadResult = JwtPayloadSchema.safeParse(decodeJwtPayload(token));
  if (!payloadResult.success) {
    return { success: false, reason: 'Malformed authentication token.' };
  }

  const profileResult = UserProfileSchema.safeParse(rawUser);
  if (!profileResult.success) {
    return { success: false, reason: 'Malformed user profile.' };
  }

  const payload = payloadResult.data;
  const profile = profileResult.data;
  const tokenIdentity = payload.sub ?? payload.userId;
  if (!tokenIdentity || tokenIdentity !== profile.id) {
    return { success: false, reason: 'Token identity does not match the user profile.' };
  }

  if (payload.sub && payload.userId && payload.sub !== payload.userId) {
    return { success: false, reason: 'Conflicting token identity claims.' };
  }

  const tokenEmail = payload.email.trim().toLowerCase();
  if (tokenEmail && tokenEmail !== profile.email) {
    return { success: false, reason: 'Token email does not match the user profile.' };
  }

  if (payload.exp * 1000 <= Date.now() + CLOCK_SKEW_MS) {
    return { success: false, reason: 'Authentication token is expired.' };
  }

  const roleClaims = [
    payload.role,
    payload.app_metadata?.role,
    payload.user_metadata?.role,
  ];
  const claimedRoles: AppRole[] = [
    ...(payload.roles ?? []),
    ...(payload.app_metadata?.roles ?? []),
    ...(payload.user_metadata?.roles ?? []),
  ];
  for (const roleClaim of roleClaims) {
    if (!roleClaim || roleClaim === 'authenticated') continue;
    const parsedRole = AppRoleSchema.safeParse(roleClaim);
    if (!parsedRole.success) {
      return { success: false, reason: 'Malformed role claim in authentication token.' };
    }
    claimedRoles.push(parsedRole.data);
  }
  const profileRoles = [...new Set([profile.role, ...(profile.roles ?? [])])];

  if (claimedRoles.some((role) => !profileRoles.includes(role))) {
    return { success: false, reason: 'Token roles do not match the user profile.' };
  }

  const roles = profileRoles;
  if (roles.length === 0) {
    return { success: false, reason: 'No valid role claims were provided.' };
  }

  const permissions = [
    ...new Set([
      ...(payload.permissions ?? []),
      ...(payload.app_metadata?.permissions ?? []),
      ...(payload.user_metadata?.permissions ?? []),
      ...(profile.permissions ?? []),
    ]),
  ];

  const attributes: AuthAttributes = {
    ...payload.attributes,
    ...payload.app_metadata?.attributes,
    ...payload.user_metadata?.attributes,
    ...profile.attributes,
  };
  if (profile.walletAddress) attributes.walletAddress = profile.walletAddress;
  if (profile.institution?.id) attributes.institutionId = profile.institution.id;
  if (profile.institution?.jurisdiction) attributes.jurisdiction = profile.institution.jurisdiction;
  if (profile.institution?.status) {
    attributes.approved = profile.institution.status.toUpperCase() === 'APPROVED';
  }

  const user: ValidatedAuthUser = {
    ...profile,
    roles,
    permissions,
    attributes,
  };

  return {
    success: true,
    session: {
      user,
      authorization: {
        userId: profile.id,
        email: profile.email,
        exp: payload.exp,
        roles,
        permissions,
        attributes,
      },
    },
  };
}
