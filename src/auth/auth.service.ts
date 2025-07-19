import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { init as cuid2Init } from '@paralleldrive/cuid2';
import { Cache } from 'cache-manager';
import crypto from 'crypto';
import { isBefore } from 'date-fns';
import { IncomingMessage } from 'http';
import { Jwt, TokenExpiredError } from 'jsonwebtoken';
import { expressJwtSecret } from 'jwks-rsa';
import { ApiConfigService } from 'src/config/api-config.service';
import { SigningKey } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { buildUserFromToken, StatelessUser } from './user.schema';

interface ValidateJWTTokenOptions {
  allowPublic?: boolean;
}

const createSecret = cuid2Init({ length: 64 });

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

  constructor(
    private jwtService: JwtService,
    private config: ApiConfigService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly prisma: PrismaService,
  ) {}

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
        const getSecret = expressJwtSecret({
          cache: true,
          rateLimit: true,
          jwksRequestsPerMinute: 5,
          jwksUri: this.config.get('AUTH_JWKS_URI'),
        });

        // First arg ("req") does not actually get used and thus does not need
        // to be anything specific.
        return getSecret({}, jwt.header, jwt.payload, (e, key) => {
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

      const user = buildUserFromToken(payload);

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
    const [head, payload, signature] = token.split('.');
    const decodedHead = this.decodeTokenPart(head) as {
      exp: number;
      iat: number;
    };

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

    return {
      isValid: true,
      payload: this.decodeTokenPart(payload) as T,
    };
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
