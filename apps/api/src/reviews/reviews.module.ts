import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewLikesController } from './review-likes.controller';
import { ReviewLikesService } from './review-likes.service';
import { ReviewResponsesController } from './review-responses.controller';
import { ReviewResponsesService } from './review-responses.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [
    ReviewsController,
    ReviewLikesController,
    ReviewResponsesController,
  ],
  providers: [ReviewsService, ReviewLikesService, ReviewResponsesService],
  exports: [ReviewsService, ReviewLikesService, ReviewResponsesService],
})
export class ReviewsModule {}
