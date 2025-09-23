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
import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';
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
  @IsString()
  id?: string;

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
  @IsString({ message: 'productoId debe ser un string válido' })
  productoId!: string;
}

class UpdateLessonProgressDto {
  @IsString()
  enrollmentId!: string;

  @IsString()
  moduleId!: string;

  @IsString()
  lessonId!: string;

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
  deleteAddress(@CurrentUser() user: JwtUser, @Param('id') id: string) {
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
    @Param('productId') productId: string,
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
