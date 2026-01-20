// apps/api/src/admin/dashboard/admin-dashboard.controller.ts

import { Controller, Get } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { DashboardSummaryDto } from './admin-dashboard.dto';

@Controller('admin/dashboard')
export class AdminDashboardController {
  constructor(private readonly dashboardService: AdminDashboardService) {}

  @Get('overview')
  async getOverview(): Promise<DashboardSummaryDto> {
    return this.dashboardService.getOverview();
  }
}
