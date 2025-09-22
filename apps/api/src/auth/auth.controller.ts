// src/auth/auth.controller.ts
import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtUser } from './types/jwt-user';
import { AccountService } from '../account/account.service';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

class RegisterDto {
  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly account: AccountService, // para /auth/me
  ) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    // dto.email y dto.password son string (no undefined) gracias a los DTOs
    return this.auth.loginWithEmailPassword(dto.email, dto.password);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.email, dto.nombre ?? null, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@CurrentUser() user: JwtUser) {
    // Perfil completo (roles, emailVerificado, etc.)
    return this.account.getMe(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refresh(@CurrentUser() user: JwtUser) {
    return this.auth.refreshTokens(user.sub);
  }
}
