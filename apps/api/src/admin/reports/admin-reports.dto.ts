import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REPORT_REVIEW_STATUSES = [
  'reviewing',
  'resolved',
  'dismissed',
] as const;
export type ReportReviewStatus = (typeof REPORT_REVIEW_STATUSES)[number];

export class ReviewReportDto {
  @IsIn(REPORT_REVIEW_STATUSES)
  status!: ReportReviewStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNotes?: string;
}
