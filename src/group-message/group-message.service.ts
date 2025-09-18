import { Injectable, Logger } from '@nestjs/common';
import { GroupMessageRepository } from './group-message.repository';
import { WsException } from '@nestjs/websockets';

export interface createGroup { name: string, description: string, members?: string[] }

@Injectable()
export class GroupMessageService {
    private readonly logger = new Logger(GroupMessageService.name)
    constructor(
        private readonly groupMessageRepository: GroupMessageRepository
    ) { }
    async getUserSession(userId: string) {
        try {
            return await this.groupMessageRepository.getActiveSessionforUser(userId)
        } catch (error) {
            if (error instanceof WsException) {
                throw error;
            }
            throw new WsException(error.message || 'An unexpected error occurred')
        }
    }
    async createGroup(userId: string, createGroup: createGroup) {
        try {
            return await this.groupMessageRepository.createGroup(userId, createGroup);
        } catch (error) {
            this.logger.error(error)
            if (error instanceof WsException) {
                throw error;
            }
            throw new WsException(error.message || 'An unexpected error occurred');
        }
    }
    async addMember(groupId: string, memberId: string) {
        try {
            return await this.groupMessageRepository.addMember(groupId, memberId);
        } catch (error) {
            this.logger.error(error)
            if (error instanceof WsException) {
                throw error;
            }
            throw new WsException(error.message || 'An unexpected error occurred');
        }
    }
    async getGroupMembers(groupId: string) {
        try {
            return await this.groupMessageRepository.getGroupMembers(groupId);
        } catch (error) {
            this.logger.error(error)
            if (error instanceof WsException) {
                throw error;
            }
            throw new WsException(error.message || 'An unexpected error occurred');
        }
    }
    async saveMessage(userId: string, groupId: string, content: string) {
        try {
            return await this.groupMessageRepository.saveMessage(userId, groupId, content)
        }
        catch (error) {
            this.logger.error(error)
            if (error instanceof WsException) {
                throw error
            }
            throw new WsException(error.message || `An unexpected error occured`)
        }
    }
    async markAsDelivered(messageId: string) {
        try {
            return await this.groupMessageRepository.markAsDelivered(messageId);
        } catch (error) {
            this.logger.error(error)
            if (error instanceof WsException) {
                throw error;
            }
            throw new WsException(error.message || 'An unexpected error occurred');
        }
    }
    async markAsRead(messageId: string, userId: string) {
        try {
            return await this.groupMessageRepository.markAsRead(messageId, userId);
        } catch (error) {
            this.logger.error(error)
            if (error instanceof WsException) {
                throw error;
            }
            throw new WsException(error.message || 'An unexpected error occurred');
        }
    }
    async getUserGroups(userId: string) {
    try {
        return await this.groupMessageRepository.getUserGroups(userId);
    } catch (error) {
        this.logger.error(error)
        if (error instanceof WsException) {
            throw error;
        }
        throw new WsException(error.message || 'An unexpected error occurred');
    }
}
}