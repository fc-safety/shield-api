import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CheckIsAuthenticated,
  CheckResourcePermissions,
} from 'src/auth/policies.guard';
import { ClientsService } from './clients.service';
import { ClearDemoInspectionsQueryDto } from './dto/clear-demo-inspections-query.dto';
import { CreateClientDto } from './dto/create-client.dto';
import { DuplicateDemoClientDto } from './dto/duplicate-demo-client.dto';
import { GenerateDemoInspectionsDto } from './dto/generate-demo-inspections.dto';
import { QueryClientDto } from './dto/query-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Controller('clients')
@CheckResourcePermissions('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  findAll(@Query() queryClientDto: QueryClientDto) {
    return this.clientsService.findAll(queryClientDto);
  }

  @Get('my-organization')
  findMyOrganization() {
    return this.clientsService.findUserOrganization();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }

  @Post(':id/duplicate-demo')
  duplicateDemo(
    @Param('id') id: string,
    @Body() duplicateDemoClientDto: DuplicateDemoClientDto,
  ) {
    return this.clientsService.duplicateDemo(id, duplicateDemoClientDto);
  }

  // Only require authentication, since this forbids clearing inspections for non-demo clients.
  @CheckIsAuthenticated()
  @Post('/clear-demo-inspections')
  @HttpCode(204)
  async clearDemoInspections(
    @Body() clearDemoInspectionsQueryDto: ClearDemoInspectionsQueryDto,
  ) {
    await this.clientsService.clearInspectionsForDemoClient(
      clearDemoInspectionsQueryDto,
    );
  }

  @CheckIsAuthenticated()
  @Post('/generate-demo-inspections')
  async generateDemoInspections(
    @Body() generateDemoInspectionsDto: GenerateDemoInspectionsDto,
  ) {
    return this.clientsService.generateInspectionsForDemoClient(
      generateDemoInspectionsDto,
    );
  }

  @CheckIsAuthenticated()
  @Post('/renew-noncompliant-demo-assets')
  async renewNoncompliantDemoAssets() {
    return this.clientsService.renewNoncompliantDemoAssets();
  }
}
