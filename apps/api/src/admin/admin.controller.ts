import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  Query,
  UseGuards,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { GetUser } from '../auth/get-user.decorator';
import { Usuario } from '@prisma/client';
import { CreateActivityDto } from './activity.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private checkAdminPermissions(user: Usuario) {
    if (!user) throw new UnauthorizedException('Usuario no autenticado');
    return true;
  }

  @Get('dashboard/stats')
  async getDashboardStats(@GetUser() user?: Usuario) {
    this.checkAdminPermissions(user!);
    return this.adminService.getDashboardStats();
  }

  @Get('audit-logs')
  async getAuditLogs(
    @GetUser() user?: Usuario,
    @Query('limit') limit?: string,
    @Query('userId') userId?: string,
    @Query('tableName') tableName?: string,
    @Query('action') action?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('offset') offset?: string,
  ) {
    this.checkAdminPermissions(user!);
    return this.adminService.getAuditLogs({
      limit: limit ? parseInt(limit) : 50,
      offset: offset ? parseInt(offset) : 0,
      userId,
      tableName,
      action,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });
  }

  @Get('audit-logs/recent')
  async getRecentAuditLogs(
    @GetUser() user?: Usuario,
    @Query('limit') limit?: string,
  ) {
    this.checkAdminPermissions(user!);
    return this.adminService.getRecentAuditLogs(limit ? parseInt(limit) : 15);
  }

  @Post('activity')
  async createActivity(
    @Body() activityDto: CreateActivityDto,
    @GetUser() user: Usuario,
  ) {
    this.checkAdminPermissions(user);
    // Registrar SIEMPRE con el ID numérico del usuario autenticado
    // El sistema de auditoría requiere un userId válido (número),
    // por lo que usamos el ID del usuario en lugar de nombre/email.
    activityDto.user = String(user.id);
    return this.adminService.createActivity(activityDto);
  }

  // ───────────── Rutas oficiales de tablas ─────────────
  @Get('tables/:tableName/records')
  async getTableRecords(
    @Param('tableName') tableName: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('filters') filters?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortDir') sortDir?: 'asc' | 'desc',
    @GetUser() user?: Usuario,
  ) {
    this.checkAdminPermissions(user!);
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    let parsedFilters = {};
    if (filters) {
      try {
        parsedFilters = JSON.parse(filters);
      } catch {}
    }

    return this.adminService.findAll(
      tableName,
      pageNum,
      limitNum,
      search,
      parsedFilters,
      sortBy,
      sortDir,
    );
  }

  @Get('tables/:tableName/records/:id')
  async getTableRecord(
    @Param('tableName') tableName: string,
    @Param('id') id: string,
    @GetUser() user?: Usuario,
  ) {
    this.checkAdminPermissions(user!);
    return this.adminService.findOne(tableName, id);
  }

  @Post('tables/:tableName/search')
  async searchTableRecords(
    @Param('tableName') tableName: string,
    @Body() body: any,
    @GetUser() user?: Usuario,
  ) {
    this.checkAdminPermissions(user!);
    const pageNum = body.page ? parseInt(body.page, 10) : 1;
    const limitNum =
      body.limit || body.pageSize
        ? parseInt(body.limit || body.pageSize, 10)
        : 10;
    const search = body.search || body.q;
    const filters = body.filters || {};
    const sortBy = body.sortBy;
    const sortDir = body.sortDir;
    return this.adminService.findAll(
      tableName,
      pageNum,
      limitNum,
      search,
      filters,
      sortBy,
      sortDir,
    );
  }

  @Post('tables/:tableName/records')
  async createTableRecord(
    @Param('tableName') tableName: string,
    @Body() createDto: any,
    @GetUser() user?: Usuario,
  ) {
    this.checkAdminPermissions(user!);
    
    // Debug: Log de datos recibidos
    console.log('=== CREATE RECORD DEBUG ===');
    console.log('Table Name:', tableName);
    console.log('Request Body:', JSON.stringify(createDto, null, 2));
    console.log('Body type:', typeof createDto);
    console.log('Body keys:', Object.keys(createDto || {}));
    console.log('===============================');
    
    return this.adminService.create(tableName, createDto);
  }

  @Put('tables/:tableName/records/:id')
  async updateTableRecord(
    @Param('tableName') tableName: string,
    @Param('id') id: string,
    @Body() updateDto: any,
    @GetUser() user?: Usuario,
  ) {
    this.checkAdminPermissions(user!);
    return this.adminService.update(tableName, id, updateDto);
  }

  @Delete('tables/:tableName/records/:id')
  async deleteTableRecord(
    @Param('tableName') tableName: string,
    @Param('id') id: string,
    @GetUser() user?: Usuario,
  ) {
    this.checkAdminPermissions(user!);
    return this.adminService.remove(tableName, id);
  }

  @Get('tables/:tableName/options')
  async getSelectOptions(
    @Param('tableName') tableName: string,
    @GetUser() user?: Usuario,
  ) {
    this.checkAdminPermissions(user!);
    return this.adminService.getSelectOptions(tableName);
  }
}
