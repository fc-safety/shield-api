import { RoleScope } from 'src/generated/prisma/client';
import { AccessGrant } from './access-grants';
import {
  buildSiteHierarchy,
  filterAssetsByVisibleSites,
  getVisibleAssetsForMember,
  getVisibleSiteIds,
  getVisibleSiteIdsForMember,
  ISiteNode,
  isSingleSiteUser,
  TPersonWithClientAccess,
} from './site-visibility';

describe('site-visibility', () => {
  describe('buildSiteHierarchy', () => {
    it('should build hierarchy with no parent-child relationships', () => {
      const sites: ISiteNode[] = [
        { id: 'site-1', parentSiteId: null },
        { id: 'site-2', parentSiteId: null },
      ];

      const hierarchy = buildSiteHierarchy(sites);

      expect(hierarchy.allSiteIds).toEqual(['site-1', 'site-2']);
      expect(hierarchy.descendantsBySiteId.get('site-1')).toEqual([]);
      expect(hierarchy.descendantsBySiteId.get('site-2')).toEqual([]);
    });

    it('should build hierarchy with direct children', () => {
      const sites: ISiteNode[] = [
        { id: 'parent', parentSiteId: null },
        { id: 'child-1', parentSiteId: 'parent' },
        { id: 'child-2', parentSiteId: 'parent' },
      ];

      const hierarchy = buildSiteHierarchy(sites);

      expect(hierarchy.descendantsBySiteId.get('parent')).toEqual(
        expect.arrayContaining(['child-1', 'child-2']),
      );
      expect(hierarchy.descendantsBySiteId.get('child-1')).toEqual([]);
      expect(hierarchy.descendantsBySiteId.get('child-2')).toEqual([]);
    });

    it('should build hierarchy with nested children (grandchildren)', () => {
      const sites: ISiteNode[] = [
        { id: 'hq', parentSiteId: null },
        { id: 'region', parentSiteId: 'hq' },
        { id: 'store-1', parentSiteId: 'region' },
        { id: 'store-2', parentSiteId: 'region' },
      ];

      const hierarchy = buildSiteHierarchy(sites);

      // HQ should have region, store-1, and store-2 as descendants
      expect(hierarchy.descendantsBySiteId.get('hq')).toEqual(
        expect.arrayContaining(['region', 'store-1', 'store-2']),
      );
      // Region should have store-1 and store-2
      expect(hierarchy.descendantsBySiteId.get('region')).toEqual(
        expect.arrayContaining(['store-1', 'store-2']),
      );
      // Stores have no descendants
      expect(hierarchy.descendantsBySiteId.get('store-1')).toEqual([]);
      expect(hierarchy.descendantsBySiteId.get('store-2')).toEqual([]);
    });
  });

  describe('getVisibleSiteIds', () => {
    const sites: ISiteNode[] = [
      { id: 'hq', parentSiteId: null },
      { id: 'region-a', parentSiteId: 'hq' },
      { id: 'store-a1', parentSiteId: 'region-a' },
      { id: 'store-a2', parentSiteId: 'region-a' },
      { id: 'region-b', parentSiteId: 'hq' },
      { id: 'store-b1', parentSiteId: 'region-b' },
    ];
    const siteHierarchy = buildSiteHierarchy(sites);

    it('should return null for CLIENT scope (full access)', () => {
      const grant = new AccessGrant({
        scope: RoleScope.CLIENT,
        capabilities: [],
        clientId: 'client-1',
        siteId: 'hq',
      });

      const result = getVisibleSiteIds(grant, siteHierarchy);

      expect(result).toBeNull();
    });

    it('should return null for GLOBAL scope', () => {
      const grant = new AccessGrant({
        scope: RoleScope.GLOBAL,
        capabilities: [],
        clientId: 'client-1',
        siteId: 'hq',
      });

      const result = getVisibleSiteIds(grant, siteHierarchy);

      expect(result).toBeNull();
    });

    it('should return null for SYSTEM scope', () => {
      const grant = new AccessGrant({
        scope: RoleScope.SYSTEM,
        capabilities: [],
        clientId: 'client-1',
        siteId: 'hq',
      });

      const result = getVisibleSiteIds(grant, siteHierarchy);

      expect(result).toBeNull();
    });

    it('should return site + descendants for SITE_GROUP scope', () => {
      const grant = new AccessGrant({
        scope: RoleScope.SITE_GROUP,
        capabilities: [],
        clientId: 'client-1',
        siteId: 'region-a',
      });

      const result = getVisibleSiteIds(grant, siteHierarchy);

      expect(result).toEqual(
        expect.arrayContaining(['region-a', 'store-a1', 'store-a2']),
      );
      expect(result).not.toContain('hq');
      expect(result).not.toContain('region-b');
      expect(result).not.toContain('store-b1');
    });

    it('should return only assigned site for SITE scope', () => {
      const grant = new AccessGrant({
        scope: RoleScope.SITE,
        capabilities: [],
        clientId: 'client-1',
        siteId: 'store-a1',
      });

      const result = getVisibleSiteIds(grant, siteHierarchy);

      expect(result).toEqual(['store-a1']);
    });

    it('should return empty array for SELF scope', () => {
      const grant = new AccessGrant({
        scope: RoleScope.SELF,
        capabilities: [],
        clientId: 'client-1',
        siteId: 'store-a1',
      });

      const result = getVisibleSiteIds(grant, siteHierarchy);

      expect(result).toEqual([]);
    });
  });

  describe('filterAssetsByVisibleSites', () => {
    const assets = [
      { id: 'asset-1', siteId: 'site-a' },
      { id: 'asset-2', siteId: 'site-a' },
      { id: 'asset-3', siteId: 'site-b' },
      { id: 'asset-4', siteId: 'site-c' },
    ];

    it('should return all assets when visibleSiteIds is null', () => {
      const result = filterAssetsByVisibleSites(assets, null);

      expect(result).toEqual(assets);
    });

    it('should return empty array when visibleSiteIds is empty', () => {
      const result = filterAssetsByVisibleSites(assets, []);

      expect(result).toEqual([]);
    });

    it('should filter assets by visible sites', () => {
      const result = filterAssetsByVisibleSites(assets, ['site-a', 'site-c']);

      expect(result).toHaveLength(3);
      expect(result.map((a) => a.id)).toEqual(
        expect.arrayContaining(['asset-1', 'asset-2', 'asset-4']),
      );
    });
  });

  describe('getVisibleAssetsForMember', () => {
    const sites: ISiteNode[] = [
      { id: 'hq', parentSiteId: null },
      { id: 'region', parentSiteId: 'hq' },
      { id: 'store', parentSiteId: 'region' },
    ];
    const siteHierarchy = buildSiteHierarchy(sites);

    const assets = [
      { id: 'asset-hq', siteId: 'hq' },
      { id: 'asset-region', siteId: 'region' },
      { id: 'asset-store', siteId: 'store' },
    ];

    const createMember = (
      scope: RoleScope,
      siteId: string,
    ): TPersonWithClientAccess =>
      ({
        id: 'person-1',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        clientAccess: [
          {
            clientId: 'client-1',
            siteId,
            role: {
              scope,
              capabilities: [],
            },
          },
        ],
      }) as unknown as TPersonWithClientAccess;

    it('should return all assets for CLIENT scope', () => {
      const member = createMember(RoleScope.CLIENT, 'hq');

      const result = getVisibleAssetsForMember(
        member,
        'client-1',
        assets,
        siteHierarchy,
      );

      expect(result).toEqual(assets);
    });

    it('should return site + descendant assets for SITE_GROUP scope', () => {
      const member = createMember(RoleScope.SITE_GROUP, 'region');

      const result = getVisibleAssetsForMember(
        member,
        'client-1',
        assets,
        siteHierarchy,
      );

      expect(result.map((a) => a.id)).toEqual(
        expect.arrayContaining(['asset-region', 'asset-store']),
      );
      expect(result).not.toContainEqual(
        expect.objectContaining({ id: 'asset-hq' }),
      );
    });

    it('should return only assigned site assets for SITE scope', () => {
      const member = createMember(RoleScope.SITE, 'store');

      const result = getVisibleAssetsForMember(
        member,
        'client-1',
        assets,
        siteHierarchy,
      );

      expect(result.map((a) => a.id)).toEqual(['asset-store']);
    });

    it('should return empty array for SELF scope', () => {
      const member = createMember(RoleScope.SELF, 'store');

      const result = getVisibleAssetsForMember(
        member,
        'client-1',
        assets,
        siteHierarchy,
      );

      expect(result).toEqual([]);
    });

    it('should return empty array when member has no access to client', () => {
      const member = createMember(RoleScope.CLIENT, 'hq');

      const result = getVisibleAssetsForMember(
        member,
        'other-client',
        assets,
        siteHierarchy,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getVisibleSiteIdsForMember', () => {
    const sites: ISiteNode[] = [
      { id: 'hq', parentSiteId: null },
      { id: 'region', parentSiteId: 'hq' },
    ];
    const siteHierarchy = buildSiteHierarchy(sites);

    const createMember = (
      scope: RoleScope,
      siteId: string,
    ): TPersonWithClientAccess =>
      ({
        id: 'person-1',
        clientAccess: [
          {
            clientId: 'client-1',
            siteId,
            role: {
              scope,
              capabilities: [],
            },
          },
        ],
      }) as unknown as TPersonWithClientAccess;

    it('should return null for CLIENT scope', () => {
      const member = createMember(RoleScope.CLIENT, 'hq');

      const result = getVisibleSiteIdsForMember(
        member,
        'client-1',
        siteHierarchy,
      );

      expect(result).toBeNull();
    });

    it('should return empty array when member has no access', () => {
      const member = createMember(RoleScope.CLIENT, 'hq');

      const result = getVisibleSiteIdsForMember(
        member,
        'other-client',
        siteHierarchy,
      );

      expect(result).toEqual([]);
    });
  });

  describe('isSingleSiteUser', () => {
    const createMember = (
      scope: RoleScope,
      siteId: string,
    ): TPersonWithClientAccess =>
      ({
        id: 'person-1',
        clientAccess: [
          {
            clientId: 'client-1',
            siteId,
            role: {
              scope,
              capabilities: [],
            },
          },
        ],
      }) as unknown as TPersonWithClientAccess;

    it('should return true for SITE scope', () => {
      const member = createMember(RoleScope.SITE, 'store');
      expect(isSingleSiteUser(member, 'client-1')).toBe(true);
    });

    it('should return true for SELF scope', () => {
      const member = createMember(RoleScope.SELF, 'store');
      expect(isSingleSiteUser(member, 'client-1')).toBe(true);
    });

    it('should return false for SITE_GROUP scope', () => {
      const member = createMember(RoleScope.SITE_GROUP, 'region');
      expect(isSingleSiteUser(member, 'client-1')).toBe(false);
    });

    it('should return false for CLIENT scope', () => {
      const member = createMember(RoleScope.CLIENT, 'hq');
      expect(isSingleSiteUser(member, 'client-1')).toBe(false);
    });

    it('should return true when member has no access', () => {
      const member = createMember(RoleScope.CLIENT, 'hq');
      expect(isSingleSiteUser(member, 'other-client')).toBe(true);
    });
  });
});
