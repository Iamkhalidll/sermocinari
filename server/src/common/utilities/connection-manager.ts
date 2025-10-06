import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthenticatedSocket } from '../middleware/ws-auth.middleware';
import { ConversationManager } from './conversation-manager';
import { SessionService } from '../../session/session.service';

export type ConversationType = 'DIRECT' | 'GROUP';

@Injectable()
export class ConnectionManager {
    private readonly logger = new Logger(ConnectionManager.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly conversationManager: ConversationManager,
        private readonly sessionService: SessionService
    ) {}

    async connect(client: AuthenticatedSocket, conversationType: ConversationType) {
        try {
            await this.createSessionAndUpdateStatus(client.user.id, client.id, conversationType);
            await this.deliverPendingMessages(client);
            await this.joinUserConversations(client, conversationType);
            
            this.logger.log(`Client connected: ${client.id}, User ID: ${client.user.id}, Type: ${conversationType}`);
        } catch (error) {
            this.logger.error(`Connection failed: ${error.message}`);
            client.emit('unauthorized', { message: 'Authentication failed' });
            throw error;
        }
    }

    async disconnect(socketId: string) {
        try {
            const session = await this.sessionService.getSession(socketId);
            if (!session) {
                this.logger.warn(`Session not found for socket: ${socketId}`);
                return;
            }
            await this.sessionService.removeSession(socketId);
            const hasActiveSessions = await this.sessionService.hasActiveSessions(session.userId);

            if (!hasActiveSessions) {
                await this.prisma.user.update({
                    where: { id: session.userId },
                    data: {
                        isOnline: false,
                        lastSeen: new Date()
                    }
                });
            }

            this.logger.log(`Client disconnected: ${socketId}, User ID: ${session.userId}`);
        } catch (error) {
            this.logger.error(`Disconnect failed: ${error.message}`);
        }
    }

    private async deliverPendingMessages(client: AuthenticatedSocket) {
        const unDeliveredMessages = await this.prisma.message.findMany({
            where: {
                recipientId: client.user.id,
                isDelivered: false
            }
        });
        
        if (unDeliveredMessages?.length > 0) {
            for (const message of unDeliveredMessages) {
                client.emit("new-direct-message", message);
                await this.prisma.message.update({
                    where: { id: message.id },
                    data: {
                        isDelivered: true,
                        deliveredAt: new Date()
                    }
                });
            }
            this.logger.log(`Delivered ${unDeliveredMessages.length} pending messages to user ${client.user.id}`);
        }
    }

    private async createSessionAndUpdateStatus(userId: string, socketId: string, conversationType: ConversationType) {
        await this.sessionService.createSession(userId, socketId, conversationType);
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                isOnline: true,
                lastSeen: new Date(),
            },
        });

        return { socketId, userId };
    }

    private async joinUserConversations(client: AuthenticatedSocket, conversationType: ConversationType) {
        const conversations = await this.conversationManager.getUserConversations(client.user.id, conversationType);
        
        if (conversations.length > 0) {
            for (const conversation of conversations) {
                await client.join(conversation.id);
            }
            this.logger.log(`User ${client.user.id} joined ${conversations.length} ${conversationType.toLowerCase()} conversations`);
        }
    }
}