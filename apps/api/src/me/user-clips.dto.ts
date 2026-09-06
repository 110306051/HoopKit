import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUserClipUploadDto {
  @IsString()
  @Length(1, 120)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(5)
  @IsUUID('4', { each: true })
  playerIds!: string[];

  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @Length(1, 30, { each: true })
  tags!: string[];

  @IsString()
  @Length(1, 255)
  fileName!: string;

  @IsString()
  @MaxLength(120)
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(500 * 1024 * 1024)
  fileSize!: number;
}
