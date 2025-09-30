import { Module } from '@nestjs/common';
import { CallGateway } from './call.gateway';
import { CallService } from './call.service';

@Module({
  providers: [CallGateway, CallService]
})
export class CallModule {}
