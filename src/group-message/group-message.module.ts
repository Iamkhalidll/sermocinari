import { Module } from '@nestjs/common';
import { GroupMessageService } from './group-message.service';
import { GroupMessageGateway } from './group-message.gateway';

@Module({
  providers: [GroupMessageService, GroupMessageGateway]
})
export class GroupMessageModule {}
