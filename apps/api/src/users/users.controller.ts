import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request as ExpressRequest } from 'express';
import { JwtUser } from '../auth/types/jwt-user';

// Definir la interfaz para el usuario autenticado
interface RequestWithUser extends ExpressRequest {
  user: JwtUser;
}

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // COMENTADO POR CONFLICTO: AccountController ya maneja GET /users/me
  // @UseGuards(JwtAuthGuard)
  // @Get('me')
  // @ApiOperation({ summary: 'Obtener perfil del usuario actual' })
  // @ApiResponse({ status: 200, description: 'Perfil obtenido correctamente' })
  // getProfile(@Request() req: RequestWithUser) {
  //   return this.usersService.findById(req.user.sub);
  // }

  @UseGuards(JwtAuthGuard)
  @Get('me/enrollments')
  @ApiOperation({ summary: 'Obtener inscripciones del usuario actual' })
  @ApiResponse({
    status: 200,
    description: 'Inscripciones obtenidas correctamente',
  })
  getEnrollments(@Request() req: RequestWithUser) {
    return this.usersService.findEnrollments(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/subscription')
  @ApiOperation({
    summary: 'Obtener información de suscripción del usuario actual',
  })
  @ApiResponse({
    status: 200,
    description: 'Información de suscripción obtenida correctamente',
  })
  getSubscriptionInfo(@Request() req: RequestWithUser) {
    return this.usersService.getSubscriptionInfo(req.user.sub);
  }
}
