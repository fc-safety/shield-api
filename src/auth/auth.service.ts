import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { init as cuid2Init } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import { isBefore } from 'date-fns';
import { IncomingMessage } from 'http';
import { Jwt, TokenExpiredError } from 'jsonwebtoken';
import { expressJwtSecret } from 'jwks-rsa';
import { MemoryCacheService } from 'src/cache/memory-cache.service';
import { firstOf, getAccessIntent } from 'src/common/utils';
import { ApiConfigService } from 'src/config/api-config.service';
import { ClientStatus, Prisma, RoleScope } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TAccessGrantResult } from './auth.types';
import {
  buildUserFromToken,
  StatelessUser,
  StatelessUserData,
} from './user.schema';
import {
  buildAccessGrantResponseCacheKey,
  type IAccessContext,
  type IAccessGrantData,
  reduceAccessGrants,
} from './utils/access-grants';
import { TCapability, VALID_CAPABILITIES } from './utils/capabilities';
import { getScopesAtLeast, isScopeAtLeast, TScope } from './utils/scope';

const createId32 = cuid2Init({ length: 32 });
const createSecret = () => createId32() + createId32();

export class SigningKeyExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SigningKeyExpiredError';
  }
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly DEFAULT_SIG_LENGTH = 16;
  private readonly getSecret: ReturnType<typeof expressJwtSecret>;

  constructor(
    private jwtService: JwtService,
    private config: ApiConfigService,
    private readonly memoryCache: MemoryCacheService,
    private readonly prisma: PrismaService,
  ) {
    this.getSecret = expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: this.config.get('AUTH_JWKS_URI'),
    });
  }

  async validateJwtToken(token: string | undefined | null): Promise<
    | {
        isValid: true;
        user: StatelessUser;
        reason?: never;
      }
    | {
        isValid: false;
        reason: string;
        user?: never;
      }
  > {
    if (!token) {
      return { isValid: false, reason: 'Authentication token is required.' };
    }

    try {
      const jwt: Jwt = this.jwtService.decode(token, {
        complete: true,
      });
      const secret = await new Promise<string>((resolve, reject) => {
        // First arg ("req") does not actually get used and thus does not need
        // to be anything specific.
        return this.getSecret({}, jwt.header, jwt.payload, (e, key) => {
          if (e) {
            reject(e);
          } else if (!key) {
            reject('No key/secret found.');
          } else {
            resolve(key.toString());
          }
        });
      });
      const payload = await this.jwtService.verifyAsync(token, {
        secret: secret,
        issuer: this.config.get('AUTH_ISSUER'),
        audience: this.config.get('AUTH_AUDIENCE'),
      });

      // Get basic user data from token
      const user = buildUserFromToken(payload);

      return { isValid: true, user };
    } catch (e) {
      if (!(e instanceof TokenExpiredError)) {
        this.logger.error('Error validating JWT token', e);

        return {
          isValid: false,
          reason: 'Authentication token validation failed.',
        };
      }

      return { isValid: false, reason: 'Authentication token expired.' };
    }
  }

  public async getAccessGrantForUser(
    user: StatelessUser,
    accessContext: IAccessContext = {},
  ): Promise<TAccessGrantResult> {
    const cacheKey = buildAccessGrantResponseCacheKey(
      user.idpId,
      accessContext,
    );

    return this.memoryCache.getOrSet(
      cacheKey,
      () => this.getAccessGrantForUserFromDatabase(user, accessContext),
      5 * 60 * 1000, // 5 minutes
    );
  }

  private async getAccessGrantForUserFromDatabase(
    user: StatelessUser,
    organizationContext: IAccessContext = {},
  ): Promise<TAccessGrantResult> {
    const accessIntent = organizationContext.accessIntent ?? 'user';
    const prismaBypassRLS = this.prisma.bypassRLS();

    // If a specific client is requested, access intent is `elevated` or `system`, and the user is a
    // system admin, grant the user access to the client and site via an ephemeral grant.
    if (organizationContext.requestedClientId && accessIntent !== 'user') {
      // In 'user' mode, skip ephemeral grants — system admins must have real access records.
      const systemAdminAccessGrant = await this.getSystemAdminAccessGrant({
        user,
        clientId: organizationContext.requestedClientId,
        siteId: organizationContext.requestedSiteId,
      });

      if (systemAdminAccessGrant) {
        return {
          grant: systemAdminAccessGrant,
        };
      }
    }

    const accessRecordQueryArgs = {
      where: {
        person: { idpId: user.idpId },
      },
      orderBy: [
        {
          isPrimary: 'desc',
        },
        {
          createdOn: 'asc',
        },
      ],
      select: {
        id: true,
        isPrimary: true,
        client: {
          select: {
            id: true,
            status: true,
          },
        },
        site: {
          select: {
            id: true,
            active: true,
          },
        },
        roleId: true,
        role: {
          select: {
            id: true,
            scope: true,
            capabilities: true,
          },
        },
      },
    } satisfies Prisma.PersonClientAccessFindManyArgs;

    /** Query the database for the user's access records. */
    const accessRecords = await prismaBypassRLS.personClientAccess.findMany(
      accessRecordQueryArgs,
    );

    /** Allow or deny based on presence of an access record for the requested client (and site). */
    if (organizationContext.requestedClientId) {
      const requestedAccessRecords = accessRecords.filter(
        (accessRecord) =>
          accessRecord.client.id === organizationContext.requestedClientId &&
          (!organizationContext.requestedSiteId ||
            accessRecord.site.id === organizationContext.requestedSiteId),
      );

      if (requestedAccessRecords.length === 0) {
        const primaryAccessRecord = accessRecords.find(
          (accessRecord) => accessRecord.isPrimary,
        );

        /** If the user's email is in the system admin list, grant ephemeral system access. */
        if (this.userIsDefaultSystemAdmin(user)) {
          this.logger.log(
            `Granting ephemeral system access to bootstrap admin: ${user.email}`,
          );
          return {
            grant: {
              scope: RoleScope.SYSTEM,
              capabilities: [...VALID_CAPABILITIES],
              clientId: organizationContext.requestedClientId,
              siteId: organizationContext.requestedSiteId ?? '',
              roleId: 'ephemeral-system-admin',
            },
          };
        }

        /** If no record is found for requested client, return a detailed error message. */
        return {
          reason: 'access_grant_request_denied',
          message:
            'You do not have access to the requested organization or site. If you have received an invitation, please accept it to gain access.',
          details: {
            requestedClientId: organizationContext.requestedClientId,
            requestedSiteId: organizationContext.requestedSiteId,
            primaryClientId: primaryAccessRecord?.client.id,
            primarySiteId: primaryAccessRecord?.site.id,
            primaryRoleId: primaryAccessRecord?.roleId,
          },
        };
      }

      return this.validateAndBuildAccessGrantResult(
        requestedAccessRecords,
        organizationContext,
      );
    }

    /** Default to the user's primary access record when no specific client is requested. */
    const primaryAccessRecords = accessRecords.filter(
      (accessRecord) => accessRecord.isPrimary,
    );

    if (primaryAccessRecords.length > 0) {
      return this.validateAndBuildAccessGrantResult(
        primaryAccessRecords,
        organizationContext,
      );
    }

    /** If no primary access record is found, return the first access record. */
    if (accessRecords.length > 0) {
      return this.validateAndBuildAccessGrantResult(
        accessRecords.slice(0, 1),
        organizationContext,
      );
    }

    /** If the user's email is in the system admin list, grant ephemeral system access. */
    if (accessIntent !== 'user' && this.userIsDefaultSystemAdmin(user)) {
      this.logger.log(
        `Granting ephemeral system access to bootstrap admin: ${user.email}`,
      );
      return {
        grant: {
          scope: RoleScope.SYSTEM,
          capabilities: [...VALID_CAPABILITIES],
          clientId: '',
          siteId: '',
          roleId: 'ephemeral-system-admin',
        },
      };
    }

    /** If no access record is found, return a detailed error message. */
    return {
      reason: 'no_access_grant',
      message:
        'You do not have access to any organizations. If you have received an invitation, please accept it to gain access.',
      details: {
        primaryClientId: null,
        primarySiteId: null,
        primaryRoleId: null,
      },
    };
  }

  private async getMostPermissiveRole(
    user: StatelessUser,
    scopeAtLeast: TScope,
  ) {
    const allowedScopes = getScopesAtLeast(scopeAtLeast);
    const userAllowedRoles = await this.prisma
      .bypassRLS()
      .personClientAccess.findMany({
        where: {
          person: { idpId: user.idpId },
          role: {
            scope: {
              in: allowedScopes,
            },
          },
        },
        select: {
          roleId: true,
          role: true,
        },
        distinct: ['roleId'],
      })
      .then((rows) => rows.map(({ role }) => role));

    if (userAllowedRoles.length > 0) {
      return userAllowedRoles.reduce((mostPermissive, current) => {
        if (
          current.scope !== mostPermissive.scope &&
          isScopeAtLeast(current.scope, mostPermissive.scope)
        ) {
          return current;
        }

        if (
          current.scope === mostPermissive.scope &&
          current.capabilities.length > mostPermissive.capabilities.length
        ) {
          return current;
        }

        return mostPermissive;
      }, userAllowedRoles[0]);
    }

    return null;
  }

  private async getSystemAdminAccessGrant({
    user,
    clientId,
    siteId,
  }: {
    user: StatelessUser;
    clientId: string;
    siteId?: string;
  }): Promise<IAccessGrantData | null> {
    // Get user's most permissive SYSTEM role to grant access to the requested client
    // if role is present.
    const userSystemRole = await this.getMostPermissiveRole(
      user,
      RoleScope.SYSTEM,
    );

    // If the user has a SYSTEM role, grant access to the requested client.
    if (userSystemRole) {
      // If no site is specified, use the primary site (or first site) for the client.
      if (!siteId) {
        const site = await this.prisma.bypassRLS().site.findFirst({
          where: {
            clientId,
          },
          orderBy: [
            {
              primary: 'desc',
            },
            {
              createdOn: 'asc',
            },
          ],
        });

        siteId = site?.id;
      }

      if (siteId) {
        return {
          scope: userSystemRole.scope,
          capabilities: userSystemRole.capabilities as TCapability[],
          clientId,
          siteId: siteId,
          roleId: userSystemRole.id,
        };
      } else {
        // In the rare, but possible scenario where a client has no sites,
        // continue with regular flow but log a warning.
        this.logger.warn(
          `Attempted to grant client access to system admin, but no site was found for client ${clientId}.`,
        );
      }
    }

    return null;
  }

  private userIsDefaultSystemAdmin(user: StatelessUser): boolean {
    const systemAdminEmails = this.config.get('SYSTEM_ADMIN_EMAILS');
    return systemAdminEmails.includes(user.email.toLowerCase());
  }

  /**
   * Reduces multiple access records into a single grant and ensures client and site are activated
   * for role scopes that require it.
   *
   * @param accessRecords - The access records to validate and build the access grant result for.
   * @param organizationContext - The requested client and site IDs.
   * @returns The access grant result.
   */
  private validateAndBuildAccessGrantResult(
    accessRecords: Prisma.PersonClientAccessGetPayload<{
      select: {
        id: true;
        client: {
          select: {
            id: true;
            status: true;
          };
        };
        site: {
          select: {
            id: true;
            active: true;
          };
        };
        role: {
          select: {
            id: true;
            scope: true;
            capabilities: true;
          };
        };
      };
    }>[],
    organizationContext: {
      requestedClientId?: string;
      requestedSiteId?: string;
    } = {},
  ): TAccessGrantResult {
    const grant = reduceAccessGrants(
      accessRecords.map((accessRecord) => ({
        scope: accessRecord.role.scope,
        capabilities: accessRecord.role.capabilities as TCapability[],
        clientId: accessRecord.client.id,
        siteId: accessRecord.site.id,
        roleId: accessRecord.role.id,
      })),
    );

    // Global scopes and above (ie System scope) do not require client or site activation.
    // This prevents unnecessary account lockouts.
    if (grant.scopeAllows(RoleScope.GLOBAL)) {
      return {
        grant,
      };
    }

    const clientAndSiteStatus = accessRecords
      .filter(
        (r) => r.client.id === grant.clientId && r.site.id === grant.siteId,
      )
      .map((r) => ({
        clientActive: r.client.status === ClientStatus.ACTIVE,
        siteActive: r.site.active,
      }))
      .at(0);

    if (!clientAndSiteStatus) {
      this.logger.error(
        `Failed to find the client and site statuses for access records with IDs: ${accessRecords.map((r) => r.id).join(', ')}`,
      );

      throw new Error(
        'An error occurred while authenticating your request. Please contact support.',
      );
    }

    const { clientActive, siteActive } = clientAndSiteStatus;

    if (!clientActive) {
      return {
        reason: 'client_inactive',
        message:
          'The organization you are trying to access is not currently activated. Please contact support to reactivate your account.',
        details: {
          requestedClientId: organizationContext.requestedClientId,
          requestedSiteId: organizationContext.requestedSiteId,
        },
      };
    }

    // Client scopes and above do not require site activation.
    // This prevents unnecessary account lockouts.
    if (grant.scopeAllows(RoleScope.CLIENT)) {
      return {
        grant,
      };
    }

    if (!siteActive) {
      return {
        reason: 'site_inactive',
        message:
          'The site you are trying to access is not currently active. Please contact support to reactivate your account.',
        details: {
          requestedClientId: organizationContext.requestedClientId,
          requestedSiteId: organizationContext.requestedSiteId,
        },
      };
    }

    return {
      grant,
    };
  }

  public extractTokenFromRequest(request: IncomingMessage): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  public extractOrganizationContextFromRequest(
    request: IncomingMessage,
  ): IAccessContext {
    return {
      requestedClientId: firstOf(request.headers['x-client-id']),
      requestedSiteId: firstOf(request.headers['x-site-id']),
      accessIntent: getAccessIntent(request as any),
    };
  }

  public async generateSignature(options: {
    signatureData: string;
    /** Epoch timestamp used for HMAC input and signing key expiry check.
     *  Accepts both seconds and milliseconds (auto-detected: values < 1e12 are treated as seconds). */
    timestamp?: number;
    keyId?: string;
    ignoreExpiredKey?: boolean;
    sigLength?: number;
  }) {
    const {
      signatureData,
      timestamp = Date.now(),
      keyId,
      ignoreExpiredKey,
      sigLength = this.DEFAULT_SIG_LENGTH,
    } = options;

    const signingKey = await this.getSigningKey(
      keyId ?? this.config.get('DEFAULT_SIGNING_KEY_ID'),
    );

    // If the key is not expired, or if the ignoreExpiredKey flag is set,
    // we can use the key to generate the signature.
    // Callers pass seconds (custom tokens) or milliseconds (tag URLs);
    // normalize to ms for the Date comparison.
    const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp;
    if (
      !ignoreExpiredKey &&
      signingKey.expiredOn &&
      isBefore(signingKey.expiredOn, new Date(timestampMs))
    ) {
      throw new SigningKeyExpiredError('Signing key has expired.');
    }

    const secret = signingKey.keySecret;

    const data = `${signatureData}.${timestamp}`;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(data);
    return hmac.digest('base64url').slice(0, sigLength);
  }

  public async generateCustomToken<T extends object>(
    payload: T,
    expiresInSeconds: number,
  ) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const head = this.encodeTokenPart({
      iat: nowSeconds,
      exp: nowSeconds + expiresInSeconds,
    });
    const encodedPayload = this.encodeTokenPart(payload);
    const signature = await this.generateSignature({
      signatureData: `${head}.${encodedPayload}`,
      timestamp: nowSeconds,
    });

    return `${head}.${encodedPayload}.${signature}`;
  }

  public async validateCustomToken<T>(token: string): Promise<
    | {
        isValid: true;
        payload: T;
        error?: never;
      }
    | {
        isValid: false;
        error: string;
        payload?: never;
      }
  > {
    let head: string, payload: string, signature: string;
    let decodedHead: {
      exp: number;
      iat: number;
    };

    try {
      [head, payload, signature] = token.split('.');
      const decodedHeadRaw = this.decodeTokenPart(head);
      if (
        decodedHeadRaw !== null &&
        typeof decodedHeadRaw === 'object' &&
        'exp' in decodedHeadRaw &&
        'iat' in decodedHeadRaw
      ) {
        decodedHead = decodedHeadRaw as {
          exp: number;
          iat: number;
        };
      } else {
        throw new Error('Invalid token');
      }
    } catch {
      return {
        isValid: false,
        error: 'Invalid token',
      };
    }

    if (decodedHead.exp < Date.now() / 1000) {
      return {
        isValid: false,
        error: 'Token expired',
      };
    }

    const challenge = await this.generateSignature({
      signatureData: `${head}.${payload}`,
      timestamp: decodedHead.iat,
    });

    let signatureMatches = false;
    try {
      signatureMatches = crypto.timingSafeEqual(
        Buffer.from(challenge),
        Buffer.from(signature),
      );
    } catch {
      // timingSafeEqual throws if buffer lengths differ; treat as mismatch
    }

    if (!signatureMatches) {
      return {
        isValid: false,
        error: 'Invalid token',
      };
    }

    try {
      return {
        isValid: true,
        payload: this.decodeTokenPart(payload) as T,
      };
    } catch {
      return {
        isValid: false,
        error: 'Invalid token',
      };
    }
  }

  public async savePersonFromUserData(user: StatelessUserData) {
    const prisma = this.prisma.bypassRLS();

    const personInput: Prisma.PersonCreateInput = {
      idpId: user.idpId,
      firstName: user.givenName ?? '',
      lastName: user.familyName ?? '',
      email: user.email,
      username: user.username,
    };

    const cacheKey = `person:idpId=${user.idpId}`;
    let person = await this.memoryCache.getOrSet<
      Prisma.PersonGetPayload<object>
    >(
      cacheKey,
      async () => {
        return prisma.person.upsert({
          where: { idpId: user.idpId },
          update: personInput,
          create: personInput,
        });
      },
      60 * 60 * 1000, // 1 hour
    );

    // Update person if user data has changed.
    if (
      personInput.firstName !== person.firstName ||
      personInput.lastName !== person.lastName ||
      personInput.email !== person.email ||
      personInput.username !== person.username
    ) {
      person = await prisma.person.update({
        where: { id: person.id },
        data: personInput,
      });

      await this.memoryCache.set(cacheKey, person, 60 * 60 * 1000);
    }

    return person;
  }

  private encodeTokenPart(part: object): string {
    return Buffer.from(JSON.stringify(part)).toString('base64url');
  }

  private decodeTokenPart(part: string): object {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf-8'));
  }

  private async getSigningKey(keyId: string) {
    const cacheKey = `signing-key:${keyId}`;

    // Cache indefinitely.
    return this.memoryCache.getOrSet(cacheKey, async () => {
      let signingKey = await this.prisma.signingKey.findUnique({
        where: {
          keyId,
        },
      });

      if (signingKey === null) {
        signingKey = await this.prisma.signingKey.create({
          data: {
            keyId,
            keySecret: createSecret(),
          },
        });
      }

      return signingKey;
    });
  }
}
