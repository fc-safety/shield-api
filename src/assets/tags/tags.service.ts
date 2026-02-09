import * as csv from '@fast-csv/format';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import { add, isAfter } from 'date-fns';
import { ApiClsService } from 'src/auth/api-cls.service';
import { AuthService, SigningKeyExpiredError } from 'src/auth/auth.service';
import { isScopeAtLeast } from 'src/auth/utils/scope';
import { as404OrThrow } from 'src/common/utils';
import { buildPrismaFindArgs } from 'src/common/validation';
import { ApiConfigService } from 'src/config/api-config.service';
import { Prisma, RoleScope } from 'src/generated/prisma/client';
import { IPrismaRLSContext, PrismaService } from 'src/prisma/prisma.service';
import { Readable } from 'stream';
import { BulkGenerateSignedTagUrlDto } from './dto/bulk-generate-signed-tag-url.dto';
import { CreateTagDto } from './dto/create-tag.dto';
import { GenerateSignedTagUrlDto } from './dto/generate-signed-tag-url.dto';
import { QueryTagDto } from './dto/query-tag.dto';
import { RegisterTagDto } from './dto/register-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import {
  ValidateSignedUrlDto,
  ValidateSignedUrlSchema,
} from './dto/validate-signed-url.dto';

@Injectable()
export class TagsService {
  private readonly SIG_LENGTH = 16;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ApiConfigService,
    private readonly cls: ApiClsService,
    private readonly authService: AuthService,
  ) {}

  async create(createTagDto: CreateTagDto) {
    return this.prisma
      .build()
      .then((prisma) => prisma.tag.create({ data: createTagDto }));
  }

  async findAll(queryTagDto: QueryTagDto | undefined) {
    return this.prisma.build().then(async (prisma) =>
      prisma.tag.findManyForPage(
        buildPrismaFindArgs<typeof prisma.tag>(queryTagDto, {
          include: {
            asset: {
              include: {
                product: true,
              },
            },
            client: true,
            site: true,
          },
        }),
      ),
    );
  }

  async findOne(id: string) {
    return this.prisma
      .build()
      .then((prisma) =>
        prisma.tag.findUniqueOrThrow({
          where: { id },
          include: {
            asset: true,
            client: true,
            site: true,
          },
        }),
      )
      .catch(as404OrThrow);
  }

  async findOneForInspection(externalId: string) {
    // Get current user context for validation and error handling
    const currentUser = (await this.prisma.build()).$rlsContext();

    // Bypass RLS for initial tag lookup - access is validated at app level below
    const tag = await this.prisma
      .bypassRLS()
      .tag.findUniqueOrThrow({
        where: { externalId },
        include: {
          client: true,
          site: true,
          asset: {
            include: {
              product: {
                include: {
                  productCategory: {
                    include: {
                      assetQuestions: {
                        where: {
                          active: true,
                        },
                      },
                    },
                  },
                  manufacturer: true,
                  assetQuestions: {
                    where: {
                      active: true,
                    },
                  },
                },
              },
              consumables: {
                include: {
                  product: true,
                },
                orderBy: {
                  expiresOn: 'desc',
                },
                distinct: ['productId'],
                where: {
                  product: {
                    displayExpirationDate: true,
                  },
                },
              },
              setupQuestionResponses: true,
            },
          },
        },
      })
      .catch(this.findAndThrowReasonForTagError({ externalId }, currentUser))
      .catch(as404OrThrow);

    // Validate user has access to the tag's client (multi-client access)
    if (tag.client) {
      await this.validateUserAccessToTagClient(tag.client.externalId);
    }

    return tag;
  }

  /**
   * Validates that the current user has access to the given client.
   * Checks PersonClientAccess to verify the user has access.
   * Throws ForbiddenException if user lacks access.
   */
  private async validateUserAccessToTagClient(
    clientExternalId: string,
  ): Promise<void> {
    const user = this.cls.get('user');
    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    // Check PersonClientAccess for client access
    const access = await this.prisma.bypassRLS().personClientAccess.findFirst({
      where: {
        person: { idpId: user.idpId },
        client: { externalId: clientExternalId },
      },
    });

    if (!access) {
      throw new ForbiddenException({
        message:
          'You do not have access to this tag. Please contact your administrator if you believe this is an error.',
        error: 'client_access_denied',
        statusCode: 403,
      });
    }
  }

  /**
   * Checks if the user has access to a client (by internal client ID).
   * Returns true if it's the user's primary client or if they have PersonClientAccess.
   */
  private async checkUserHasClientAccess(
    userPrimaryClientId: string,
    tagClientId: string,
  ): Promise<boolean> {
    // Check if it's the user's primary client
    if (userPrimaryClientId === tagClientId) {
      return true;
    }

    // Check PersonClientAccess for secondary client access
    const user = this.cls.get('user');
    if (!user) {
      return false;
    }

    const access = await this.prisma.bypassRLS().personClientAccess.findFirst({
      where: {
        person: { idpId: user.idpId },
        clientId: tagClientId,
      },
    });

    return !!access;
  }

  async findOneForAssetSetup(externalId: string) {
    return this.prisma.build().then((prisma) =>
      prisma.tag
        .findFirstOrThrow({
          where: { externalId },
          include: {
            asset: {
              include: {
                product: {
                  include: {
                    productCategory: {
                      include: {
                        assetQuestions: {
                          where: {
                            active: true,
                          },
                        },
                      },
                    },
                    manufacturer: true,
                    assetQuestions: {
                      where: {
                        active: true,
                      },
                    },
                  },
                },
              },
            },
          },
        })
        .catch(
          this.findAndThrowReasonForTagError(
            { externalId },
            prisma.$rlsContext(),
          ),
        )
        .catch(as404OrThrow),
    );
  }

  async checkRegistration(inspectionToken: string) {
    const { tagExternalId } =
      await this.validateInspectionToken(inspectionToken);
    const tag = await this.prisma.bypassRLS().tag.findUnique({
      where: {
        externalId: tagExternalId,
      },
      include: {
        asset: true,
      },
    });

    // Tag is considered unregistered if not in database or has no client.
    // If unregistered, the tag is available for registration.
    if (!tag || tag.clientId === null) {
      return tag;
    }

    // If the tag is registered to a client, the user must have access to that client
    // (either primary or via PersonClientAccess)
    const rlsContext = (await this.prisma.build()).$rlsContext();
    if (!rlsContext) {
      throw new BadRequestException('Unable to determine user context.');
    }

    // Check if user has access to the tag's client
    const hasClientAccess = await this.checkUserHasClientAccess(
      rlsContext.clientId,
      tag.clientId,
    );
    if (!hasClientAccess) {
      throw new BadRequestException(
        'You do not have access to the client this tag is registered with.',
      );
    }

    if (tag.siteId === null) {
      return tag;
    }

    // If the tag is registered to a site, the user must belong to that
    // site.
    if (
      !isScopeAtLeast(rlsContext.scope, RoleScope.SITE_GROUP) &&
      !rlsContext.allowedSiteIds.includes(tag.siteId) &&
      tag.siteId !== rlsContext.siteId
    ) {
      throw new BadRequestException('Tag is not registered to your site.');
    }

    return tag;
  }

  async registerTag(
    inspectionToken: string,
    { client: newClient, ...dto }: RegisterTagDto,
  ) {
    // Determine if the user can and intends to act as a global admin.
    const accessGrant = this.cls.requireAccessGrant();
    const actingAsSystemAdmin =
      accessGrant.isSystemAdmin() && this.cls.viewContext === 'admin';

    // Get tag data from inspection token.
    const { tagExternalId, serialNumber } =
      this.parseInspectionToken(inspectionToken);

    // If acting as a global admin, simply upsert registration data.
    if (actingAsSystemAdmin && newClient !== undefined) {
      return this.prisma.bypassRLS().tag.upsert({
        where: { externalId: tagExternalId },
        update: {
          ...dto,
          client: newClient,
        },
        // NOTE: This would throw an error if no site is provided. There isn't
        // a great way to handle this gracefully.
        create: {
          ...dto,
          externalId: tagExternalId,
          serialNumber,
          client: newClient,
        },
      });
    }

    // Because of RLS policies, the user scoped prisma client won't have access
    // to this tag to update it if it already exists but has no client or site.
    // So, we need to bypass RLS to check if the tag exists.
    const existingTag = await this.prisma.bypassRLS().tag.findUnique({
      where: { externalId: tagExternalId },
    });

    return this.prisma.build().then(async (prisma) => {
      const person = prisma.$rlsContext();

      if (!person) {
        throw new ForbiddenException(
          'Unable to find a valid user account for your user. Please contact your administrator to ensure your account is properly configured.',
        );
      }

      if (existingTag) {
        // If the tag exists but has no client or site assigned, RLS will
        // prevent the user from updating it. We'll bypass RLS to update it
        // and **then** allow the user's updates to take effect.
        if (existingTag.clientId === null || existingTag.siteId === null) {
          await this.prisma.bypassRLS().tag.update({
            where: { id: existingTag.id },
            data: {
              clientId: person.clientId,
              siteId: person.siteId,
            },
          });
        }

        // If the tag exists, the user can only update it if it's
        // within their scope.
        return prisma.tag.update({
          where: { id: existingTag.id },
          data: dto,
        });
      }

      // Otherwise, the user should be able to create a new tag, but will
      // fail if the user tries to set a client or site other than what
      // they have access to.
      const { site: newSite, ...createDto } = dto;
      return prisma.tag.create({
        data: {
          externalId: tagExternalId,
          serialNumber,
          ...createDto,
          clientId: person.clientId,
          siteId: newSite?.connect.id ?? person.siteId,
        },
      });
    });
  }

  async update(id: string, updateTagDto: UpdateTagDto) {
    return this.prisma.build().then((prisma) =>
      prisma.tag
        .update({
          where: { id },
          data: updateTagDto,
        })
        .catch(as404OrThrow),
    );
  }

  async remove(id: string) {
    return this.prisma
      .build()
      .then((prisma) => prisma.tag.delete({ where: { id } }));
  }

  async generateSignedUrlSingle(
    generateSignedTagUrlDto: GenerateSignedTagUrlDto,
  ) {
    const keyId =
      generateSignedTagUrlDto.keyId ??
      this.config.get('DEFAULT_SIGNING_KEY_ID');
    return this.generateSignedUrl({
      keyId,
      serialNumber: generateSignedTagUrlDto.serialNumber,
      externalId: generateSignedTagUrlDto.externalId,
    });
  }

  generateSignedUrlBulkCsv(dto: BulkGenerateSignedTagUrlDto) {
    const csvStream = csv.format({ headers: true });
    (async () => {
      for await (const result of this.generateSignedUrlBulk(dto)) {
        csvStream.write(result);
      }
      csvStream.end();
    })();

    return csvStream;
  }

  async generateSignedUrlBulkJson(dto: BulkGenerateSignedTagUrlDto) {
    const dataGenerator = this.generateSignedUrlBulk(dto);
    return new Readable({
      async read() {
        for await (const result of dataGenerator) {
          this.push(JSON.stringify(result) + '\n');
        }
        this.push(null);
      },
    });
  }

  async *generateSignedUrlBulk({
    method,
    serialNumbers,
    serialNumberRangeStart,
    serialNumberRangeEnd,
    keyId: inputKeyId,
  }: BulkGenerateSignedTagUrlDto) {
    const keyId = inputKeyId ?? this.config.get('DEFAULT_SIGNING_KEY_ID');

    const serialNumberCount = Math.max(
      method === 'sequential'
        ? parseInt(serialNumberRangeEnd ?? '0') -
            parseInt(serialNumberRangeStart ?? '0') +
            1
        : (serialNumbers?.length ?? 0),
      0,
    );

    const padSize =
      serialNumberRangeStart && serialNumberRangeStart.startsWith('0')
        ? serialNumberRangeStart.length
        : null;
    const getSerialNumber = (idx: number) => {
      if (method === 'sequential') {
        const incrementedNumber = parseInt(serialNumberRangeStart ?? '0') + idx;
        if (padSize) {
          return String(incrementedNumber).padStart(padSize, '0');
        }

        return String(incrementedNumber);
      }

      return serialNumbers?.at(idx) ?? null;
    };

    const generateUrl = async (serialNumber: string) => {
      return this.generateSignedUrl({
        keyId,
        serialNumber,
      });
    };

    for (let i = 0; i < serialNumberCount; i++) {
      const serialNumber = getSerialNumber(i);
      if (!serialNumber) {
        continue;
      }

      yield await generateUrl(serialNumber);
    }
  }

  private async generateSignedUrl(options: {
    keyId: string;
    serialNumber: string;
    externalId?: string;
  }) {
    const id = options.externalId ?? createId();
    const timestamp = new Date().getTime();
    const serialNumber = options.serialNumber;

    // Create signature
    const signature = await this.generateTagUrlSignature({
      serialNumber,
      id,
      timestamp,
      keyId: options.keyId,
    });

    const urlParams = {
      sn: serialNumber,
      id,
      t: timestamp,
      sig: signature,
      kid: options.keyId,
    } satisfies ValidateSignedUrlDto;

    // Construct URL
    const url = new URL('tag', this.config.get('FRONTEND_URL'));
    Object.entries(urlParams).forEach(([key, value]) => {
      url.searchParams.append(key, value.toString());
    });

    return {
      serialNumber: options.serialNumber,
      tagUrl: url.toString(),
      keyId: options.keyId,
      timestamp: new Date(timestamp).toISOString(),
    };
  }

  async validateTagUrl(tagUrl: string) {
    const url = new URL(tagUrl);
    const urlParams = Object.fromEntries(url.searchParams.entries());
    const validateSignedUrlDto = ValidateSignedUrlSchema.parse(urlParams);
    return this.validateTagSignature(validateSignedUrlDto);
  }

  async validateTagSignature(signedUrlDto: ValidateSignedUrlDto) {
    const { sn, id, t, sig, kid } = signedUrlDto;

    const signature = await this.generateTagUrlSignature({
      serialNumber: sn,
      id,
      timestamp: t,
      keyId: kid,
    });

    let isValid = false;
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(sig))) {
      isValid = true;
    }

    let inspectionToken: string | undefined;
    if (isValid) {
      inspectionToken = await this.generateInspectionToken(sn, id);
    }

    return {
      isValid,
      serialNumber: sn,
      id,
      timestamp: t,
      keyId: kid,
      inspectionToken,
    };
  }

  private async generateTagUrlSignature(options: {
    serialNumber: string;
    id: string;
    timestamp: number;
    keyId: string;
    ignoreExpiredKey?: boolean;
  }) {
    const { serialNumber, id, timestamp, keyId, ignoreExpiredKey } = options;

    return this.generateSignature({
      signatureData: `${serialNumber}.${id}`,
      timestamp,
      keyId,
      ignoreExpiredKey,
    });
  }

  public async generateInspectionToken(
    serialNumber: string,
    externalId: string,
  ) {
    const expiresOn = add(new Date(), { hours: 1 }).getTime();
    const timestamp = Date.now();
    const keyId = this.config.get('DEFAULT_SIGNING_KEY_ID');
    const signature = await this.generateSignature({
      signatureData: `${serialNumber}.${externalId}.${expiresOn}`,
      timestamp,
      keyId,
    });
    const tokenData = `${serialNumber}.${externalId}.${expiresOn}.${timestamp}.${keyId}.${signature}`;
    const token = Buffer.from(tokenData).toString('base64url');
    return token;
  }

  public parseInspectionToken(token: string) {
    const tokenData = Buffer.from(token, 'base64url').toString('utf-8');
    const [
      serialNumber,
      tagExternalId,
      expiresOn,
      timestamp,
      keyId,
      signature,
    ] = tokenData.split('.');
    return {
      serialNumber,
      tagExternalId,
      expiresOn: parseInt(expiresOn),
      timestamp: parseInt(timestamp),
      keyId,
      signature,
    };
  }

  public async validateInspectionToken(token: string) {
    const {
      serialNumber,
      tagExternalId,
      expiresOn,
      timestamp,
      keyId,
      signature,
    } = this.parseInspectionToken(token);

    const expiresOnDate = new Date(expiresOn);
    const isExpired = isAfter(new Date(), expiresOnDate);

    let isValid = false;
    let reason: string | null = null;

    if (isExpired) {
      reason = 'Inspection token has expired';
    } else {
      const validSignature = await this.generateSignature({
        signatureData: `${serialNumber}.${tagExternalId}.${expiresOn}`,
        timestamp,
        keyId,
      });

      if (
        !crypto.timingSafeEqual(
          Buffer.from(validSignature),
          Buffer.from(signature),
        )
      ) {
        reason = 'Invalid inspection token signature';
      } else {
        isValid = true;
      }
    }

    return {
      isValid,
      reason,
      tagExternalId,
      expiresOn: expiresOnDate,
      serialNumber,
    };
  }

  private async generateSignature(options: {
    signatureData: string;
    timestamp: number;
    keyId: string;
    ignoreExpiredKey?: boolean;
  }) {
    try {
      return this.authService.generateSignature({
        signatureData: options.signatureData,
        timestamp: options.timestamp,
        keyId: options.keyId,
        sigLength: this.SIG_LENGTH,
        ignoreExpiredKey: options.ignoreExpiredKey,
      });
    } catch (error) {
      if (error instanceof SigningKeyExpiredError) {
        throw new BadRequestException(error.message);
      }

      throw error;
    }
  }

  private findAndThrowReasonForTagError(
    findInput: Prisma.TagWhereUniqueInput,
    rlsContext: IPrismaRLSContext | undefined | null,
  ) {
    return async (error: unknown) => {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        // For this endpoint in particular, we want to alert users as to why they are
        // unable to access the tag.

        // If this tag exists, get the client and site IDs.
        const { clientId, siteId } = await this.prisma
          .bypassRLS()
          .tag.findUniqueOrThrow({
            where: findInput,
            select: { clientId: true, siteId: true },
          });

        // Try to check against the current user (if present). If the user is present along
        // with the client and site IDs, alert the user as to why they are unable to access the tag.
        if (rlsContext) {
          // Check if user has access via PersonClientAccess (multi-client)
          const hasClientAccess = clientId
            ? await this.checkUserHasClientAccess(rlsContext.clientId, clientId)
            : true;

          if (clientId && !hasClientAccess) {
            throw new BadRequestException(
              'You do not have access to the client this tag is registered with. Please contact your administrator if you think this is a mistake.',
            );
          }
          if (
            siteId &&
            !isScopeAtLeast(rlsContext.scope, RoleScope.SITE_GROUP) &&
            !rlsContext.allowedSiteIds.includes(siteId) &&
            siteId !== rlsContext.siteId
          ) {
            throw new BadRequestException(
              'Tag is not registered to your site. Please contact your administrator if you think this is a mistake.',
            );
          }
        }
      }
      throw error;
    };
  }
}
