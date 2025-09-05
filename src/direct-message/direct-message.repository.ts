import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Message } from '@prisma/client';

@Injectable()
export class DirectMessageRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findOrCreateConversation(
        userId1: string,
        userId2: string,
    ): Promise<string> {
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
        
        const directConversation = conversations.find(c => c._count.participants === 2);

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
            throw new BadRequestException(
                `Conversation not found: ${conversationId}`,
            );
        }

        const recipient = conversation.participants.find(p => p.userId !== senderId);

        if (!recipient) {
            throw new Error(
                'Could not find a recipient in the conversation.',
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

    async getConversationId(
        fromUserId: string,
        toUserId: string,
    ): Promise<string> {
        const conversationId = await this.findOrCreateConversation(
            fromUserId,
            toUserId,
        );
        return conversationId;
    }
}
