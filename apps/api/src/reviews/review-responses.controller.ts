import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ReviewResponsesService } from './review-responses.service';
import { CreateReviewResponseDto } from './dto/create-review-response.dto';
import type { JwtUser } from '../auth/types/jwt-user';

@Controller('reviews/:reviewId/responses')
export class ReviewResponsesController {
  constructor(
    private readonly reviewResponsesService: ReviewResponsesService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createResponse(
    @Param('reviewId') reviewId: string,
    @Body() createResponseDto: CreateReviewResponseDto,
    @CurrentUser() user: JwtUser,
  ) {
    try {
      const result = await this.reviewResponsesService.createResponse(
        reviewId,
        user.sub,
        createResponseDto,
      );
      return result;
    } catch (error) {
      console.log(
        'Error stack:',
        error instanceof Error ? error.stack : 'No stack trace available',
      );
      throw error;
    }
  }

  @Get()
  async getResponses(@Param('reviewId') reviewId: string) {
    return this.reviewResponsesService.getResponsesByReview(reviewId);
  }

  @Get('count')
  async getResponsesCount(@Param('reviewId') reviewId: string) {
    const count = await this.reviewResponsesService.getResponsesCount(reviewId);
    return { count };
  }

  @Put(':responseId')
  @UseGuards(JwtAuthGuard)
  async updateResponse(
    @Param('responseId') responseId: string,
    @Body('contenido') contenido: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reviewResponsesService.updateResponse(
      responseId,
      user.sub,
      contenido,
    );
  }

  @Delete(':responseId')
  @UseGuards(JwtAuthGuard)
  async deleteResponse(
    @Param('responseId') responseId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.reviewResponsesService.deleteResponse(responseId, user.sub);
  }
}
