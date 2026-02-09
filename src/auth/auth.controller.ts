import { Controller, Get } from '@nestjs/common';
import { ApiClsService } from './api-cls.service';
import { TAccessGrant } from './auth.types';
import { SkipAccessGrantValidation } from './guards/auth.guard';
import { CheckIsAuthenticated } from './policies.guard';

/**
 * Response shape for GET /auth/me endpoint.
 * Returns identity info and all client access records for the user.
 * Works for users who haven't been assigned to a client yet.
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

  // Person info from database (null if person record doesn't exist yet)
  personId: string | null;

  // All client access records for this user
  accessGrant: TAccessGrant;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly cls: ApiClsService) {}

  /**
   * Get the current authenticated user's data.
   * Works for users who haven't been assigned to a client yet.
   * Returns identity info and all client access records.
   */
  @Get('me')
  @CheckIsAuthenticated()
  @SkipAccessGrantValidation()
  async getCurrentUser(): Promise<CurrentUserResponse> {
    const user = this.cls.requireUser();
    const person = this.cls.requirePerson();
    const accessGrant = this.cls.requireAccessGrant();

    return {
      // Identity info from token
      idpId: user.idpId,
      email: user.email,
      username: user.username,
      name: user.name,
      givenName: user.givenName,
      familyName: user.familyName,
      picture: user.picture,

      // Person info from database
      personId: person.id,

      // Access grant for the user
      accessGrant,
    };
  }
}
