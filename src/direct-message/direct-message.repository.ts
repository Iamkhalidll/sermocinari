import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Message } from '@prisma/client';

@Injectable()
export class DirectMessageRepository {
    constructor(private readonly prisma: PrismaService) { }
    async createSession(socketId: string, userId: string) {
        await this.prisma.session.create({
            data: {
                socketId,
                userId
            }
        })
    }

    async updateOnlineStatus(id: string) {
        await this.prisma.user.update({
            where: { id },
            data: {
                isOnline: true,
                lastSeen: new Date()
            }
        })
    }

    async connect(userId: string, socketId: string) {
        return this.prisma.$transaction(async (tx) => {
            const session = await tx.session.create({
                data: { socketId, userId }
            });

            await tx.user.update({
                where: { id: userId },
                data: {
                    isOnline: true,
                    lastSeen: new Date(),
                },
            });

            return session;
        });
    }


    async disconnect(id: string) {
        const session = await this.prisma.session.delete({
            where: {
                id
            }
        })
        const activeSessions = await this.prisma.session.findMany({
            where: {
                userId: session.userId
            }
        })
        if (activeSessions.length == 0) {
            await this.prisma.user.update({
                where: {
                    id: session.id
                },
                data: {
                    isOnline: false,
                    lastSeen: new Date()
                }
            })
        }
    }
    async getActiveSessionforUser(userId: string) {
        const user = await this.getUser(userId)
        if (!user) {
            throw new BadRequestException("No such User")
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
            throw new BadRequestException("Users cannot start a conversation with themselves.");
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
            throw new BadRequestException(
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
}
