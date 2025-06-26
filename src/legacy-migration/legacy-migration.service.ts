import { Injectable, OnModuleInit } from '@nestjs/common';
import mysql from 'mysql2/promise';
import { AuthService } from 'src/auth/auth.service';
import { ApiConfigService } from 'src/config/api-config.service';
import { Prisma } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
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

const EXPIRES_IN_SECONDS = 60 * 60 * 4; // 4 hours

type WsHandlerOptions = {
  prompt: WsPrompt;
  emitEvent: (event: string, data: any) => void;
};

class ConnectionNotInitializedError extends Error {
  constructor() {
    super('Connection not initialized');
  }
}

@Injectable()
export class LegacyMigrationService implements OnModuleInit {
  private _connection: mysql.Connection | null = null;
  private get connection() {
    if (!this._connection) {
      throw new ConnectionNotInitializedError();
    }
    return this._connection;
  }

  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
    private readonly config: ApiConfigService,
  ) {}

  async onModuleInit() {
    // TODO: Get the connection from the config.
    this._connection = await mysql
      .createConnection({
        host: this.config.get('LEGACY_DB_HOST'),
        user: this.config.get('LEGACY_DB_USER'),
        password: this.config.get('LEGACY_DB_PASSWORD'),
        database: this.config.get('LEGACY_DB_NAME'),
      })
      .catch((e) => {
        console.error(
          'Error connecting to MySQL. Attempting to process legacy migrations will fail.',
          e,
        );
        return null;
      });
  }

  async getWsToken() {
    return await this.authService.generateCustomToken({}, EXPIRES_IN_SECONDS);
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

  async processMigration(handlerOptions: WsHandlerOptions) {
    const { emitEvent } = handlerOptions;
    emitEvent('alert', {
      type: 'info',
      message:
        'Hello! I am here to help you migrate clients over from the old system to this one.',
    });
    emitEvent('alert', {
      type: 'warning',
      message:
        'Just a heads up: this is a work in progress. It is not yet ready for production use.',
    });

    try {
      const legacyClient = await this.selectClient(handlerOptions);
      await this.migrateClient(legacyClient, handlerOptions);
    } catch (e) {
      if (e instanceof ConnectionNotInitializedError) {
        emitEvent('alert', {
          type: 'error',
          message:
            'The connection to the legacy database could not be established. Please try again later.',
        });
        throw new WsCloseInternalException('Connection not initialized.');
      } else {
        throw e;
      }
    }

    emitEvent('alert', {
      type: 'success',
      message: 'Migration completed.',
      signal: 'close',
    });
  }

  private async selectClient({ prompt }: WsHandlerOptions) {
    const [rows] = await this.connection.execute('SELECT * FROM clients');
    const clients = rows as LegacyModels.Client[];
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

  private async migrateClient(
    legacyClient: LegacyModels.Client,
    handlerOptions: WsHandlerOptions,
  ) {
    const { emitEvent, prompt } = handlerOptions;

    emitEvent('alert', {
      type: 'info',
      message: `Great! Let me check if this client is already in the new system.`,
    });

    let newClient = await this.prisma.bypassRLS().client.findFirst({
      where: {
        legacyClientId: legacyClient.c_id,
      },
    });

    if (!newClient) {
      emitEvent('alert', {
        type: 'info',
        message: `Looks like it isn't there yet. I'll go ahead and start migrating it over.`,
      });

      const [rows] = await this.connection.execute(
        'SELECT * FROM locations WHERE loc_c_no = ? ORDER BY loc_date_insert DESC',
        [legacyClient.c_no],
      );
      const locations = rows as LegacyModels.Location[];
      const primaryLocation =
        locations.find((location) => location.loc_type === 1) ??
        locations.at(0);

      let address: Prisma.ClientCreateInput['address']['create'] | null =
        primaryLocation && primaryLocation.loc_addr1 && primaryLocation.loc_city
          ? {
              street1: primaryLocation.loc_addr1,
              street2: primaryLocation.loc_addr2,
              city: primaryLocation.loc_city,
              state: primaryLocation.loc_state,
              zip: primaryLocation.loc_zip,
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

      newClient = await this.prisma.bypassRLS().client.create({
        data: {
          createdOn: legacyClient.c_date_insert ?? undefined,
          startedOn: legacyClient.c_date_insert ?? new Date(),
          status: legacyClient.c_status === 1 ? 'ACTIVE' : 'INACTIVE',
          legacyClientId: legacyClient.c_id,
          name: legacyClient.c_name,
          address: {
            create: address,
          },
          phoneNumber,
          homeUrl: legacyClient.c_www,
          defaultInspectionCycle: 30,
        },
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

    await this.migrateSites({ legacyClient, newClient }, handlerOptions);
  }

  private async migrateSites(
    context: {
      legacyClient: LegacyModels.Client;
      newClient: Prisma.ClientGetPayload<{}>;
    },
    handlerOptions: WsHandlerOptions,
  ) {
    const { emitEvent, prompt } = handlerOptions;
    const { legacyClient, newClient } = context;

    emitEvent('alert', {
      type: 'info',
      message: `Now let's work on migrating the client's sites (also known as locations).`,
    });

    const clientAddress = await this.prisma.bypassRLS().address.findFirst({
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

    const [locationRows] = await this.connection.execute(
      'SELECT * FROM locations WHERE loc_c_no = ? ORDER BY loc_date_insert DESC',
      [legacyClient.c_no],
    );
    const legacySites = locationRows as LegacyModels.Location[];

    const alreadyMigratedSites = await this.prisma.bypassRLS().site.findMany({
      select: {
        id: true,
        legacySiteId: true,
        legacyGroupId: true,
        clientId: true,
      },
      where: {
        client: {
          legacyClientId: legacyClient.c_id,
        },
      },
    });

    const [groupRows] = await this.connection.execute(
      'SELECT * FROM groups WHERE group_c_no = ?',
      [legacyClient.c_no],
    );
    const legacySiteGroups = groupRows as LegacyModels.Group[];

    const alreadyMigratedLegacySiteGroupIdsMap = new Map(
      alreadyMigratedSites
        .filter((site) => site.legacyGroupId)
        .map((site) => [site.legacyGroupId, site.id]),
    );

    const legacyToNewSiteGroupIdMap = new Map<number, string>();

    for (const legacySiteGroup of legacySiteGroups) {
      if (alreadyMigratedLegacySiteGroupIdsMap.has(legacySiteGroup.group_id)) {
        legacyToNewSiteGroupIdMap.set(
          legacySiteGroup.group_no,
          alreadyMigratedLegacySiteGroupIdsMap.get(legacySiteGroup.group_id)!,
        );
        continue;
      }

      const siteGroupName = legacySiteGroup.group_name ?? 'Unknown';
      const groupDisplay = `${siteGroupName}${legacySiteGroup.group_desc ? ` (${legacySiteGroup.group_desc})` : ''}`;

      const address = await this.promptForAddress(
        {
          message: `What's the address for the site group ${groupDisplay}?`,
          value: memory.lastAddress,
        },
        handlerOptions,
      );
      memory.lastAddress = address;

      const phoneNumber = await this.promptForPhoneNumber(
        {
          message: `What's the phone number for the site group ${groupDisplay}?`,
          value: memory.lastPhoneNumber,
        },
        handlerOptions,
      );
      memory.lastPhoneNumber = phoneNumber;

      const newSiteGroup = await this.prisma.bypassRLS().site.create({
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

      legacyToNewSiteGroupIdMap.set(legacySiteGroup.group_no, newSiteGroup.id);
    }

    for (const legacySite of legacySites) {
      let newSite = alreadyMigratedSites.find(
        (s) => s.legacySiteId === legacySite.loc_id,
      );

      if (!newSite) {
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
          const [assetRows] = await this.connection.execute(
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
            handlerOptions,
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
            handlerOptions,
          );
        }
        memory.lastPhoneNumber = phoneNumber;

        newSite = await this.prisma.bypassRLS().site.create({
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
              legacyToNewSiteGroupIdMap.has(legacySite.loc_group_no)
                ? {
                    connect: {
                      id: legacyToNewSiteGroupIdMap.get(
                        legacySite.loc_group_no,
                      )!,
                    },
                  }
                : undefined,
          },
        });
      }

      await this.migrateAssets({ legacySite, newSite }, handlerOptions);
    }
  }

  private async migrateAssets(
    context: {
      legacySite: LegacyModels.Location;
      newSite: Prisma.SiteGetPayload<{ select: { id: true; clientId: true } }>;
    },
    handlerOptions: WsHandlerOptions,
  ) {
    const { emitEvent, prompt } = handlerOptions;
    const { legacySite, newSite } = context;

    const [assetRows] = await this.connection.execute(
      'SELECT * FROM assets WHERE a_loc_no = ?',
      [legacySite.loc_no],
    );
    const legacyAssets = assetRows as LegacyModels.Asset[];

    for (const legacyAsset of legacyAssets) {
      if (legacyAsset.a_p_no === null || !legacyAsset.a_id) {
        continue;
      }

      const [product, tag] = await Promise.all([
        this.getOrMigrateProduct(legacyAsset.a_p_no, {
          newClientId: newSite.clientId,
          legacyClientNo: legacySite.loc_c_no ?? -1,
        }),
        legacyAsset.a_t_no === null
          ? Promise.resolve(null)
          : this.getOrMigrateTag(legacyAsset.a_t_no, {
              legacySite,
              newSite,
            }),
      ]);

      if (!product) {
        continue;
      }

      const assetName = [
        legacyAsset.a_location,
        product.productCategory.shortName ?? product.productCategory.name,
        '#' + legacyAsset.a_no,
      ]
        .filter(Boolean)
        .join(' ');

      await this.prisma.bypassRLS().asset.create({
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
      });
    }
  }

  private async promptForAddress(
    context: {
      message: string;
      value:
        | Prisma.ClientCreateInput['address']['create']
        | Prisma.SiteCreateInput['address']['create']
        | null;
    },
    handlerOptions: WsHandlerOptions,
  ) {
    const { message, value } = context;
    const { prompt } = handlerOptions;

    const { value: address } = await prompt(
      { message, type: 'address', value },
      { schema: addressValueSchema },
    );

    return address;
  }

  private async promptForPhoneNumber(
    context: { message: string; value: string | null },
    handlerOptions: WsHandlerOptions,
  ) {
    const { message, value } = context;
    const { prompt } = handlerOptions;

    const { value: phoneNumber } = await prompt(
      { message, type: 'phone', value },
      { schema: stringValueSchema },
    );

    return phoneNumber;
  }

  private async getOrMigrateProduct(
    legacyProductNo: number,
    context: {
      newClientId: string;
      legacyClientNo: number;
    },
  ) {
    const { newClientId, legacyClientNo } = context;

    const [productRows] = await this.connection.execute(
      'SELECT * FROM products WHERE p_no = ?',
      [legacyProductNo],
    );
    const legacyProduct = productRows[0] as LegacyModels.Product | undefined;

    if (!legacyProduct || !legacyProduct.p_id) {
      return null;
    }

    if (legacyProduct.p_type === 2) {
      // Not dealing with consumables for now.
      return null;
    }

    let product = await this.prisma.bypassRLS().product.findFirst({
      where: {
        legacyProductId: legacyProduct.p_id,
      },
      include: {
        productCategory: true,
        manufacturer: true,
      },
    });

    if (!product) {
      if (!legacyProduct.p_cat_no || !legacyProduct.p_mfg_no) {
        return null;
      }

      const [productCategory, manufacturer] = await Promise.all([
        this.getOrMigrateProductCategory(legacyProduct.p_cat_no, {
          newClientId,
          legacyClientNo,
        }),
        this.getOrMigrateManufacturer(legacyProduct.p_mfg_no, {
          newClientId,
          legacyClientNo,
        }),
      ]);

      if (!productCategory || !manufacturer) {
        return null;
      }

      // Try to match by name for products with the same manufacturer and category.
      const productCandidateByName = await this.prisma
        .bypassRLS()
        .product.findFirst({
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
        product = await this.prisma.bypassRLS().product.update({
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
        product = await this.prisma.bypassRLS().product.create({
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
          include: {
            productCategory: true,
            manufacturer: true,
          },
        });
      }
    }

    return product;
  }

  private async getOrMigrateProductCategory(
    legacyProductCategoryNo: number,
    context: {
      newClientId: string;
      legacyClientNo: number;
    },
  ) {
    const { newClientId, legacyClientNo } = context;

    const [productCategoryRows] = await this.connection.execute(
      'SELECT * FROM category WHERE cat_no = ?',
      [legacyProductCategoryNo],
    );
    const legacyProductCategory = productCategoryRows[0] as
      | LegacyModels.Category
      | undefined;

    if (!legacyProductCategory || !legacyProductCategory.cat_id) {
      return null;
    }

    let productCategory = await this.prisma
      .bypassRLS()
      .productCategory.findMany({
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
        legacyProductCategory.cat_c_no === legacyClientNo
      ) {
        client = {
          connect: {
            id: newClientId,
          },
        };
      }

      productCategory = await this.prisma.bypassRLS().productCategory.create({
        data: {
          legacyCategoryId: legacyProductCategory.cat_id,
          name: legacyProductCategory.cat_name ?? 'Unknown',
          createdOn: legacyProductCategory.cat_date_insert ?? undefined,
          // Automatically marked auto-migrated product categories as inactive.
          active: false,
          description: legacyProductCategory.cat_desc ?? '',
          shortName: legacyProductCategory.cat_nic ?? '',
          icon: this.cleanIcon(legacyProductCategory.cat_icon),
          color: this.cleanColor(legacyProductCategory.cat_color),
          client,
        },
      });
    } else if (productCategory.legacyCategoryId === null) {
      productCategory = await this.prisma.bypassRLS().productCategory.update({
        where: {
          id: productCategory.id,
        },
        data: {
          legacyCategoryId: legacyProductCategory.cat_id,
        },
      });
    }

    return productCategory;
  }

  private async getOrMigrateManufacturer(
    legacyManufacturerNo: number,
    context: {
      newClientId: string;
      legacyClientNo: number;
    },
  ) {
    const { newClientId, legacyClientNo } = context;

    const [manufacturerRows] = await this.connection.execute(
      'SELECT * FROM manufacturers WHERE mfg_no = ?',
      [legacyManufacturerNo],
    );
    const legacyManufacturer = manufacturerRows[0] as
      | LegacyModels.Manufacturer
      | undefined;

    if (!legacyManufacturer || !legacyManufacturer.mfg_id) {
      return null;
    }

    let manufacturer = await this.prisma
      .bypassRLS()
      .manufacturer.findMany({
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
        legacyManufacturer.mfg_c_no === legacyClientNo
      ) {
        client = {
          connect: {
            id: newClientId,
          },
        };
      }

      manufacturer = await this.prisma.bypassRLS().manufacturer.create({
        data: {
          legacyManufacturerId: legacyManufacturer.mfg_id,
          createdOn: legacyManufacturer.mfg_date_insert ?? undefined,
          // Automatically marked auto-migrated manufacturers as inactive.
          active: false,
          name: legacyManufacturer.mfg_name ?? 'Unknown',
          homeUrl: legacyManufacturer.mfg_www,
          client,
        },
      });
    } else if (manufacturer.legacyManufacturerId === null) {
      manufacturer = await this.prisma.bypassRLS().manufacturer.update({
        where: {
          id: manufacturer.id,
        },
        data: {
          legacyManufacturerId: legacyManufacturer.mfg_id,
        },
      });
    }

    return manufacturer;
  }

  private async getOrMigrateTag(
    legacyTagNo: number,
    context: {
      legacySite: LegacyModels.Location;
      newSite: Prisma.SiteGetPayload<{ select: { id: true; clientId: true } }>;
    },
  ) {
    const { newSite } = context;

    const [tagRows] = await this.connection.execute(
      'SELECT * FROM tags WHERE t_no = ?',
      [legacyTagNo],
    );
    const legacyTag = tagRows[0] as LegacyModels.Tag | undefined;

    if (!legacyTag || legacyTag.t_serial === null || !legacyTag.t_id) {
      return null;
    }

    const serialNumber = legacyTag.t_serial.toString().padStart(7, '0');

    let tag = await this.prisma.bypassRLS().tag.findFirst({
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
    });

    if (!tag) {
      tag = await this.prisma.bypassRLS().tag.create({
        data: {
          legacyTagId: legacyTag.t_id,
          serialNumber,
          clientId: newSite.clientId,
          siteId: newSite.id,
        },
      });
    }

    return tag;
  }

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
