import {
  ArrayMaxSize,
  ArrayUnique,
  Equals,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
} from 'class-validator';

export class DeleteAccountDto {
  @Equals('DELETE')
  confirmation!: 'DELETE';
}

export class UpdateProfileDto {
  @IsString()
  @Length(1, 50)
  displayName!: string;
}

export class CreatePlanDto {
  @IsString()
  @Length(1, 120)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class CloneTemplateDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class SaveSectionDto {
  @IsString()
  @Length(1, 100)
  name!: string;
}

export class ReorderIdsDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  ids!: string[];
}

export class CreatePlanItemDto {
  @IsOptional()
  @IsUUID('4')
  moveId?: string;

  @IsString()
  @Length(1, 120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sets?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  restSeconds?: number;
}

export class UpdatePlanItemDto {
  @IsOptional()
  @IsString()
  @Length(1, 120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  instructions?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  sets?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  durationSeconds?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  restSeconds?: number;
}
