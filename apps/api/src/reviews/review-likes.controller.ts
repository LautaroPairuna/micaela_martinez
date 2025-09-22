import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ReviewLikesService } from './review-likes.service';
import { CreateReviewLikeDto } from './dto/create-review-like.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../auth/types/jwt-user';

@Controller('reviews')
export class ReviewLikesController {
  constructor(private readonly reviewLikesService: ReviewLikesService) {}

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  async toggleLike(
    @Param('id') resenaId: string,
    @Body() dto: Omit<CreateReviewLikeDto, 'resenaId'>,
    @CurrentUser() user: JwtUser,
  ) {
    const createDto: CreateReviewLikeDto = {
      resenaId,
      tipo: dto.tipo,
    };

    return this.reviewLikesService.toggleLike(user.sub, createDto);
  }

  @Get(':id/likes')
  async getLikesCount(@Param('id') resenaId: string) {
    return this.reviewLikesService.getLikesCount(resenaId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/user-like')
  async getUserLike(
    @Param('id') resenaId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reviewLikesService.getUserLike(resenaId, user.sub);
  }

  @Get(':id/details')
  async getResenaWithLikes(
    @Param('id') resenaId: string,
    @CurrentUser() user?: JwtUser,
  ) {
    const usuarioId = user?.sub;
    return this.reviewLikesService.getResenaWithLikes(resenaId, usuarioId);
  }
}
