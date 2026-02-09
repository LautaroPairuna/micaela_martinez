import { IsInt, IsObject, IsOptional, Min } from 'class-validator';

export class UpsertLessonFormConfigDto {
  @IsObject()
  schema!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  ui?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}
