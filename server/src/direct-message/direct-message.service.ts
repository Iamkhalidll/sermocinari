import {
    Injectable,
    Logger
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { DirectMessageRepository } from './direct-message.repository';

@Injectable()
export class DirectMessageService {
    private readonly logger = new Logger(DirectMessageService.name)
    constructor(
        private readonly directMessageRepository: DirectMessageRepository,
    ) {}
    async startConversation(
        fromUserId: string,
        toUserId: string,
    ): Promise<string> {
        try {
            const roomId = await this.directMessageRepository.findOrCreateConversation(
                fromUserId,
                toUserId,
            );
            if (!roomId) {
                throw new WsException('Could not find or create room');
            }
            return roomId;
        } catch (error) {
            this.logger.log(error);
            if (error instanceof WsException) {
                throw error;
            }
            throw new WsException('An unexpected error occurred');
        }
    }
    async getUserSockets(userId: string) {
        try {
            return await this.directMessageRepository.getActiveSessionforUser(userId);
        } catch (error) {
            this.logger.error(error);
            if (error instanceof WsException) {
                throw error;
            }
            throw new WsException('Could not fetch user sessions');
        }
    }
    async markAsDelivered(messageId:string){
        await this.directMessageRepository.markAsDelivered(messageId)
    }
    async getUserConversations(userId:string){
        return await this.directMessageRepository.findUserConversations(userId)
    }
    async markAsRead(messageId: string, userId: string) {
    try {
        return await this.directMessageRepository.markAsRead(messageId, userId);
    } catch (error) {
        this.logger.error(error);
        if (error instanceof WsException) {
            throw error;
        }
        throw new WsException('An unexpected error occurred');
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
            this.logger.log(error);
            if (error instanceof WsException) {
                throw error;
            }
            throw new WsException('Could not send message');
        }
    }
}