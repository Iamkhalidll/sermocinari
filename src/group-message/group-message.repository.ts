import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConversationManager } from '../common/utilities/conversation-manager';
import { createGroup } from './group-message.service';

@Injectable()
export class GroupMessageRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly conversationManager: ConversationManager
    ) { }

    async getActiveSessionforUser(userId: string) {
        const sessions = await this.prisma.session.findMany({
            where: {
                userId
            },
            orderBy: { createdAt: "desc" }
        })
        return sessions
    }

    async createGroup(userId: string, createGroup: createGroup) {
        const conversationId = await this.conversationManager.createGroupConversation(
            userId, 
            createGroup.members || [], 
            createGroup.name
        );
        return conversationId;
    }

    async addMember(groupId: string, memberId: string) {
        await this.conversationManager.addParticipantToGroup(groupId, memberId);
    }

    async getGroupMembers(groupId: string) {
        const participants = await this.conversationManager.getConversationParticipants(groupId);
        return participants.map(userId => ({ userId }));
    }

    async saveMessage(userId: string, groupId: string, content: string) {
        const isUserInGroup = await this.conversationManager.isUserInConversation(groupId, userId);
        if (!isUserInGroup) {
            throw new WsException("Group doesn't exist or User isn't in group");
        }

        return await this.prisma.message.create({
            data: {
                senderId: userId,
                conversationId: groupId,
                content
            }
        });
    }

    async markAsDelivered(messageId: string) {
        await this.prisma.message.update({
            where: { id: messageId },
            data: {
                isDelivered: true,
                deliveredAt: new Date()
            }
        });
    }

    async getUserGroups(userId: string) {
        const conversations = await this.conversationManager.getUserConversations(userId, 'GROUP');
        return conversations.map(conv => ({ conversationId: conv.id }));
    }

    async markAsRead(messageId: string, userId: string) {
        const message = await this.prisma.message.findFirst({
            where: {
                id: messageId,
            }
        });

        if (!message) {
            throw new WsException("Message not found");
        }

        const isUserInConversation = await this.conversationManager.isUserInConversation(message.conversationId, userId);
        if (!isUserInConversation) {
            throw new WsException("User not in conversation");
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