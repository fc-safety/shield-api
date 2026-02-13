/**
 * Role scope - determines the data access boundaries for a role.
 *
 * Scope is a property of the Role model (not a permission).
 * It controls HOW MUCH data a user can see, while capabilities
 * control WHAT ACTIONS they can perform on that data.
 *
 * The scope hierarchy (most to least permissive):
 * - SYSTEM: Full system access (FC Safety internal operations)
 * - GLOBAL: All clients (super admin)
 * - CLIENT: All sites within their assigned client
 * - SITE_GROUP: Multiple specific sites
 * - SITE: Single assigned site only
 * - SELF: Only their own records
 */

import { RoleScope } from 'src/generated/prisma/client';

// Re-export the Prisma enum for convenience
export { RoleScope };

// Type alias for the scope values
export type TScope = RoleScope;

/**
 * Scope hierarchy ordered from most to least permissive.
 * Used for scope comparison operations.
 */
export const SCOPE_HIERARCHY: TScope[] = [
  RoleScope.SYSTEM,
  RoleScope.GLOBAL,
  RoleScope.CLIENT,
  RoleScope.SITE_GROUP,
  RoleScope.SITE,
  RoleScope.SELF,
];

/**
 * Check if a scope is at least as permissive as the required scope.
 *
 * @example
 * isScopeAtLeast(RoleScope.GLOBAL, RoleScope.CLIENT) // true - GLOBAL includes CLIENT
 * isScopeAtLeast(RoleScope.SITE, RoleScope.CLIENT)   // false - SITE is more restrictive than CLIENT
 */
export const isScopeAtLeast = (scope: TScope, required: TScope): boolean => {
  return SCOPE_HIERARCHY.indexOf(scope) <= SCOPE_HIERARCHY.indexOf(required);
};

export const getScopesAtLeast = (scope: TScope): TScope[] => {
  return SCOPE_HIERARCHY.slice(0, SCOPE_HIERARCHY.indexOf(scope) + 1);
};

/**
 * Check if a scope allows access to all sites in a client.
 */
export const scopeAllowsAllClientSites = (scope: TScope): boolean => {
  return isScopeAtLeast(scope, RoleScope.CLIENT);
};

/**
 * Check if a scope allows access to multiple clients.
 */
export const scopeAllowsMultipleClients = (scope: TScope): boolean => {
  return isScopeAtLeast(scope, RoleScope.GLOBAL);
};

/**
 * Human-readable labels for scopes (for UI display).
 */
export const SCOPE_LABELS: Record<TScope, string> = {
  [RoleScope.SYSTEM]: 'System',
  [RoleScope.GLOBAL]: 'Global (All Clients)',
  [RoleScope.CLIENT]: 'Client (All Sites)',
  [RoleScope.SITE_GROUP]: 'Site Group',
  [RoleScope.SITE]: 'Single Site',
  [RoleScope.SELF]: 'Self Only',
};

/**
 * Descriptions for scopes (for UI tooltips/help text).
 */
export const SCOPE_DESCRIPTIONS: Record<TScope, string> = {
  [RoleScope.SYSTEM]: 'Full system access for internal operations',
  [RoleScope.GLOBAL]: 'Access to all clients and all data',
  [RoleScope.CLIENT]: 'Access to all sites within the assigned client',
  [RoleScope.SITE_GROUP]: 'Access to a specific group of sites',
  [RoleScope.SITE]: 'Access limited to a single site',
  [RoleScope.SELF]: 'Access limited to own records only',
};
