import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user';
import { NotificationsService } from './notifications.service';
import {
  UpdateNotificationPreferencesDto,
  NotificationPreferencesResponseDto,
} from './dto/user-preferences.dto';

@Controller('notifications/preferences')
@UseGuards(JwtAuthGuard)
export class NotificationPreferencesController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getPreferences(
    @CurrentUser() user: JwtUser,
  ): Promise<NotificationPreferencesResponseDto> {
    return this.notificationsService.getUserPreferences(user.sub);
  }

  @Put()
  async updatePreferences(
    @CurrentUser() user: JwtUser,
    @Body() updateDto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponseDto> {
    return this.notificationsService.updateUserPreferences(user.sub, updateDto);
  }

  @Get('stats')
  async getNotificationStats(@CurrentUser() user: JwtUser) {
    // Solo para administradores o el propio usuario
    return this.notificationsService.getNotificationStats();
  }
}
