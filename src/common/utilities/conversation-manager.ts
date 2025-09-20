import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Conversation, Prisma ,GroupRole} from '@prisma/client';

export type ConversationType = 'DIRECT' | 'GROUP';

@Injectable()
export class ConversationManager {
    private readonly logger = new Logger(ConversationManager.name);

    constructor(private readonly prisma: PrismaService) {}

    async findOrCreateDirectConversation(userId1: string, userId2: string): Promise<string> {
        if (userId1 === userId2) {
            throw new BadRequestException("Users cannot start a conversation with themselves.");
        }

        const conversations = await this.prisma.conversation.findMany({
            where: {
                type: 'DIRECT',
                AND: [
                    { participants: { some: { userId: userId1 } } },
                    { participants: { some: { userId: userId2 } } },
                ],
            },
            include: {
                _count: { select: { participants: true } },
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

        this.logger.log(`Created new direct conversation: ${newConversation.id} between users ${userId1} and ${userId2}`);
        return newConversation.id;
    }

    async createGroupConversation(creatorId: string, participantIds: string[], name?: string, description?: string): Promise<string> {
        const allParticipants = [creatorId, ...participantIds.filter(id => id !== creatorId)];
        
        if (allParticipants.length < 2) {
            throw new BadRequestException("Group conversation must have at least 2 participants.");
        }

        const participants = allParticipants.map(userId => ({
            role: userId === creatorId ? GroupRole.ADMIN : GroupRole.MEMBER,
            user: { connect: { id: userId } },
        }));
        const newConversation = await this.prisma.conversation.create({
            data: {
                type: 'GROUP',
                name,
                description,
                participants: {
                    create: participants,
                },
            },
        });

        this.logger.log(`Created new group conversation: ${newConversation.id} with ${allParticipants.length} participants`);
        return newConversation.id;
    }

    async getUserConversations(userId: string, type?: ConversationType): Promise<Conversation[]> {
        const whereClause: Prisma.ConversationWhereInput = {
            participants: { some: { userId } }
        };

        if (type) {
            whereClause.type = type;
        }

        return await this.prisma.conversation.findMany({
            where: whereClause,
            include: {
                participants: {
                    include: { user: { select: { id: true, isOnline: true } } }
                },
                _count: { select: { messages: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async addParticipantToGroup(conversationId: string, userId: string): Promise<void> {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true }
        });

        if (!conversation) {
            throw new BadRequestException(`Conversation not found: ${conversationId}`);
        }

        if (conversation.type !== 'GROUP') {
            throw new BadRequestException("Can only add participants to group conversations");
        }

        const existingParticipant = conversation.participants.find(p => p.userId === userId);
        if (existingParticipant) {
            throw new BadRequestException("User is already a participant in this conversation");
        }

        await this.prisma.conversationParticipant.create({
            data: {
                conversationId,
                userId,
                role: 'MEMBER'
            }
        });

        this.logger.log(`Added user ${userId} to group conversation ${conversationId}`);
    }

    async removeParticipantFromGroup(conversationId: string, userId: string): Promise<void> {
        const conversation = await this.prisma.conversation.findUnique({
            where: { id: conversationId },
            include: { participants: true }
        });

        if (!conversation) {
            throw new BadRequestException(`Conversation not found: ${conversationId}`);
        }

        if (conversation.type !== 'GROUP') {
            throw new BadRequestException("Can only remove participants from group conversations");
        }

        await this.prisma.conversationParticipant.delete({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            }
        });

        this.logger.log(`Removed user ${userId} from group conversation ${conversationId}`);
    }

    async getConversationParticipants(conversationId: string): Promise<string[]> {
        const participants = await this.prisma.conversationParticipant.findMany({
            where: { conversationId },
            select: { userId: true }
        });

        return participants.map(p => p.userId);
    }

    async isUserInConversation(conversationId: string, userId: string): Promise<boolean> {
        const participant = await this.prisma.conversationParticipant.findUnique({
            where: {
                conversationId_userId: {
                    conversationId,
                    userId
                }
            }
        });

        return !!participant;
    }
}