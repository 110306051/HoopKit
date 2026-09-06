import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export const REPORT_TARGET_TYPES = [
  'user_clip',
  'move',
  'workout_template',
] as const;
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number];

export const REPORT_REASONS = [
  'inappropriate',
  'copyright',
  'misleading',
  'safety',
  'other',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export class CreateReportDto {
  @IsIn(REPORT_TARGET_TYPES)
  targetType!: ReportTargetType;

  @IsUUID('4')
  targetId!: string;

  @IsIn(REPORT_REASONS)
  reason!: ReportReason;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  details?: string;
}
