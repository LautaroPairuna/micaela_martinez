import { IsEnum, IsNotEmpty, IsString, IsIn } from 'class-validator';
import { TipoLike } from '@prisma/client';

export class CreateReviewLikeDto {
  @IsString()
  @IsNotEmpty()
  resenaId!: string;

  @IsIn(['like', 'dislike'])
  tipo!: 'like' | 'dislike';
}
