import { Module } from '@nestjs/common';
import { UsersModule } from 'src/clients/users/users.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [UsersModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
