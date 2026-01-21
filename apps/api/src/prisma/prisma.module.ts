import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { createExtendedClient } from './prisma.extensions';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useFactory: async () => {
        const client = createExtendedClient();
        await client.$connect();

        // Hook para graceful shutdown en NestJS
        (client as any).onModuleDestroy = async () => {
          await client.$disconnect();
        };

        return client;
      },
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
