import {
    Injectable,
    Logger
} from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { DirectMessageRepository } from './direct-message.repository';
import { ConversationManager } from '../common/utilities/conversation-manager';

@Injectable()
export class DirectMessageService {
    private readonly logger = new Logger(DirectMessageService.name)
    constructor(
        private readonly directMessageRepository: DirectMessageRepository,
        private readonly conversationManager: ConversationManager,
    ) { }
    private handleError(error: unknown, contextMessage: string): never {
        this.logger.error(error);
        if (error instanceof WsException) {
            throw error;
        }
        throw new WsException(contextMessage);
    }

    async startConversation(
        fromUserId: string,
        toUserId: string,
    ): Promise<string> {
        try {
            const roomId = await this.conversationManager.findOrCreateDirectConversation(
                fromUserId,
                toUserId,
            );
            if (!roomId) {
                throw new WsException('Could not find or create room');
            }
            return roomId;
        } catch (error) {
            this.handleError(error, 'An unexpected error occurred');
        }
    }

    async getUserSockets(userId: string) {
        try {
            return await this.directMessageRepository.getActiveSessionforUser(userId);
        } catch (error) {
            this.handleError(error, 'Could not fetch user sessions');
        }
    }

    async markAsDelivered(messageId: string) {
        await this.directMessageRepository.markAsDelivered(messageId)
    }

    async getUserConversations(userId: string) {
        return await this.conversationManager.getUserConversations(userId, 'DIRECT');
    }

    async markAsRead(messageId: string, userId: string) {
        try {
            return await this.directMessageRepository.markAsRead(messageId, userId);
        } catch (error) {
            this.handleError(error, 'An unexpected error occurred');
        }
    }

    async sendTextMessage(
        conversationId: string,
        senderId: string,
        content: string,
    ) {
        try {
            const isUserInConversation = await this.conversationManager.isUserInConversation(conversationId, senderId);
            if (!isUserInConversation) {
                throw new WsException('User is not part of this conversation');
            }
            const participants = await this.conversationManager.getConversationParticipants(conversationId);
            const recipientId = participants.find(id => id !== senderId);

            if (!recipientId) {
                throw new WsException('Conversation does not have a valid recipient.');
            }

            const message = await this.directMessageRepository.createTextMessage(
                conversationId,
                senderId,
                recipientId,
                content,
            );
            return message;
        } catch (error) {
            this.handleError(error, 'Could not send message');
        }
    }

    async verifyUserAndGetRecipient(conversationId: string, userId: string): Promise<string> {
        try {
            if (!(await this.conversationManager.isUserInConversation(conversationId, userId))) {
                throw new WsException('User is not part of this conversation');
            }

            const participants = await this.conversationManager.getConversationParticipants(conversationId);
            const recipient = participants.filter(id => id !== userId);

            if (recipient.length !== 1) {
                throw new WsException('Conversation format error: expecting exactly one recipient.');
            }
            return recipient[0];
        } catch (error) {
            this.handleError(error, 'Could not verify user or find recipient');
        }
    }
}