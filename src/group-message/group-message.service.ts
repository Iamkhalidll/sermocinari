import { Injectable, Logger } from '@nestjs/common';
import { GroupMessageRepository } from './group-message.repository';
import { WsException } from '@nestjs/websockets';


export interface createGroup{name:string,description:string,members?:string[]}
@Injectable()
export class GroupMessageService {
    private readonly logger = new Logger(GroupMessageService.name)
    constructor(
        private readonly groupMessageRepository:GroupMessageRepository
    ){}
     async createGroup(userId:string,createGroup:createGroup){
       try {
        return await this.groupMessageRepository.createGroup(userId,createGroup);
       } catch (error) {
        this.logger.error(error)
        throw new WsException(error.message || 'An unexpected error occurred');
       }     
    }
}
