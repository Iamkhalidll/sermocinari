import { Injectable } from '@nestjs/common';
import { DirectMessageRepository } from './direct-message.repository';
@Injectable()
export class DirectMessageService {
    constructor(
        private readonly directMessageRepository: DirectMessageRepository
    ) {}
    async sendTextMessage(fromUserId: string, toUserId: string, message: string): Promise<void> {
        await this.directMessageRepository.saveTextMessage(fromUserId, toUserId, message);
    }
}
