import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import type { JwtUser } from '../auth/types/jwt-user';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  async getAllReviews(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getAllReviews(page, limit);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @CurrentUser() user: JwtUser,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    console.log('=== CREATE REVIEW DEBUG ===');
    console.log('User:', user);
    console.log('Request Body:', JSON.stringify(createReviewDto, null, 2));
    console.log('Body type:', typeof createReviewDto);

    console.log(
      'productoId:',
      createReviewDto.productoId,
      'type:',
      typeof createReviewDto.productoId,
    );
    console.log(
      'puntaje:',
      createReviewDto.puntaje,
      'type:',
      typeof createReviewDto.puntaje,
    );
    console.log(
      'comentario:',
      createReviewDto.comentario,
      'type:',
      typeof createReviewDto.comentario,
    );
    console.log('========================');

    try {
      const result = await this.reviewsService.createReview(
        user.sub,
        createReviewDto,
      );
      console.log('Review created successfully:', result.id);
      return result;
    } catch (error) {
      console.log(
        'Error creating review:',
        error instanceof Error ? error.message : String(error),
      );
      console.log(
        'Error stack:',
        error instanceof Error ? error.stack : 'No stack trace available',
      );
      throw error;
    }
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateReview(
    @CurrentUser() user: JwtUser,
    @Param('id') reviewId: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(
      user.sub,
      reviewId,
      updateReviewDto,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async patchReview(
    @CurrentUser() user: JwtUser,
    @Param('id') reviewId: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    return this.reviewsService.updateReview(
      user.sub,
      reviewId,
      updateReviewDto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteReview(
    @CurrentUser() user: JwtUser,
    @Param('id') reviewId: string,
  ) {
    return this.reviewsService.deleteReview(user.sub, reviewId);
  }

  @Get('product/:productId')
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getReviewsByProduct(productId, page, limit);
  }

  @Get('course/:courseId')
  async getCourseReviews(
    @Param('courseId') courseId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.reviewsService.getReviewsByCourse(courseId, page, limit);
  }

  @Get('my-review')
  @UseGuards(JwtAuthGuard)
  async getMyReview(
    @CurrentUser() user: JwtUser,
    @Query('cursoId') cursoId?: string,
    @Query('productoId') productoId?: string,
  ) {
    return this.reviewsService.getUserReview(user.sub, cursoId, productoId);
  }
}
