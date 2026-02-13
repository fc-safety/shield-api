import { Module } from '@nestjs/common';
import { ClientsModule } from 'src/clients/clients/clients.module';
import { UsersModule } from 'src/clients/users/users.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [UsersModule, ClientsModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
