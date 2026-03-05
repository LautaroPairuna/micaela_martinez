import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @UseGuards(JwtAuthGuard)
  @Get('course/:courseId')
  async getSubscriptionInfo(
    @CurrentUser() user: JwtUser,
    @Param('courseId') courseId: string,
  ) {
    return this.subscriptionService.getSubscriptionInfo(
      String(user.sub),
      courseId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getUserSubscriptionInfo(@CurrentUser() user: JwtUser) {
    return this.subscriptionService.getUserInfo(String(user.sub));
  }

  @UseGuards(JwtAuthGuard)
  @Get('access/:courseId')
  async checkCourseAccess(
    @CurrentUser() user: JwtUser,
    @Param('courseId') courseId: string,
  ) {
    const hasAccess = await this.subscriptionService.checkCourseAccess(
      String(user.sub),
      courseId,
    );
    return { hasAccess };
  }
}
