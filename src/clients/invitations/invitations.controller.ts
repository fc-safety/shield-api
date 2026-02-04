import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Public } from '../../auth/auth.guard';
import { CheckCapability, CheckPolicies } from '../../auth/policies.guard';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { ListInvitationsQueryDto } from './dto/list-invitations-query.dto';
import { InvitationsService } from './invitations.service';

@Controller('invitations')
@CheckCapability('manage-users')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /**
   * Create a new invitation.
   * Client Admin+: Can create invitations for their client.
   * Super Admin: Can create for any client.
   */
  @Post()
  async create(@Body() dto: CreateInvitationDto) {
    return this.invitationsService.create(dto);
  }

  /**
   * List invitations with pagination and filtering.
   */
  @Get()
  async findAll(@Query() query: ListInvitationsQueryDto) {
    return this.invitationsService.findAll(query);
  }

  /**
   * Validate an invitation code (public endpoint).
   * Used to show invitation details before login.
   */
  @Get('validate/:code')
  @Public()
  async validateCode(@Param('code') code: string) {
    return this.invitationsService.validateCode(code);
  }

  /**
   * Get a single invitation by ID.
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.invitationsService.findOne(id);
  }

  /**
   * Accept an invitation.
   * Any authenticated user can accept an invitation.
   */
  @Post(':code/accept')
  @CheckPolicies(() => true) // Any authenticated user
  async accept(@Param('code') code: string) {
    return this.invitationsService.accept(code);
  }

  /**
   * Revoke an invitation.
   */
  @Delete(':id')
  @HttpCode(204)
  async revoke(@Param('id') id: string) {
    return this.invitationsService.revoke(id);
  }
}
