import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import mariadb from 'mariadb/promise';
import { AuthService } from 'src/auth/auth.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService, PrismaTxClient } from 'src/prisma/prisma.service';
import type * as LegacyModels from './types/legacy-models';
import type { WsPrompt } from './types/ws';
import {
  addressValueSchema,
  booleanValueSchema,
  numberValueSchema,
  stringValueSchema,
} from './utils/prompt-schema';
import {
  WsCloseInternalException,
  WsCloseNormalException,
} from './utils/ws-exceptions';

const AUTH_TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 4; // 4 hours
const MIGRATION_SESSION_EXPIRES_IN_MINUTES = 30;

interface DataHandlers {
  legacyDb: mariadb.Connection;
  prismaTx: PrismaTxClient;
}

interface WsHandlers {
  prompt: WsPrompt;
  emitEvent: (event: string, data: any) => void;
}

type MigrationFn<TContext, TReturn = void> = (
  dataHandlers: DataHandlers,
  wsHandlers: WsHandlers,
  context: TContext,
) => Promise<TReturn>;

class ConnectionNotInitializedError extends Error {
  constructor() {
    super('Connection not initialized');
  }
}

@Injectable()
export class LegacyMigrationService implements OnModuleDestroy {
  private readonly logger = new Logger(LegacyMigrationService.name);
  private _connectionPool: mariadb.Pool;

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly config: ApiConfigService,
  ) {
    this._connectionPool = mariadb.createPool({
      host: this.config.get('LEGACY_DB_HOST'),
      user: this.config.get('LEGACY_DB_USER'),
      password: this.config.get('LEGACY_DB_PASSWORD'),
      database: this.config.get('LEGACY_DB_NAME'),
      port: this.config.get('LEGACY_DB_PORT'),
      connectionLimit: 10,
    });
  }

  async onModuleDestroy() {
    await this._connectionPool.end();
  }

  async initDb() {
    let db: mariadb.Connection;
    try {
      db = await this._connectionPool.getConnection();
    } catch (e) {
      this.logger.error(
        'Error connecting to MySQL. Attempting to process legacy migrations will fail.',
        e,
      );
      throw new ConnectionNotInitializedError();
    }

    db.on('error', (e) => {
      this.logger.error(
        'Error occurred while connected to legacy database.',
        e,
      );
    });

    return db;
  }

  async getWsToken() {
    return await this.authService.generateCustomToken(
      {},
      AUTH_TOKEN_EXPIRES_IN_SECONDS,
    );
  }

  async validateWsToken(token: string | null | undefined) {
    if (!token) {
      return {
        isValid: false,
        error: 'Token is required',
      };
    }

    return await this.authService.validateCustomToken<{}>(token);
  }

  async processMigration(wsHandlers: WsHandlers) {
    const { emitEvent } = wsHandlers;

    emitEvent('alert', {
      type: 'info',
      message:
        'Hello! I am here to help you migrate clients over from the legacy system to this one.',
    });
    // emitEvent('alert', {
    //   type: 'warning',
    //   message:
    //     'Just a heads up: this is a work in progress. It is not yet ready for production use.',
    // });

    let closeLegacyDb: () => Promise<void> = async () => {};
    try {
      const legacyDb = await this.initDb();
      closeLegacyDb = async () => {
        await legacyDb.end().catch((e) => {
          this.logger.error('Error closing legacy database connection.', e);
        });
      };

      const legacyClient = await this.selectClient({ legacyDb }, wsHandlers);

      await this.prisma.bypassRLS().$transaction(
        async (tx) => {
          const dataHandlers: DataHandlers = { prismaTx: tx, legacyDb };

          // MIGRATE CLIENT
          const { newClient } = await this.migrateClient(
            dataHandlers,
            wsHandlers,
            {
              legacyClient,
            },
          );

          // MIGRATE SITES
          const { legacyPrimaryKeyToNewSiteMap } = await this.migrateSites(
            dataHandlers,
            wsHandlers,
            { legacyClient, newClient },
          );

          // MIGRATE ASSETS
          const { legacyPrimaryKeyToNewAssetMap } = await this.migrateAssets(
            dataHandlers,
            wsHandlers,
            {
              newClient,
              legacyClient,
              legacyPrimaryKeyToNewSiteMap,
            },
          );

          emitEvent('alert', {
            type: 'info',
            message: `Great! That's it for now. Migrating users and inspection history is not yet supported and will need to be done manually.`,
          });
        },
        { timeout: MIGRATION_SESSION_EXPIRES_IN_MINUTES * 60 * 1000 },
      );
    } catch (e) {
      if (e instanceof ConnectionNotInitializedError) {
        throw new WsCloseInternalException(
          'The connection to the legacy database could not be established. Please try again later.',
        );
      } else if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2028') {
          throw new WsCloseInternalException(
            `The migration timed out after ${MIGRATION_SESSION_EXPIRES_IN_MINUTES} minutes. Please try again.`,
          );
        }
        throw e;
      } else {
        throw e;
      }
    } finally {
      await closeLegacyDb();
    }

    emitEvent('alert', {
      type: 'success',
      message: 'Migration completed.',
      signal: 'close',
    });
  }

  private async selectClient(
    dataHandlers: Pick<DataHandlers, 'legacyDb'>,
    wsHandlers: WsHandlers,
  ) {
    const { legacyDb } = dataHandlers;
    const { prompt } = wsHandlers;

    const clients = await legacyDb.query<LegacyModels.Client[]>(
      'SELECT * FROM clients',
    );
    const clientMap = new Map<number, LegacyModels.Client>(
      clients.map((client) => [client.c_no, client]),
    );
    const clientOptions = clients.map((client) => ({
      label: `#${client.c_no} ${client.c_name}`,
      value: client.c_no,
    }));

    let response = await prompt(
      {
        message: 'Which client do you want to migrate?',
        type: 'select',
        options: clientOptions,
      },
      {
        schema: numberValueSchema,
      },
    );

    let client = clientMap.get(response.value);
    while (!client) {
      response = await prompt(
        {
          message: 'Invalid client. Please try again.',
          type: 'select',
          options: clientOptions,
        },
        {
          schema: numberValueSchema,
        },
      );
      client = clientMap.get(response.value);
    }

    return client;
  }

  private migrateClient: MigrationFn<
    {
      legacyClient: LegacyModels.Client;
    },
    { newClient: TClientBasic }
  > = async (dataHandlers, wsHandlers, context) => {
    const { legacyDb, prismaTx } = dataHandlers;
    const { emitEvent, prompt } = wsHandlers;
    const { legacyClient } = context;

    emitEvent('alert', {
      type: 'info',
      message: `Great! Let me check if this client is already in the new system.`,
    });

    let newClient = await prismaTx.client.findFirst({
      where: {
        legacyClientId: legacyClient.c_id,
      },
      select: CLIENT_BASIC_SELECT,
    });

    if (!newClient) {
      emitEvent('alert', {
        type: 'info',
        message: `Looks like it isn't there yet. I'll go ahead and start migrating it over.`,
      });

      // ---> GET ADDRESS FROM PRIMARY LOCATION IF AVAILABLE, OR PROMPT FOR IT
      const locations = await legacyDb.query<LegacyModels.Location[]>(
        'SELECT * FROM locations WHERE loc_c_no = ? ORDER BY loc_date_insert DESC',
        [legacyClient.c_no],
      );
      const primaryLocation =
        locations.find((location) => location.loc_type === 1) ??
        locations.at(0);

      let address: Prisma.ClientCreateInput['address']['create'] | null =
        primaryLocation && primaryLocation.loc_addr1 && primaryLocation.loc_city
          ? {
              street1: primaryLocation.loc_addr1.trim(),
              street2: primaryLocation.loc_addr2?.trim(),
              city: primaryLocation.loc_city.trim(),
              state: primaryLocation.loc_state?.trim(),
              zip: primaryLocation.loc_zip?.trim(),
            }
          : null;

      if (!address) {
        const response = await prompt(
          {
            message: `I couldn't find an address for this client. What's the address for ${legacyClient.c_name ?? 'this client'}?`,
            type: 'address',
          },
          {
            schema: addressValueSchema,
          },
        );

        address = response.value;
      }

      // ---> GET PHONE NUMBER FROM PRIMARY LOCATION IF AVAILABLE, OR PROMPT FOR IT
      let phoneNumber = legacyClient.c_phone;
      if (!phoneNumber) {
        const response = await prompt(
          {
            message: `I couldn't find a phone number for this client. What's the phone number for ${legacyClient.c_name ?? 'this client'}?`,
            type: 'phone',
          },
          { schema: stringValueSchema },
        );

        phoneNumber = response.value;
      }

      // ---> CREATE NEW CLIENT
      newClient = await prismaTx.client.create({
        data: {
          createdOn: legacyClient.c_date_insert ?? undefined,
          startedOn: legacyClient.c_date_insert ?? new Date(),
          // Automatically mark auto-migrated clients as legacy.
          // Client can be moved to "ACTIVE" manually later.
          status: 'LEGACY',
          legacyClientId: legacyClient.c_id,
          name: legacyClient.c_name,
          address: {
            create: address,
          },
          phoneNumber,
          homeUrl: legacyClient.c_www,
          defaultInspectionCycle: 30,
        },
        select: CLIENT_BASIC_SELECT,
      });

      emitEvent('alert', {
        type: 'info',
        message: `Okay, the client details have been migrated.`,
      });
    } else {
      const response = await prompt(
        {
          message: `Okay, it looks like this client has already been migrated. Would you still like to continue?`,
          type: 'confirm',
        },
        {
          schema: booleanValueSchema,
        },
      );

      if (!response.value) {
        emitEvent('alert', {
          type: 'info',
          message: `Alright, we'll wrap it up there!`,
        });
        throw new WsCloseNormalException('Migration cancelled.');
      }
    }

    return { newClient };
  };

  private migrateSites: MigrationFn<
    {
      legacyClient: LegacyModels.Client;
      newClient: TClientBasic;
    },
    {
      legacyPrimaryKeyToNewSiteMap: Map<number, TSiteBasic>;
    }
  > = async (dataHandlers, wsHandlers, context) => {
    const { legacyDb, prismaTx } = dataHandlers;
    const { emitEvent, prompt } = wsHandlers;
    const { legacyClient, newClient } = context;

    const clientAddress = await prismaTx.address.findFirst({
      where: {
        client: {
          id: newClient.id,
        },
      },
    });

    // Remember values that may be repeated to speed up user input.
    const memory: {
      lastAddress: Prisma.ClientCreateInput['address']['create'] | null;
      lastPhoneNumber: string | null;
    } = {
      lastAddress: clientAddress,
      lastPhoneNumber: newClient.phoneNumber,
    };

    const legacySites = await legacyDb.query<LegacyModels.Location[]>(
      'SELECT * FROM locations WHERE loc_c_no = ? ORDER BY loc_date_insert DESC',
      [legacyClient.c_no],
    );

    const legacySiteGroups = await legacyDb.query<LegacyModels.Group[]>(
      'SELECT * FROM groups WHERE group_c_no = ?',
      [legacyClient.c_no],
    );

    const totalLegacySites = legacySites.length + legacySiteGroups.length;

    if (totalLegacySites > 0) {
      emitEvent('alert', {
        type: 'info',
        message: `Now let's work on migrating the client's sites (also known as locations).`,
      });
    } else {
      emitEvent('alert', {
        type: 'info',
        message: `I can see this client has no sites to migrate. We can go ahead and skip the site migration.`,
      });
      return { legacyPrimaryKeyToNewSiteMap: new Map() };
    }

    /** All sites that were already migrated, including both site groups and subsites. */
    const alreadyMigratedSites = await prismaTx.site.findMany({
      select: SITE_BASIC_SELECT,
      where: {
        client: {
          legacyClientId: legacyClient.c_id,
        },
      },
    });

    /** Maps legacy group primary key to the new site group ID. */
    const legacyPrimaryKeyToNewSiteGroupIdMap = new Map<number, string>();

    /** Maps legacy group external ID to the new site group instance. */
    const legacyIdToNewSiteGroupIdMap = new Map<string, string>(
      alreadyMigratedSites
        .filter(
          (
            site,
          ): site is typeof site & {
            legacyGroupId: NonNullable<typeof site.legacyGroupId>;
          } => !!site.legacyGroupId,
        )
        .map((site) => [site.legacyGroupId, site.id]),
    );

    let migratedSiteGroupCount = 0;
    for (const legacySiteGroup of legacySiteGroups) {
      // As a safety, ignore groups that don't have an external ID. In practice, all groups
      // should have an external ID.
      if (legacySiteGroup.group_id === null) {
        continue;
      }

      // Don't duplicate site groups that were already migrated, but still add the
      // primary key mappings to be used for migrating subsites.
      if (legacyIdToNewSiteGroupIdMap.has(legacySiteGroup.group_id)) {
        legacyPrimaryKeyToNewSiteGroupIdMap.set(
          legacySiteGroup.group_no,
          legacyIdToNewSiteGroupIdMap.get(legacySiteGroup.group_id)!,
        );
        continue;
      }

      // ---> BUILD NEW SITE GROUP
      const siteGroupName = legacySiteGroup.group_name ?? 'Unknown';
      const groupDisplay = `${siteGroupName}${legacySiteGroup.group_desc ? ` (${legacySiteGroup.group_desc})` : ''}`;

      const address = await this.promptForAddress(
        {
          message: `What's the address for the site group ${groupDisplay}?`,
          value: memory.lastAddress,
        },
        wsHandlers,
      );
      memory.lastAddress = address;

      const phoneNumber = await this.promptForPhoneNumber(
        {
          message: `What's the phone number for the site group ${groupDisplay}?`,
          value: memory.lastPhoneNumber,
        },
        wsHandlers,
      );
      memory.lastPhoneNumber = phoneNumber;

      // ---> CREATE NEW SITE GROUP
      const newSiteGroup = await prismaTx.site.create({
        data: {
          legacyGroupId: legacySiteGroup.group_id,
          name: siteGroupName,
          phoneNumber,
          address: {
            create: address,
          },
          client: {
            connect: {
              id: newClient.id,
            },
          },
        },
      });

      legacyPrimaryKeyToNewSiteGroupIdMap.set(
        legacySiteGroup.group_no,
        newSiteGroup.id,
      );

      migratedSiteGroupCount++;
    }

    let migratedSiteCount = 0;

    /** Maps legacy location primary key to the new site instance. Does not include site groups,
     * because legacy site groups could not be assigned assets.
     */
    const legacyPrimaryKeyToNewSiteMap = new Map<number, TSiteBasic>();

    /** Maps legacy location external ID to the new site instance. */
    const legacyIdToNewSiteIdMap = new Map<string, TSiteBasic>(
      alreadyMigratedSites
        .filter(
          (
            site,
          ): site is typeof site & {
            legacySiteId: NonNullable<typeof site.legacySiteId>;
          } => !!site.legacySiteId,
        )
        .map((site) => [site.legacySiteId, site]),
    );

    for (const legacySite of legacySites) {
      let newSite = alreadyMigratedSites.find(
        (s) => s.legacySiteId === legacySite.loc_id,
      );

      if (!legacySite.loc_id) {
        continue;
      }

      if (legacyIdToNewSiteIdMap.has(legacySite.loc_id)) {
        legacyPrimaryKeyToNewSiteMap.set(
          legacySite.loc_no,
          legacyIdToNewSiteIdMap.get(legacySite.loc_id)!,
        );
        continue;
      }

      // ---> BUILD NEW SITE
      let siteName = legacySite.loc_name;
      if (!siteName && (legacySite.loc_addr1 || legacySite.loc_city)) {
        const response = await prompt(
          {
            message: `What's the name for the site located at ${[legacySite.loc_addr1, legacySite.loc_city, legacySite.loc_state, legacySite.loc_zip].filter(Boolean).join(', ')}?`,
          },
          {
            schema: stringValueSchema,
          },
        );

        siteName = response.value;
      }

      if (!siteName) {
        const assetRows = await legacyDb.query(
          'SELECT COUNT(a_no) as count FROM assets WHERE a_loc_no = ?',
          [legacySite.loc_no],
        );
        const assetCount = (assetRows as { count: number }[])[0].count;
        if (assetCount < 1) {
          // If this site has no name and no assets, we can skip it.
          continue;
        }
      }

      let address: Prisma.SiteCreateInput['address']['create'] | null = null;
      if (legacySite.loc_addr1 && legacySite.loc_city) {
        address = {
          street1: legacySite.loc_addr1,
          street2: legacySite.loc_addr2,
          city: legacySite.loc_city,
          state: legacySite.loc_state,
          zip: legacySite.loc_zip,
        };
      } else {
        address = await this.promptForAddress(
          {
            message: `What's the address for the site ${siteName ?? 'Unknown'}?`,
            value: memory.lastAddress,
          },
          wsHandlers,
        );
      }
      memory.lastAddress = address;

      let phoneNumber = legacySite.loc_phone;
      if (!phoneNumber) {
        phoneNumber = await this.promptForPhoneNumber(
          {
            message: `What's the phone number for the site ${siteName ?? 'Unknown'}?`,
            value: memory.lastPhoneNumber,
          },
          wsHandlers,
        );
      }
      memory.lastPhoneNumber = phoneNumber;

      // ---> CREATE NEW SITE
      newSite = await prismaTx.site.create({
        data: {
          createdOn: legacySite.loc_date_insert ?? undefined,
          legacySiteId: legacySite.loc_id,
          name:
            siteName ??
            legacySite.loc_city ??
            legacySite.loc_state ??
            'Unknown',
          phoneNumber,
          address: {
            create: address,
          },
          client: {
            connect: {
              id: newClient.id,
            },
          },
          parentSite:
            legacySite.loc_group_no !== null &&
            legacyPrimaryKeyToNewSiteGroupIdMap.has(legacySite.loc_group_no)
              ? {
                  connect: {
                    id: legacyPrimaryKeyToNewSiteGroupIdMap.get(
                      legacySite.loc_group_no,
                    )!,
                  },
                }
              : undefined,
        },
        select: SITE_BASIC_SELECT,
      });

      legacyPrimaryKeyToNewSiteMap.set(legacySite.loc_no, newSite);
      migratedSiteCount++;
    }

    const totalSites = migratedSiteCount + migratedSiteGroupCount;

    emitEvent('alert', {
      type: totalSites > 0 ? 'info' : 'warning',
      message:
        totalSites > 0
          ? `Successfully migrated ${migratedSiteCount} sites and ${migratedSiteGroupCount} site groups.`
          : `No sites were migrated. This is likely due either to the sites already being migrated or the site data is missing too much information.`,
    });

    return { legacyPrimaryKeyToNewSiteMap };
  };

  private migrateAssets: MigrationFn<
    {
      newClient: TClientBasic;
      legacyClient: LegacyModels.Client;
      legacyPrimaryKeyToNewSiteMap: Map<number, TSiteBasic>;
    },
    { legacyPrimaryKeyToNewAssetMap: Map<number, TAssetBasic> }
  > = async (dataHandlers: DataHandlers, wsHandlers: WsHandlers, context) => {
    const { legacyDb, prismaTx } = dataHandlers;
    const { emitEvent, prompt } = wsHandlers;
    const { newClient, legacyClient, legacyPrimaryKeyToNewSiteMap } = context;

    const legacyAssets = await legacyDb.query<LegacyModels.Asset[]>(
      'SELECT * FROM assets WHERE a_loc_no IN (SELECT loc_no FROM locations WHERE loc_c_no = ?)',
      [legacyClient.c_no],
    );

    if (legacyAssets.length > 0) {
      emitEvent('alert', {
        type: 'info',
        message: `Now let's work on migrating the client's assets.`,
      });
    } else {
      emitEvent('alert', {
        type: 'info',
        message: `I can see this client has no assets to migrate. We can go ahead and skip the asset migration.`,
      });
      return { legacyPrimaryKeyToNewAssetMap: new Map() };
    }

    const alreadyMigratedAssets = await prismaTx.asset.findMany({
      select: ASSET_BASIC_SELECT,
      where: {
        client: {
          legacyClientId: legacyClient.c_id,
        },
      },
    });

    let assetsMigrated = 0;

    /** Maps legacy asset primary key to the new asset instance. */
    const legacyPrimaryKeyToNewAssetMap = new Map<number, TAssetBasic>();

    /** Maps legacy asset external ID to the new asset instance. */
    const legacyIdToNewAssetMap = new Map(
      alreadyMigratedAssets.map((asset) => [asset.legacyAssetId, asset]),
    );

    for (const legacyAsset of legacyAssets) {
      if (legacyAsset.a_id === null) {
        continue;
      }

      // If the asset has already been migrated, skip it.
      if (legacyIdToNewAssetMap.has(legacyAsset.a_id)) {
        legacyPrimaryKeyToNewAssetMap.set(
          legacyAsset.a_no,
          legacyIdToNewAssetMap.get(legacyAsset.a_id)!,
        );
        continue;
      }

      // ---> GET CONNECTED SITE
      let newSite: TSiteBasic;
      if (
        legacyAsset.a_loc_no !== null &&
        legacyPrimaryKeyToNewSiteMap.has(legacyAsset.a_loc_no)
      ) {
        newSite = legacyPrimaryKeyToNewSiteMap.get(legacyAsset.a_loc_no)!;
      } else {
        continue;
      }

      // ---> GET CONNECTED PRODUCT AND TAG
      const [{ product }, { tag }] = await Promise.all([
        this.getOrMigrateProduct(dataHandlers, wsHandlers, {
          legacyProductNo: legacyAsset.a_p_no,
          legacyProductCategoryNo: legacyAsset.a_cat_no,
          newClient,
          legacyClient,
        }),
        legacyAsset.a_t_no === null
          ? Promise.resolve({ tag: null })
          : this.getOrMigrateTag(dataHandlers, wsHandlers, {
              legacyTagNo: legacyAsset.a_t_no,
              newSite,
            }),
      ]);

      // If asset isn't tied to a product, skip it.
      // This shouldn't happen in practice, but it's a safety check.
      if (!product) {
        continue;
      }

      // ---> BUILD NEW ASSET
      const assetName = [
        legacyAsset.a_location,
        product.productCategory.shortName ?? product.productCategory.name,
        '#' + legacyAsset.a_no,
      ]
        .filter(Boolean)
        .join(' ');

      // ---> CREATE NEW ASSET
      const asset = await prismaTx.asset.create({
        data: {
          legacyAssetId: legacyAsset.a_id,
          active: legacyAsset.a_status === 1,
          location: legacyAsset.a_location ?? '',
          placement: legacyAsset.a_placement ?? '',
          serialNumber: legacyAsset.a_serial ?? '',
          name: assetName,
          product: {
            connect: {
              id: product.id,
            },
          },
          tag: tag
            ? {
                connect: {
                  id: tag.id,
                },
              }
            : undefined,
          site: {
            connect: {
              id: newSite.id,
            },
          },
          client: {
            connect: {
              id: newSite.clientId,
            },
          },
        },
        select: ASSET_BASIC_SELECT,
      });
      legacyPrimaryKeyToNewAssetMap.set(legacyAsset.a_no, asset);
      assetsMigrated++;
    }

    emitEvent('alert', {
      type: assetsMigrated > 0 ? 'info' : 'warning',
      message:
        assetsMigrated > 0
          ? `Successfully migrated ${assetsMigrated} assets.`
          : `No assets were migrated. This is likely due either to the assets already being migrated or the asset data is missing too much information.`,
    });

    return { legacyPrimaryKeyToNewAssetMap };
  };

  private async promptForAddress(
    context: {
      message: string;
      value:
        | Prisma.ClientCreateInput['address']['create']
        | Prisma.SiteCreateInput['address']['create']
        | null;
    },
    wsHandlers: WsHandlers,
  ) {
    const { message, value } = context;
    const { prompt } = wsHandlers;

    const { value: address } = await prompt(
      { message, type: 'address', value },
      { schema: addressValueSchema },
    );

    return address;
  }

  private async promptForPhoneNumber(
    context: { message: string; value: string | null },
    wsHandlers: WsHandlers,
  ) {
    const { message, value } = context;
    const { prompt } = wsHandlers;

    const { value: phoneNumber } = await prompt(
      { message, type: 'phone', value },
      { schema: stringValueSchema },
    );

    return phoneNumber;
  }

  private getOrMigrateProduct: MigrationFn<
    {
      newClient: TClientBasic;
      legacyClient: LegacyModels.Client;
      legacyProductNo: number | null;
      legacyProductCategoryNo: number | null;
    },
    { product: TProductBasic | null }
  > = async (dataHandlers, wsHandlers: WsHandlers, context) => {
    const { legacyDb, prismaTx } = dataHandlers;
    const {
      legacyProductNo,
      legacyProductCategoryNo,
      newClient,
      legacyClient,
    } = context;

    if (legacyProductNo === null && legacyProductCategoryNo === null) {
      return { product: null };
    }

    let legacyProduct: LegacyModels.Product | null = null;
    let legacyProductCategory: LegacyModels.Category | null = null;

    if (legacyProductNo) {
      legacyProduct = await legacyDb
        .query<LegacyModels.Product>('SELECT * FROM products WHERE p_no = ?', [
          legacyProductNo,
        ])
        .then((rows) => rows[0]);
    } else if (legacyProductCategoryNo) {
      legacyProductCategory = await legacyDb
        .query<LegacyModels.Category>(
          'SELECT * FROM category WHERE cat_no = ?',
          [legacyProductCategoryNo],
        )
        .then((rows) => rows[0]);
    }

    if (
      (!legacyProduct || !legacyProduct.p_id) &&
      (!legacyProductCategory || !legacyProductCategory.cat_id)
    ) {
      return { product: null };
    }

    let product: TProductBasic | null = null;
    let productCategory: TProductCategoryBasic | null = null;

    if (!legacyProduct) {
      // If no legacy product is found, there must be an associated product category.
      // Try to find or create this category in the new system.
      productCategory = await this.getOrMigrateProductCategory(
        dataHandlers,
        wsHandlers,
        {
          newClient,
          legacyClient,
          legacyProductCategoryNo: legacyProductCategory!.cat_no,
        },
      ).then((result) => result.productCategory);

      // If the get or create failed, give up and return null.
      if (!productCategory || !productCategory.name.trim()) {
        return { product: null };
      }

      // Otherwise, try to create (or find if this was already created) a generic product for this category.
      const genericCategoryPrefix = `#${legacyProductCategory!.cat_no} ${productCategory.name.trim()}`;
      const genericProductName = `${genericCategoryPrefix} Asset`;
      product = await prismaTx.product.findFirst({
        where: {
          name: genericProductName,
          productCategoryId: productCategory.id,
        },
        select: PRODUCT_BASIC_SELECT,
      });

      // If no product was found, create a new one.
      if (!product) {
        product = await prismaTx.product.create({
          data: {
            name: genericProductName,
            type: 'PRIMARY',
            productCategory: {
              connect: {
                id: productCategory.id,
              },
            },
            // Create a default manufacturer for this product.
            // In the old system, no custom manufacturers were used, but manufacturers
            // are always required in the new system.
            manufacturer: {
              create: {
                name: `${genericCategoryPrefix} Manufacturer`,
                client: {
                  connect: {
                    id: newClient.id,
                  },
                },
              },
            },
            client: {
              connect: {
                id: newClient.id,
              },
            },
          },
          select: PRODUCT_BASIC_SELECT,
        });
      }
    } else {
      // If legacy product is found, make sure it's properly migrated to the new system.

      // In practice, consumable product types connected to assets shouldn't happen,
      // but we're checking anyway for safety.
      if (legacyProduct.p_type === 2) {
        // Not dealing with consumables for now.
        return { product: null };
      }

      // Try to find the product in the new system.
      product = await prismaTx.product.findFirst({
        where: {
          legacyProductId: legacyProduct.p_id,
        },
        select: PRODUCT_BASIC_SELECT,
      });

      // If no product is found, try to migrate it.
      if (!product) {
        if (!legacyProduct.p_cat_no || !legacyProduct.p_mfg_no) {
          return { product: null };
        }

        const [{ productCategory }, { manufacturer }] = await Promise.all([
          this.getOrMigrateProductCategory(dataHandlers, wsHandlers, {
            newClient,
            legacyClient,
            legacyProductCategoryNo: legacyProduct.p_cat_no,
          }),
          this.getOrMigrateManufacturer(dataHandlers, wsHandlers, {
            newClient,
            legacyClient,
            legacyManufacturerNo: legacyProduct.p_mfg_no,
          }),
        ]);

        if (!productCategory || !manufacturer) {
          return { product: null };
        }

        // Try to match by name for products with the same manufacturer and category.
        const productCandidateByName = await prismaTx.product.findFirst({
          where: {
            name: {
              equals: legacyProduct.p_name?.trim() ?? '',
              mode: 'insensitive',
            },
            manufacturerId: manufacturer.id,
            productCategoryId: productCategory.id,
          },
        });

        if (productCandidateByName) {
          // If it exists, update the product with the legacy ID.
          product = await prismaTx.product.update({
            where: {
              id: productCandidateByName.id,
            },
            data: {
              legacyProductId: legacyProduct.p_id,
              manufacturerId: manufacturer.id,
              productCategoryId: productCategory.id,
            },
            include: {
              productCategory: true,
              manufacturer: true,
            },
          });
        } else {
          // Otherwise, create a new product.
          product = await prismaTx.product.create({
            data: {
              legacyProductId: legacyProduct.p_id,
              createdOn: legacyProduct.p_date_insert ?? undefined,
              // Automatically marked auto-migrated products as inactive.
              active: false,
              manufacturerId: manufacturer.id,
              productCategoryId: productCategory.id,
              type: 'PRIMARY',
              name: legacyProduct.p_name ?? '#' + legacyProductNo,
              description: legacyProduct.p_desc ?? '',
              sku: legacyProduct.p_sku ?? '',
              productUrl: legacyProduct.p_sales_url,
              imageUrl: legacyProduct.p_image_url,
            },
            select: PRODUCT_BASIC_SELECT,
          });
        }
      }
    }

    return { product };
  };

  private getOrMigrateProductCategory: MigrationFn<
    {
      legacyProductCategoryNo: number;
      newClient: TClientBasic;
      legacyClient: LegacyModels.Client;
      defaultActive?: boolean;
    },
    { productCategory: TProductCategoryBasic | null }
  > = async (dataHandlers, wsHandlers, context) => {
    const { legacyDb, prismaTx } = dataHandlers;
    const { legacyProductCategoryNo, newClient, legacyClient } = context;

    const productCategoryRows = await legacyDb.query(
      'SELECT * FROM category WHERE cat_no = ?',
      [legacyProductCategoryNo],
    );
    const legacyProductCategory = productCategoryRows[0] as
      | LegacyModels.Category
      | undefined;

    if (!legacyProductCategory || !legacyProductCategory.cat_id) {
      return { productCategory: null };
    }

    let productCategory = await prismaTx.productCategory
      .findMany({
        where: {
          OR: [
            {
              legacyCategoryId: legacyProductCategory.cat_id,
            },
            {
              shortName: {
                equals: legacyProductCategory.cat_nic?.trim() ?? '',
                mode: 'insensitive',
              },
            },
          ],
        },
        select: PRODUCT_CATEGORY_BASIC_SELECT,
      })
      .then((candidates) => {
        const first = candidates.at(0);
        for (const candidate of candidates) {
          if (candidate.legacyCategoryId === legacyProductCategory.cat_id) {
            return candidate;
          }
        }

        return first;
      });

    if (!productCategory) {
      let client: Prisma.ProductCategoryCreateInput['client'] = undefined;
      if (
        legacyProductCategory.cat_c_no &&
        legacyProductCategory.cat_c_no > 1 &&
        legacyProductCategory.cat_c_no === legacyClient.c_no
      ) {
        client = {
          connect: {
            id: newClient.id,
          },
        };
      }

      productCategory = await prismaTx.productCategory.create({
        data: {
          legacyCategoryId: legacyProductCategory.cat_id,
          name: legacyProductCategory.cat_name ?? 'Unknown',
          createdOn: legacyProductCategory.cat_date_insert ?? undefined,
          // Automatically mark auto-migrated product categories as active
          // when they belong to a client, otherwise inactive.
          active: !!client,
          description: legacyProductCategory.cat_desc ?? '',
          shortName: legacyProductCategory.cat_nic ?? '',
          icon: this.cleanIcon(legacyProductCategory.cat_icon),
          color: this.cleanColor(legacyProductCategory.cat_color),
          client,
        },
        select: PRODUCT_CATEGORY_BASIC_SELECT,
      });
    } else if (productCategory.legacyCategoryId === null) {
      productCategory = await prismaTx.productCategory.update({
        where: {
          id: productCategory.id,
        },
        data: {
          legacyCategoryId: legacyProductCategory.cat_id,
        },
        select: PRODUCT_CATEGORY_BASIC_SELECT,
      });
    }

    return { productCategory };
  };

  private getOrMigrateManufacturer: MigrationFn<
    {
      legacyManufacturerNo: number;
      newClient: TClientBasic;
      legacyClient: LegacyModels.Client;
    },
    { manufacturer: TManufacturerBasic | null }
  > = async (dataHandlers, wsHandlers, context) => {
    const { legacyDb, prismaTx } = dataHandlers;
    const { legacyManufacturerNo, newClient, legacyClient } = context;

    const manufacturerRows = await legacyDb.query(
      'SELECT * FROM manufacturers WHERE mfg_no = ?',
      [legacyManufacturerNo],
    );
    const legacyManufacturer = manufacturerRows[0] as
      | LegacyModels.Manufacturer
      | undefined;

    if (!legacyManufacturer || !legacyManufacturer.mfg_id) {
      return { manufacturer: null };
    }

    let manufacturer = await prismaTx.manufacturer
      .findMany({
        where: {
          OR: [
            {
              legacyManufacturerId: legacyManufacturer.mfg_id,
            },
            {
              name: {
                equals: legacyManufacturer.mfg_name ?? '',
                mode: 'insensitive',
              },
            },
          ],
        },
        select: MANUFACTURER_BASIC_SELECT,
      })
      .then((candidates) => {
        const first = candidates.at(0);
        for (const candidate of candidates) {
          if (candidate.legacyManufacturerId === legacyManufacturer.mfg_id) {
            return candidate;
          }
        }

        return first;
      });

    if (!manufacturer) {
      let client: Prisma.ManufacturerCreateInput['client'] = undefined;
      if (
        legacyManufacturer.mfg_c_no &&
        legacyManufacturer.mfg_c_no > 1 &&
        legacyManufacturer.mfg_c_no === legacyClient.c_no
      ) {
        client = {
          connect: {
            id: newClient.id,
          },
        };
      }

      manufacturer = await prismaTx.manufacturer.create({
        data: {
          legacyManufacturerId: legacyManufacturer.mfg_id,
          createdOn: legacyManufacturer.mfg_date_insert ?? undefined,
          // Automatically marked auto-migrated manufacturers as inactive.
          active: false,
          name: legacyManufacturer.mfg_name ?? 'Unknown',
          homeUrl: legacyManufacturer.mfg_www,
          client,
        },
        select: MANUFACTURER_BASIC_SELECT,
      });
    } else if (manufacturer.legacyManufacturerId === null) {
      manufacturer = await prismaTx.manufacturer.update({
        where: {
          id: manufacturer.id,
        },
        data: {
          legacyManufacturerId: legacyManufacturer.mfg_id,
        },
        select: MANUFACTURER_BASIC_SELECT,
      });
    }

    return { manufacturer };
  };

  private getOrMigrateTag: MigrationFn<
    {
      legacyTagNo: number;
      newSite: TSiteBasic;
    },
    { tag: TTagBasic | null }
  > = async (dataHandlers, wsHandlers, context) => {
    const { legacyDb, prismaTx } = dataHandlers;
    const { legacyTagNo, newSite } = context;

    const tagRows = await legacyDb.query('SELECT * FROM tags WHERE t_no = ?', [
      legacyTagNo,
    ]);
    const legacyTag = tagRows[0] as LegacyModels.Tag | undefined;

    if (!legacyTag || legacyTag.t_serial === null || !legacyTag.t_id) {
      return { tag: null };
    }

    const serialNumber = legacyTag.t_serial.toString().padStart(7, '0');

    let tag = await prismaTx.tag.findFirst({
      where: {
        OR: [
          {
            legacyTagId: legacyTag.t_id,
          },
          {
            serialNumber,
            siteId: newSite.id,
            clientId: newSite.clientId,
          },
        ],
      },
      select: TAG_BASIC_SELECT,
    });

    if (!tag) {
      tag = await prismaTx.tag.create({
        data: {
          legacyTagId: legacyTag.t_id,
          serialNumber,
          clientId: newSite.clientId,
          siteId: newSite.id,
        },
        select: TAG_BASIC_SELECT,
      });
    }

    return { tag };
  };

  private cleanIcon(icon: string | null) {
    if (!icon) {
      return;
    }

    return icon
      .split(' ')
      .filter((p) => p.match(/^fa-/) && !['fa-solid'].includes(p))
      .at(0)
      ?.replace(/^fa-/, '');
  }

  private cleanColor(color: string | null) {
    if (!color) {
      return;
    }

    if (color.trim().match(/^#?[A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}$/)) {
      return '#' + color.trim().replace('#', '');
    }

    return color;
  }
}

