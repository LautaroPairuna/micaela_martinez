// apps/api/src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PRISMA } from './prisma.token';
import { createExtendedClient } from './prisma.extensions';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      useFactory: () => {
        return createExtendedClient();
      },
    },
    {
      provide: PrismaService,
      useExisting: PRISMA,
    },
  ],
  exports: [PRISMA, PrismaService],
})
export class PrismaModule {}
