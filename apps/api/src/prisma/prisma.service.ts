// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import {
  createExtendedClient,
  type ExtendedPrismaClient,
} from './prisma.extensions';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private client!: ExtendedPrismaClient;

  onModuleInit() {
    this.client = createExtendedClient();
    // “Pegamos” todos los delegates/métodos del client extendido a esta clase
    Object.assign(this, this.client);
  }

  async onModuleDestroy() {
    await this.client?.$disconnect();
  }
}

// Esto le enseña a TS que PrismaService “tiene” todo lo del cliente:
export interface PrismaService extends ExtendedPrismaClient {}
