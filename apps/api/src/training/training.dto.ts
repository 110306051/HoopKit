import { IsUUID } from 'class-validator';

export class StartWorkoutSessionDto {
  @IsUUID('4')
  planId!: string;
}
