import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  HttpHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Public } from 'src/auth/auth.guard';
import { CheckIsAuthenticated } from 'src/auth/policies.guard';
import { ApiConfigService } from 'src/config/api-config.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly db: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly config: ApiConfigService,
  ) {}

  @Public()
  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.http.pingCheck('keycloak', this.config.get('AUTH_JWKS_URI')),
      () => this.db.pingCheck('database', this.prisma),
    ]);
  }

  @Post('test-submit')
  @CheckIsAuthenticated()
  async testSubmit(@Body() body: unknown) {
    console.debug(`testSubmit: ${JSON.stringify(body)}`);
    return {
      message: 'Hello, world!',
    };
  }
}
