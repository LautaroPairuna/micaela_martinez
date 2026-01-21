import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { createPool } from 'mariadb';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is not defined');
    }

    // Asegurar compatibilidad con driver mariadb
    // Prisma usa schema=public pero mariadb driver no lo necesita en query params para conexión básica
    const connectionString = databaseUrl.includes('?')
      ? databaseUrl.split('?')[0]
      : databaseUrl;

    const pool = createPool(connectionString);
    const adapter = new PrismaMariaDb(pool as any);

    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
