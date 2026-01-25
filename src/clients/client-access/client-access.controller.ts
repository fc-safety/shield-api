import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { CheckPolicies } from 'src/auth/policies.guard';
import { ClientAccessService } from './client-access.service';
import { CreateClientAccessDto } from './dto/create-client-access.dto';
import { UpdateClientAccessDto } from './dto/update-client-access.dto';

@Controller('client-access')
export class ClientAccessController {
  constructor(private readonly clientAccessService: ClientAccessService) {}

  /**
   * Get the current user's accessible clients.
   */
  @Get('me')
  async getMyClientAccess() {
    return this.clientAccessService.getMyClientAccess();
  }

  /**
   * Get a person's client access entries (admin only).
   */
  @Get('persons/:personId')
  @CheckPolicies(({ user }) => user.isSuperAdmin())
  async getPersonClientAccess(@Param('personId') personId: string) {
    return this.clientAccessService.getPersonClientAccess(personId);
  }

  /**
   * Grant client access to a person (admin only).
   */
  @Post('persons/:personId')
  @CheckPolicies(({ user }) => user.isSuperAdmin())
  async grantClientAccess(
    @Param('personId') personId: string,
    @Body() dto: CreateClientAccessDto,
  ) {
    return this.clientAccessService.grantClientAccess(personId, dto);
  }

  /**
   * Update a client access entry (admin only).
   */
  @Patch(':id')
  @CheckPolicies(({ user }) => user.isSuperAdmin())
  async updateClientAccess(
    @Param('id') id: string,
    @Body() dto: UpdateClientAccessDto,
  ) {
    return this.clientAccessService.updateClientAccess(id, dto);
  }

  /**
   * Revoke client access (admin only).
   */
  @Delete(':id')
  @HttpCode(204)
  @CheckPolicies(({ user }) => user.isSuperAdmin())
  async revokeClientAccess(@Param('id') id: string) {
    return this.clientAccessService.revokeClientAccess(id);
  }
}
