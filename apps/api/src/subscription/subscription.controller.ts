import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../auth/get-user.decorator';
import { Usuario } from '@prisma/client';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @UseGuards(JwtAuthGuard)
  @Get('course/:courseId')
  async getSubscriptionInfo(
    @GetUser() user: Usuario,
    @Param('courseId') courseId: string,
  ) {
    return this.subscriptionService.getSubscriptionInfo(String(user.id), courseId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getUserSubscriptionInfo(@GetUser() user: Usuario) {
    // Usamos el método getUserInfo que no requiere courseId
    return this.subscriptionService.getUserInfo(String(user.id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('access/:courseId')
  async checkCourseAccess(
    @GetUser() user: Usuario,
    @Param('courseId') courseId: string,
  ) {
    const hasAccess = await this.subscriptionService.checkCourseAccess(
      String(user.id),
      courseId,
    );
    return { hasAccess };
  }
}