const CLIENT_BASIC_SELECT = {
  id: true,
  legacyClientId: true,
  phoneNumber: true,
} satisfies Prisma.ClientSelect;
type TClientBasic = Prisma.ClientGetPayload<{
  select: typeof CLIENT_BASIC_SELECT;
}>;

const SITE_BASIC_SELECT = {
  id: true,
  clientId: true,
  legacySiteId: true,
  legacyGroupId: true,
} satisfies Prisma.SiteSelect;
type TSiteBasic = Prisma.SiteGetPayload<{
  select: typeof SITE_BASIC_SELECT;
}>;

const TAG_BASIC_SELECT = {
  id: true,
  legacyTagId: true,
  serialNumber: true,
} satisfies Prisma.TagSelect;
type TTagBasic = Prisma.TagGetPayload<{
  select: typeof TAG_BASIC_SELECT;
}>;

const ASSET_BASIC_SELECT = {
  id: true,
  legacyAssetId: true,
} satisfies Prisma.AssetSelect;
type TAssetBasic = Prisma.AssetGetPayload<{
  select: typeof ASSET_BASIC_SELECT;
}>;

const PRODUCT_BASIC_SELECT = {
  id: true,
  legacyProductId: true,
  productCategory: {
    select: {
      id: true,
      legacyCategoryId: true,
      name: true,
      shortName: true,
    },
  },
  manufacturer: {
    select: {
      id: true,
      legacyManufacturerId: true,
    },
  },
} satisfies Prisma.ProductSelect;
type TProductBasic = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_BASIC_SELECT;
}>;

const PRODUCT_CATEGORY_BASIC_SELECT = {
  id: true,
  legacyCategoryId: true,
  name: true,
} satisfies Prisma.ProductCategorySelect;
type TProductCategoryBasic = Prisma.ProductCategoryGetPayload<{
  select: typeof PRODUCT_CATEGORY_BASIC_SELECT;
}>;

const MANUFACTURER_BASIC_SELECT = {
  id: true,
  legacyManufacturerId: true,
} satisfies Prisma.ManufacturerSelect;
type TManufacturerBasic = Prisma.ManufacturerGetPayload<{
  select: typeof MANUFACTURER_BASIC_SELECT;
}>;
