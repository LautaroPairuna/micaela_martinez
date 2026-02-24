import { Module, Global } from '@nestjs/common';
import { RevalidationService } from './revalidation.service';

@Global()
@Module({
  providers: [RevalidationService],
  exports: [RevalidationService],
})
export class CommonServicesModule {}
