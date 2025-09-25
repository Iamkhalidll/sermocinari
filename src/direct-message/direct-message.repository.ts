import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from 'src/prisma/prisma.service';
import { Message } from '@prisma/client';
import { ConversationManager } from '../common/utilities/conversation-manager';
import { SessionService } from '../session/session.service';

@Injectable()
export class DirectMessageRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly conversationManager: ConversationManager,
        private readonly sessionService: SessionService
    ) { }

    async getActiveSessionforUser(userId: string) {
        const user = await this.getUser(userId);
        if (!user) {
            throw new WsException("No such User");
        }
        return await this.sessionService.getUserSessions(userId);
       
    }

    async getUser(id: string) {
        const user = await this.prisma.user.findFirst({
            where: { id }
        });
        return user;
    }

    async findOrCreateConversation(userId1: string, userId2: string): Promise<string> {
        return await this.conversationManager.findOrCreateDirectConversation(userId1, userId2);
    }

    async findUserConversations(userId: string) {
        return await this.conversationManager.getUserConversations(userId, 'DIRECT');
    }

    async markAsDelivered(id: string): Promise<void> {
        await this.prisma.message.update({
            where: { id },
            data: {
                isDelivered: true,
                deliveredAt: new Date()
            }
        });
    }

    async createTextMessage(
        conversationId: string,
        senderId: string,
        content: string,
    ): Promise<Message> {
        const isUserInConversation = await this.conversationManager.isUserInConversation(conversationId, senderId);
        if (!isUserInConversation) {
            throw new WsException('User is not part of this conversation');
        }

        const participants = await this.conversationManager.getConversationParticipants(conversationId);
        const recipientId = participants.find(id => id !== senderId);

        if (!recipientId) {
            throw new WsException('Conversation does not have a valid recipient.');
        }

        const message = await this.prisma.message.create({
            data: {
                content,
                conversationId,
                senderId,
                recipientId,
                type: 'TEXT',
            },
            include: {
                sender: {
                    select: {
                        id: true,
                    },
                },
            },
        });
        return message;
    }

    async markAsRead(messageId: string, userId: string) {
        const message = await this.prisma.message.findFirst({
            where: {
                id: messageId,
                recipientId: userId
            }
        });

        if (!message) {
            throw new WsException("Message not found or user is not the recipient");
        }

        return await this.prisma.message.update({
            where: { id: messageId },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });
    }
}