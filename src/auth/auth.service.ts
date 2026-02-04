import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { init as cuid2Init } from '@paralleldrive/cuid2';
import type { Cache } from 'cache-manager';
import crypto from 'crypto';
import { isBefore } from 'date-fns';
import { IncomingMessage } from 'http';
import { Jwt, TokenExpiredError } from 'jsonwebtoken';
import { expressJwtSecret } from 'jwks-rsa';
import { isNil } from 'src/common/utils';
import { ApiConfigService } from 'src/config/api-config.service';
import { SigningKey } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { TCapability } from './capabilities';
import { RoleScope, TScope } from './scope';
import {
  buildUserFromToken,
  StatelessUser,
  StatelessUserData,
} from './user.schema';

interface ValidateJWTTokenOptions {
  allowPublic?: boolean;
}

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
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly prisma: PrismaService,
  ) {
    this.getSecret = expressJwtSecret({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: this.config.get('AUTH_JWKS_URI'),
    });
  }

  async validateJwtToken(
    token: string | undefined | null,
    { allowPublic = false }: ValidateJWTTokenOptions = {},
  ): Promise<{
    isValid: boolean;
    user?: StatelessUser;
  }> {
    if (!token) {
      if (allowPublic) {
        return { isValid: true };
      }

      return { isValid: false };
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
      const userData = buildUserFromToken(payload);

      // Load capabilities and scope from database
      const roleData = await this.loadUserRoleFromDatabase(userData);

      // Construct full StatelessUser with capabilities and scope
      const user = new StatelessUser({
        ...userData,
        scope: roleData?.scope ?? RoleScope.SELF,
        capabilities: roleData?.capabilities ?? [],
      });

      return { isValid: true, user };
    } catch (e) {
      if (!(e instanceof TokenExpiredError)) {
        this.logger.error('Error validating JWT token', e);
      }

      if (allowPublic) {
        return { isValid: true };
      }

      return { isValid: false };
    }
  }

  /**
   * Load scope and capabilities from PersonClientAccess.role for the user.
   * Returns null if no access record exists (user may not be configured yet).
   */
  private async loadUserRoleFromDatabase(
    userData: StatelessUserData,
  ): Promise<{ scope: TScope; capabilities: TCapability[] } | null> {
    const prismaBypassRLS = this.prisma.bypassRLS();

    const cacheKey = `user-role:${userData.idpId}:${userData.clientId}`;

    const cached = await this.cache.get<{
      scope: TScope;
      capabilities: TCapability[];
    } | null>(cacheKey);
    if (!isNil(cached)) {
      return cached;
    }

    try {
      // First, find the Person by idpId
      const person = await prismaBypassRLS.person.findUnique({
        where: { idpId: userData.idpId },
        select: { id: true },
      });

      if (!person) {
        // Person doesn't exist yet - will be created on first request
        await this.cache.set(cacheKey, null, 60 * 1000); // Cache for 1 minute
        return null;
      }

      // Find the client by external ID
      const client = await prismaBypassRLS.client.findUnique({
        where: { externalId: userData.clientId },
        select: { id: true },
      });

      if (!client) {
        await this.cache.set(cacheKey, null, 60 * 1000);
        return null;
      }

      // Find PersonClientAccess with role
      const access = await prismaBypassRLS.personClientAccess.findFirst({
        where: {
          personId: person.id,
          clientId: client.id,
        },
        orderBy: {
          isPrimary: 'desc',
        },
        include: {
          role: {
            select: {
              scope: true,
              capabilities: true,
            },
          },
        },
      });

      if (!access) {
        await this.cache.set(cacheKey, null, 60 * 1000);
        return null;
      }

      const result = {
        scope: access.role.scope,
        capabilities: access.role.capabilities as TCapability[],
      };

      // Cache for 1 hour
      await this.cache.set(cacheKey, result, 60 * 60 * 1000);

      return result;
    } catch (e) {
      this.logger.error('Error loading user role from database', e);
      return null;
    }
  }

  public extractTokenFromRequest(request: IncomingMessage): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  public async generateSignature(options: {
    signatureData: string;
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
    if (
      !ignoreExpiredKey &&
      signingKey.expiredOn &&
      isBefore(signingKey.expiredOn, new Date(timestamp))
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

    if (
      !crypto.timingSafeEqual(Buffer.from(challenge), Buffer.from(signature))
    ) {
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

  private encodeTokenPart(part: object): string {
    return Buffer.from(JSON.stringify(part)).toString('base64url');
  }

  private decodeTokenPart(part: string): object {
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf-8'));
  }

  private async getSigningKey(keyId: string) {
    const cacheKey = `signing-key:${keyId}`;
    let signingKey = (await this.cache.get<SigningKey>(cacheKey)) ?? null;

    if (signingKey) {
      return signingKey;
    }

    signingKey = await this.prisma.signingKey.findUnique({
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

    // Cache indefinitely.
    await this.cache.set(cacheKey, signingKey);

    return signingKey;
  }
}
