import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BoxController } from './box.controller';
import { BoxService } from './box.service';

@Module({
  imports: [PrismaModule],
  controllers: [BoxController],
  providers: [BoxService],
  exports: [BoxService],
})
export class BoxModule {}
