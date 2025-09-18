import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from 'src/prisma/prisma.service';
import { Conversation, Message } from '@prisma/client';

@Injectable()
export class DirectMessageRepository {
    constructor(private readonly prisma: PrismaService) { }
    async getActiveSessionforUser(userId: string) {
        //Remove this get user logic user can't even access gateway without being logged in
        const user = await this.getUser(userId)
        if (!user) {
            throw new WsException("No such User")
        }
        const sessions = await this.prisma.session.findMany({
            where: {
                userId
            },
            orderBy: { createdAt: "desc" }
        })
        return sessions
    }
    async getUser(id: string) {
        const user = await this.prisma.user.findFirst({
            where: { id }
        })
        return user
    }
    async findOrCreateConversation(
        userId1: string,
        userId2: string,
    ): Promise<string> {
        if (userId1 === userId2) {
            throw new WsException("Users cannot start a conversation with themselves.");
        }

        const conversations = await this.prisma.conversation.findMany({
            where: {
                AND: [
                    { participants: { some: { userId: userId1 } } },
                    { participants: { some: { userId: userId2 } } },
                ],
            },
            include: {
                _count: {
                    select: { participants: true },
                },
            },
        });

        const directConversation = conversations.find(c => c.type === "DIRECT");

        if (directConversation) {
            return directConversation.id;
        }

        const newConversation = await this.prisma.conversation.create({
            data: {
                type: 'DIRECT',
                participants: {
                    create: [{ userId: userId1 }, { userId: userId2 }],
                },
            },
        });
        return newConversation.id;
        
    }
    async findUserConversations(userId: string): Promise<Conversation[]> {
        return await this.prisma.conversation.findMany({
            where: {
                participants: {
                    some: {
                        userId
                    }
                }
            }
        });
    }
    async markAsDelivered(id:string):Promise<void>{
        await this.prisma.message.update({
            where:{id},
            data:{
                isDelivered:true,
                deliveredAt:new Date()
            }
        })
    }

    async createTextMessage(
        conversationId: string,
        senderId: string,
        content: string,
    ): Promise<Message> {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true },
        });

        if (!conversation) {
            throw new WsException(
                `Conversation not found: ${conversationId}`,
            );
        }

        const recipient = conversation.participants.find(p => p.userId !== senderId);

        if (!recipient) {
            throw new WsException(
                'Conversation does not have a valid recipient.'
            );

        }

        const message = await this.prisma.message.create({
            data: {
                content,
                conversationId,
                senderId,
                recipientId: recipient.userId,
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