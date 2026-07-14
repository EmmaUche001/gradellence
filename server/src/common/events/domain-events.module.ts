import { Global, Module } from '@nestjs/common';
import { DomainEventsService } from './domain-events.service';

/**
 * @Global() so any module can inject DomainEventsService without adding an
 * explicit import — consistent with how PrismaModule/PrismaService is
 * already made available across this codebase.
 */
@Global()
@Module({
  providers: [DomainEventsService],
  exports: [DomainEventsService],
})
export class DomainEventsModule {}
