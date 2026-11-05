// Policy core types for RBAC + ABAC
export type Role = 'COLLECTOR' | 'AUTHENTICATOR' | 'ADMIN';

export interface DecodedUser {
  id: string;
  email: string;
  role: Role;
  walletAddress?: string; // normalized lowercase address
  approved?: boolean; // for institutions – true = active/approved
  institutionId?: string; // PK of the institution record (if any)
  // extend with any additional ABAC attributes needed later
}

export type Action =
  | 'artwork:create'
  | 'artwork:view'
  | 'artwork:view:private'
  | 'artwork:update'
  | 'artwork:transfer:initiate'
  | 'artwork:transfer:accept'
  | 'artwork:transfer:cancel'
  | 'institution:approve'
  | 'institution:revoke'
  | 'admin:multisig:approve'
  | 'activity:create'
  | 'document:download';

export interface Resource {
  type: 'artwork' | 'transfer' | 'institution' | 'document';
  // generic bag of attributes used by the policy engine
  [key: string]: any;
}

