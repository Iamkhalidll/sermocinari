import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from 'src/prisma/prisma.service';
import { Message,MessageType } from '@prisma/client';
import { SessionService } from '../session/session.service'; 

@Injectable()
export class DirectMessageRepository {
    constructor(
        private readonly prisma: PrismaService,
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
        recipientId: string, 
        content: string,
    ): Promise<Message> {
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

    async createVoiceMessage(createdAt:Date,conversationId:string,senderId:string,recipientId:string, mediaUrl:string, duration:number, mimeType:string): Promise<Message> {
        return  await this.prisma.message.create({
            data:{
                conversationId,
                senderId,
                recipientId,
                mimeType,
                mediaUrl,
                duration,
                type:MessageType.AUDIO,
                createdAt
            }
        })
        
    }
}