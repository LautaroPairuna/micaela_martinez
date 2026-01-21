import { Global, Module, OnModuleDestroy, OnModuleInit, Inject, Injectable } from '@nestjs/common';
import { PRISMA } from './prisma.token';
import { createExtendedClient, type ExtendedPrismaClient } from './prisma.extensions';

@Injectable()
class PrismaLifecycle implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(PRISMA) private readonly prisma: ExtendedPrismaClient) {}

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}

@Global()
@Module({
  providers: [
    {
      provide: PRISMA,
      useFactory: () => createExtendedClient(),
    },
    PrismaLifecycle,
  ],
  exports: [PRISMA],
})
export class PrismaModule {}
