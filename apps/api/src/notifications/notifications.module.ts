import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationPreferencesController } from './preferences.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsTaskService } from './notifications-task.service';
import { NotificationListenerService } from './notification-listener.service';
import { WebsocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [PrismaModule, ScheduleModule.forRoot(), WebsocketsModule],
  controllers: [NotificationsController, NotificationPreferencesController],
  providers: [
    NotificationsService,
    NotificationsTaskService,
    NotificationListenerService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
