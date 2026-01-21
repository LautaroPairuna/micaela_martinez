import { IsNotEmpty, IsString, IsIn } from 'class-validator';

export class CreateReviewLikeDto {
  @IsString()
  @IsNotEmpty()
  resenaId!: string;

  @IsIn(['like', 'dislike'])
  tipo!: 'like' | 'dislike';
}
