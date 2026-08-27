import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateImageUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsIn(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(10 * 1024 * 1024)
  fileSize!: number;
}

export class CompleteImageUploadDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === null || value === '' ? undefined : value,
  )
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === null || value === '' ? undefined : value,
  )
  @IsInt()
  @Min(1)
  height?: number;
}

export class CreateVideoUploadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MaxLength(120)
  contentType!: string;

  @IsInt()
  @Min(1)
  fileSize!: number;
}
