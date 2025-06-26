import { Module } from '@nestjs/common';
import { TagsModule } from 'src/assets/tags/tags.module';
import { M2mController } from './m2m.controller';
import { M2mService } from './m2m.service';

@Module({
  imports: [TagsModule],
  providers: [M2mService],
  controllers: [M2mController],
})
export class M2mModule {}
