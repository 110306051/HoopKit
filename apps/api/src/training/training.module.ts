import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TrainingController } from './training.controller';
import { TrainingService } from './training.service';

@Module({
  imports: [AuthModule],
  controllers: [TrainingController],
  providers: [TrainingService],
})
export class TrainingModule {}
