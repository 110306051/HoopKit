import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CONTENT_STATUSES } from '../players/player.dto';
import type { ContentStatus } from '../players/player.dto';

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;
type Difficulty = (typeof DIFFICULTIES)[number];

export class MoveStepDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @Length(1, 100)
  title!: string;

  @IsString()
  @MaxLength(4000)
  description!: string;
}

export class HighlightClipDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @Length(1, 120)
  title!: string;

  @IsUUID()
  mediaAssetId!: string;

  @IsOptional()
  @IsUUID()
  playerId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  startMs!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  endMs!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  coverTimeMs?: number;
}

export class SaveMoveDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(100)
  slug!: string;

  @IsUUID()
  categoryId!: string;

  @IsString()
  @MaxLength(1000)
  summary!: string;

  @IsIn(DIFFICULTIES)
  difficulty!: Difficulty;

  @IsString()
  @MaxLength(8000)
  howToUse!: string;

  @IsString()
  @MaxLength(8000)
  whenToUse!: string;

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  coachingCues!: string[];

  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(500, { each: true })
  commonMistakes!: string[];

  @IsOptional()
  @IsUUID()
  coverAssetId?: string;

  @IsIn(CONTENT_STATUSES)
  status!: ContentStatus;

  @IsArray()
  @ArrayMaxSize(30)
  @IsUUID('4', { each: true })
  playerIds!: string[];

  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  tagIds!: string[];

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => MoveStepDto)
  steps!: MoveStepDto[];

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => HighlightClipDto)
  clips!: HighlightClipDto[];
}

export class WorkoutItemDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  @IsUUID()
  moveId?: string;

  @IsString()
  @Length(1, 120)
  title!: string;

  @IsString()
  @MaxLength(4000)
  instructions!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sets?: number;

  @ValidateIf((item: WorkoutItemDto) => item.durationSeconds == null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  reps?: number;

  @ValidateIf((item: WorkoutItemDto) => item.reps == null)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  restSeconds!: number;
}

export class WorkoutSectionDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => WorkoutItemDto)
  items!: WorkoutItemDto[];
}

export class SaveWorkoutTemplateDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @MaxLength(120)
  slug!: string;

  @IsOptional()
  @IsUUID()
  sourcePlayerId?: string;

  @IsString()
  @MaxLength(8000)
  description!: string;

  @IsString()
  @MaxLength(8000)
  warmupNotes!: string;

  @IsIn(DIFFICULTIES)
  difficulty!: Difficulty;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  estimatedDurationMinutes?: number;

  @IsOptional()
  @IsUUID()
  coverAssetId?: string;

  @IsIn(CONTENT_STATUSES)
  status!: ContentStatus;

  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => WorkoutSectionDto)
  sections!: WorkoutSectionDto[];
}
