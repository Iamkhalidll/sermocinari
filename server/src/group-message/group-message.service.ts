import { Injectable, Logger } from '@nestjs/common';
import { GroupMessageRepository } from './group-message.repository';
import { WsException } from '@nestjs/websockets';
import { ConversationManager } from 'src/common/utilities/conversation-manager';
import { SessionService } from 'src/session/session.service';

export interface createGroup { name: string, description: string, members?: string[] }

@Injectable()
export class GroupMessageService {
    private readonly logger = new Logger(GroupMessageService.name);

    constructor(
        private readonly groupMessageRepository: GroupMessageRepository,
        private readonly conversationManager: ConversationManager,
        private readonly sessionService: SessionService
    ) { }

    private handleError(error: any): never {
        this.logger.error(error);
        if (error instanceof WsException) {
            throw error;
        }
        throw new WsException(error.message || 'An unexpected error occurred');
    }

    async getUserSession(userId: string) {
        try {
            return await this.sessionService.getUserSessions(userId);
        } catch (error) {
            this.handleError(error);
        }
    }

    async createGroup(userId: string, createGroup: createGroup) {
        try {
            return await this.conversationManager.createGroupConversation(
                userId,
                createGroup.members || [],
                createGroup.name
            );
        } catch (error) {
            this.handleError(error);
        }
    }

    async addMember(groupId: string, memberId: string) {
        try {
            return await this.conversationManager.addParticipantToGroup(groupId, memberId);
        } catch (error) {
            this.handleError(error);
        }
    }

    async getGroupMembers(groupId: string) {
        try {
            const participants = await this.conversationManager.getConversationParticipants(groupId);
            return participants.map(userId => ({ userId }));
        } catch (error) {
            this.handleError(error);
        }
    }

    async saveMessage(userId: string, groupId: string, content: string) {
        try {
            const isUserInGroup = await this.conversationManager.isUserInConversation(groupId, userId);
            if (!isUserInGroup) {
                throw new WsException("Group doesn't exist or User isn't in group");
            }
            return await this.groupMessageRepository.saveMessage(userId, groupId, content);
        } catch (error) {
            this.handleError(error);
        }
    }

    async markAsDelivered(messageId: string) {
        try {
            return await this.groupMessageRepository.markAsDelivered(messageId);
        } catch (error) {
            this.handleError(error);
        }
    }

    async markAsRead(messageId: string, userId: string) {
        try {
            const message = await this.groupMessageRepository.findMessageById(messageId);
            if (!message) {
                throw new WsException("Message not found");
            }
    
            const isUserInConversation = await this.conversationManager.isUserInConversation(message.conversationId, userId);
            if (!isUserInConversation) {
                throw new WsException("User not in conversation");
            }

            return await this.groupMessageRepository.markAsRead(messageId);
        } catch (error) {
            this.handleError(error);
        }
    }

    async getUserGroups(userId: string) {
        try {
            const conversations = await this.conversationManager.getUserConversations(userId, 'GROUP');
            return conversations.map(conv => ({ conversationId: conv.id }));
        } catch (error) {
            this.handleError(error);
        }
    }

    async leaveGroup(userId: string, groupId: string) {
        try {
            return await this.conversationManager.removeParticipantFromGroup(groupId, userId);
        } catch (error) {
            this.handleError(error);
        }
    }
}
