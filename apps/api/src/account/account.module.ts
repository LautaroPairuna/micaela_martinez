import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@Module({
  imports: [PassportModule],
  controllers: [AccountController], // → expone /users/me
  providers: [AccountService, PrismaService, JwtAuthGuard],
  exports: [AccountService],
})
export class AccountModule {}
