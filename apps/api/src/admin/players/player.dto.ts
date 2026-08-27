import {
  IsIn,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export const PLAYER_POSITIONS = [
  'point_guard',
  'shooting_guard',
  'small_forward',
  'power_forward',
  'center',
  'guard',
  'forward',
  'unknown',
] as const;

export const CONTENT_STATUSES = ['draft', 'published', 'archived'] as const;

export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export class SavePlayerDto {
  @IsString()
  @Length(1, 100)
  fullName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  shortName?: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug!: string;

  @IsString()
  @MaxLength(4000)
  bio!: string;

  @IsIn(PLAYER_POSITIONS)
  position!: PlayerPosition;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  teamName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  nationality?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  avatarPath?: string;

  @IsIn(CONTENT_STATUSES)
  status!: ContentStatus;
}
