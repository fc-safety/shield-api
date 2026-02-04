import { Controller, Get } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PeopleService } from 'src/clients/people/people.service';
import { StatelessUserData } from './user.schema';

/**
 * Response shape for GET /auth/me endpoint.
 * Combines token data with database-enriched user context.
 */
export interface CurrentUserResponse {
  // Identity info from token
  idpId: string;
  email: string;
  username: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  picture?: string;

  // Context info (may be overridden by database lookup)
  personId: string;
  clientId: string;
  siteId: string;

  // Permission info from database
  scope: string;
  capabilities: string[];

  // Computed flags
  hasMultiClientScope: boolean;
  hasMultiSiteScope: boolean;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly cls: ClsService,
    private readonly peopleService: PeopleService,
  ) {}

  /**
   * Get the current authenticated user's data.
   * Combines JWT token information with database-derived permissions.
   */
  @Get('me')
  async getCurrentUser(): Promise<CurrentUserResponse> {
    const user = this.cls.get<StatelessUserData>('user');
    const person = await this.peopleService.getPersonRepresentation();

    return {
      // Identity info from token
      idpId: user.idpId,
      email: user.email,
      username: user.username,
      name: user.name,
      givenName: user.givenName,
      familyName: user.familyName,
      picture: user.picture,

      // Context from database (may differ from token if using x-client-id)
      personId: person.id,
      clientId: person.clientId,
      siteId: person.siteId,

      // Permissions from database
      scope: person.scope,
      capabilities: person.capabilities,

      // Computed flags
      hasMultiClientScope: person.hasMultiClientScope,
      hasMultiSiteScope: person.hasMultiSiteScope,
    };
  }
}
