// src/notifications/notifications.controller.ts
import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseBoolPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import type { JwtUser } from '../auth/types/jwt-user';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @CurrentUser() user: JwtUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('onlyUnread', new DefaultValuePipe(false), ParseBoolPipe)
    onlyUnread: boolean,
  ) {
    return this.notificationsService.getUserNotifications(user.sub, {
      page,
      limit,
      onlyUnread,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@CurrentUser() user: JwtUser) {
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return { count };
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string, // <- string (UUID en Prisma)
    @CurrentUser() user: JwtUser,
  ) {
    await this.notificationsService.markAsRead(id, user.sub);
    return { success: true };
  }

  @Put('read-all')
  async markAllAsRead(@CurrentUser() user: JwtUser) {
    await this.notificationsService.markAllAsRead(user.sub);
    return { success: true };
  }

  @Delete(':id')
  async deleteNotification(
    @Param('id') id: string, // <- string (UUID en Prisma)
    @CurrentUser() user: JwtUser,
  ) {
    await this.notificationsService.deleteNotification(id, user.sub);
    return { success: true };
  }
}
