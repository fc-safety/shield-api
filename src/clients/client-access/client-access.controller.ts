import { Controller, Get } from '@nestjs/common';
import { CheckIsAuthenticated } from 'src/auth/policies.guard';
import { ClientAccessService } from './client-access.service';

@Controller('client-access')
export class ClientAccessController {
  constructor(private readonly clientAccessService: ClientAccessService) {}

  /**
   * Get the current user's accessible clients.
   */
  @Get('me')
  @CheckIsAuthenticated()
  async getMyClientAccess() {
    return this.clientAccessService.getMyClientAccess();
  }
}
