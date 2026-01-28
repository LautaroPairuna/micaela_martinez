import { IsInt, Min } from 'class-validator';

export class ReorderSliderDto {
  @IsInt()
  @Min(0)
  orden!: number;
}
