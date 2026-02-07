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
import { CheckCapability, CheckIsAuthenticated } from 'src/auth/utils/policies';
import {
  Public,
  SkipAccessGrantValidation,
} from '../../auth/guards/auth.guard';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { QueryInvitationDto } from './dto/query-invitationd.dto';
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
  async findAll(@Query() query: QueryInvitationDto) {
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
   * Any authenticated user can accept an invitation, even if they don't have
   * a client/site assigned yet (which is the typical case for new users).
   */
  @Post(':code/accept')
  @CheckIsAuthenticated()
  @SkipAccessGrantValidation()
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
