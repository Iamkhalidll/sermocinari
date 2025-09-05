import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { DirectMessageRepository } from './direct-message.repository';

@Injectable()
export class DirectMessageService {
    constructor(
        private readonly directMessageRepository: DirectMessageRepository,
    ) {}

    async startConversation(
        fromUserId: string,
        toUserId: string,
    ): Promise<string> {
        try {
            const roomId = await this.directMessageRepository.getConversationId(
                fromUserId,
                toUserId,
            );
            if (!roomId) {
                throw new BadRequestException('Could not find or create room');
            }
            return roomId;
        } catch (error) {
            this.logError(error);
            throw new InternalServerErrorException();
        }
    }

    async sendTextMessage(
        conversationId: string,
        senderId: string,
        content: string,
    ) {
        try {
            const message = await this.directMessageRepository.createTextMessage(
                conversationId,
                senderId,
                content,
            );
            return message;
        } catch (error) {
            this.logError(error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Could not send message');
        }
    }

    private logError(error: any) {
        console.error(error);
    }
}
