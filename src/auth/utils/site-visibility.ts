/**
 * Site visibility utilities for determining which sites and assets
 * a user can access based on their role scope.
 *
 * Site hierarchy: Sites can have parent-child relationships via parentSiteId.
 * - CLIENT/GLOBAL/SYSTEM scope: Access to ALL sites in the client
 * - SITE_GROUP scope: Access to assigned site + all descendant sites (subsites)
 * - SITE scope: Access to assigned site only
 * - SELF scope: No asset visibility (deprecated)
 */

import { Prisma } from 'src/generated/prisma/client';
import { AccessGrant, reduceAccessGrants } from './access-grants';
import { TCapability } from './capabilities';
import { RoleScope, scopeAllowsAllClientSites, TScope } from './scope';

/**
 * Minimal site data needed for hierarchy computation.
 */
export interface ISiteNode {
  id: string;
  parentSiteId: string | null;
}

/**
 * Site hierarchy map with precomputed descendant site IDs.
 */
export interface ISiteHierarchy {
  /** All site IDs in the client */
  allSiteIds: string[];
  /** Map of siteId -> all descendant site IDs (recursive) */
  descendantsBySiteId: Map<string, string[]>;
}

/**
 * Build a site hierarchy from a list of sites.
 * Computes descendant site IDs for each site for efficient lookup.
 *
 * @param sites - Array of sites with id and parentSiteId
 * @returns Site hierarchy with precomputed descendants
 */
export function buildSiteHierarchy(sites: ISiteNode[]): ISiteHierarchy {
  const allSiteIds = sites.map((s) => s.id);

  // Build parent -> direct children map
  const childrenMap = new Map<string, string[]>();
  for (const site of sites) {
    if (site.parentSiteId) {
      const siblings = childrenMap.get(site.parentSiteId) ?? [];
      siblings.push(site.id);
      childrenMap.set(site.parentSiteId, siblings);
    }
  }

  // Recursively compute all descendants for a site
  function getDescendants(siteId: string): string[] {
    const directChildren = childrenMap.get(siteId) ?? [];
    return directChildren.flatMap((childId) => [
      childId,
      ...getDescendants(childId),
    ]);
  }

  // Build descendants map for all sites
  const descendantsBySiteId = new Map<string, string[]>();
  for (const site of sites) {
    descendantsBySiteId.set(site.id, getDescendants(site.id));
  }

  return { allSiteIds, descendantsBySiteId };
}

/**
 * Get the list of site IDs a user can access based on their access grant.
 *
 * @param accessGrant - The user's reduced access grant for the client
 * @param siteHierarchy - Precomputed site hierarchy for the client
 * @returns Array of site IDs the user can access, or null for full client access
 */
export function getVisibleSiteIds(
  accessGrant: AccessGrant,
  siteHierarchy: ISiteHierarchy,
): string[] | null {
  const { scope, siteId } = accessGrant;

  // CLIENT, GLOBAL, SYSTEM -> full client access
  if (scopeAllowsAllClientSites(scope)) {
    return null; // null means "all sites" - caller should not filter
  }

  switch (scope) {
    case RoleScope.SITE_GROUP:
      // Assigned site + all descendant sites
      const descendants = siteHierarchy.descendantsBySiteId.get(siteId) ?? [];
      return [siteId, ...descendants];

    case RoleScope.SITE:
      // Only the assigned site
      return [siteId];

    case RoleScope.SELF:
      // SELF scope: no asset visibility (deprecated)
      return [];

    default:
      return [];
  }
}

/**
 * Filter assets by visible site IDs.
 *
 * @param assets - Array of assets with siteId property
 * @param visibleSiteIds - Array of visible site IDs, or null for all sites
 * @returns Filtered array of assets
 */
export function filterAssetsByVisibleSites<T extends { siteId: string }>(
  assets: T[],
  visibleSiteIds: string[] | null,
): T[] {
  // null means full access - no filtering needed
  if (visibleSiteIds === null) {
    return assets;
  }

  // Empty array means no access
  if (visibleSiteIds.length === 0) {
    return [];
  }

  const siteIdSet = new Set(visibleSiteIds);
  return assets.filter((asset) => siteIdSet.has(asset.siteId));
}

/**
 * Person with client access - the shape used by notification processor.
 */
export type TPersonWithClientAccess = Prisma.PersonGetPayload<{
  include: {
    clientAccess: {
      include: {
        role: true;
      };
    };
  };
}>;

/**
 * Get visible assets for a member based on their access grants.
 *
 * @param member - Person with client access data
 * @param clientId - The client ID to filter access by
 * @param assets - Array of assets with siteId property
 * @param siteHierarchy - Precomputed site hierarchy for the client
 * @returns Filtered array of assets the member can see
 */
export function getVisibleAssetsForMember<
  T extends { siteId: string; id: string },
>(
  member: TPersonWithClientAccess,
  clientId: string,
  assets: T[],
  siteHierarchy: ISiteHierarchy,
): T[] {
  // Filter to access grants for this client
  const clientAccessGrants = member.clientAccess
    .filter((ca) => ca.clientId === clientId)
    .map(({ clientId, siteId, role }) => ({
      clientId,
      siteId,
      roleId: role.id,
      scope: role.scope as TScope,
      capabilities: role.capabilities as TCapability[],
    }));

  if (clientAccessGrants.length === 0) {
    return [];
  }

  // Reduce to single most permissive grant
  const accessGrant = reduceAccessGrants(clientAccessGrants);

  // Get visible site IDs based on scope
  const visibleSiteIds = getVisibleSiteIds(accessGrant, siteHierarchy);

  // Filter assets
  return filterAssetsByVisibleSites(assets, visibleSiteIds);
}

/**
 * Get visible site IDs for a member based on their access grants.
 * Useful when you need to filter non-asset entities by site.
 *
 * @param member - Person with client access data
 * @param clientId - The client ID to filter access by
 * @param siteHierarchy - Precomputed site hierarchy for the client
 * @returns Array of visible site IDs, or null for full client access
 */
export function getVisibleSiteIdsForMember(
  member: TPersonWithClientAccess,
  clientId: string,
  siteHierarchy: ISiteHierarchy,
): string[] | null {
  const clientAccessGrants = member.clientAccess
    .filter((ca) => ca.clientId === clientId)
    .map(({ clientId, siteId, role }) => ({
      clientId,
      siteId,
      roleId: role.id,
      scope: role.scope as TScope,
      capabilities: role.capabilities as TCapability[],
    }));

  if (clientAccessGrants.length === 0) {
    return [];
  }

  const accessGrant = reduceAccessGrants(clientAccessGrants);
  return getVisibleSiteIds(accessGrant, siteHierarchy);
}

/**
 * Check if a user is restricted to a single site.
 * Returns true only if the reduced scope is SITE or SELF.
 *
 * @param member - Person with client access data
 * @param clientId - The client ID to check
 * @returns True if user can only see a single site
 */
export function isSingleSiteUser(
  member: TPersonWithClientAccess,
  clientId: string,
): boolean {
  const clientAccessGrants = member.clientAccess
    .filter((ca) => ca.clientId === clientId)
    .map(({ clientId, siteId, role }) => ({
      clientId,
      siteId,
      roleId: role.id,
      scope: role.scope as TScope,
      capabilities: role.capabilities as TCapability[],
    }));

  if (clientAccessGrants.length === 0) {
    return true;
  }

  const accessGrant = reduceAccessGrants(clientAccessGrants);

  return (
    accessGrant.scope === RoleScope.SITE || accessGrant.scope === RoleScope.SELF
  );
}
