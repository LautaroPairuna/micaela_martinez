import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString, IsOptional, IsBoolean, IsObject, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { AccountService } from './account.service';
import { OrdersService } from '../orders/orders.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from '../auth/types/jwt-user';

// DTOs con validación
class UpdateProfileDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

class UpsertAddressDto {
  @IsOptional()
  id?: number;

  @IsOptional()
  @IsString()
  etiqueta?: string | null;

  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  telefono?: string | null;

  @IsString()
  calle!: string;

  @IsOptional()
  @IsString()
  numero?: string | null;

  @IsOptional()
  @IsString()
  pisoDepto?: string | null;

  @IsString()
  ciudad!: string;

  @IsString()
  provincia!: string;

  @IsString()
  cp!: string;

  @IsOptional()
  @IsString()
  pais?: string;

  @IsOptional()
  @IsBoolean()
  predeterminada?: boolean;
}

class AddFavoriteDto {
  productoId!: number;
}

class UpdateLessonProgressDto {
  @IsInt()
  @Type(() => Number)
  enrollmentId!: number;

  @IsInt()
  @Type(() => Number)
  moduleId!: number;

  @IsInt()
  @Type(() => Number)
  lessonId!: number;

  @IsOptional()
  @IsObject()
  progressData?: any;
}

@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class AccountController {
  constructor(
    private readonly svc: AccountService,
    private readonly ordersService: OrdersService
  ) {}

  /** Perfil (incluye roles) */
  @Get()
  me(@CurrentUser() user: JwtUser) {
    return this.svc.getMe(user.sub);
  }

  @Patch()
  update(@CurrentUser() user: JwtUser, @Body() dto: UpdateProfileDto) {
    return this.svc.updateProfile(user.sub, dto);
  }

  /** Direcciones */
  @Get('addresses')
  listAddresses(@CurrentUser() user: JwtUser) {
    return this.svc.listAddresses(user.sub);
  }

  @Post('addresses')
  upsertAddress(@CurrentUser() user: JwtUser, @Body() dto: UpsertAddressDto) {
    return this.svc.upsertAddress(user.sub, dto);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser() user: JwtUser, @Param('id') id: number) {
    return this.svc.deleteAddress(user.sub, id);
  }

  /** Favoritos */
  @Get('favorites')
  listFavorites(@CurrentUser() user: JwtUser) {
    return this.svc.listFavorites(user.sub);
  }

  @Post('favorites')
  addFavorite(@CurrentUser() user: JwtUser, @Body() dto: AddFavoriteDto) {
    return this.svc.addFavorite(user.sub, dto);
  }

  @Delete('favorites/:productId')
  removeFavorite(
    @CurrentUser() user: JwtUser,
    @Param('productId') productId: number,
  ) {
    return this.svc.removeFavorite(user.sub, productId);
  }

  /** Órdenes */
  @Get('orders')
  listOrders(@CurrentUser() user: JwtUser) {
    // 🔧 CORRECCIÓN: Usar OrdersService para obtener órdenes con items completos
    // En lugar de this.svc.listOrders que solo devuelve resumen sin items
    return this.ordersService.getUserOrders(user.sub);
  }

  /** Mis cursos (inscripciones) */
  @Get('enrollments')
  listEnrollments(@CurrentUser() user: JwtUser) {
    return this.svc.listEnrollments(user.sub);
  }

  /** Actualizar progreso de lección */
  @Post('enrollments/progress')
  updateLessonProgress(
    @CurrentUser() user: JwtUser,
    @Body() dto: UpdateLessonProgressDto,
  ) {
    return this.svc.updateLessonProgress(user.sub, dto);
  }
}
