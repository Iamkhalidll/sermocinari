import { Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { PrismaService } from 'src/prisma/prisma.service';
import { createGroup } from './group-message.service';

@Injectable()
export class GroupMessageRepository {
    constructor(private readonly prisma: PrismaService) { }
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
        const participants: { userId: string; role: 'ADMIN' | 'MEMBER' }[] = [];
        participants.push({
            userId,
            role: 'ADMIN',
        });
        if (createGroup.members && createGroup.members.length > 0) {
            for (const memberId of createGroup.members) {
                if (memberId !== userId) {
                    participants.push({
                        userId: memberId,
                        role: 'MEMBER',
                    });
                }
            }
        }
        const newGroup = await this.prisma.conversation.create({
            data: {
                type: 'GROUP',
                name: createGroup.name,
                description: createGroup.description,
                participants: {
                    create: participants,
                },
            },
            include: {
                participants: true,
            },
        });
        return newGroup.id
    }

    async addMember(groupId: string, memberId: string) {
        const existingMember = await this.prisma.conversationParticipant.findFirst({
            where: {
                conversationId: groupId,
                userId: memberId
            }
        });

        if (existingMember) {
            throw new WsException("User is already a member of this group");
        }

        await this.prisma.conversationParticipant.create({
            data: {
                conversationId: groupId,
                userId: memberId,
                role: 'MEMBER'
            }
        });
    }

    async getGroupMembers(groupId: string) {
        return await this.prisma.conversationParticipant.findMany({
            where: {
                conversationId: groupId
            }
        });
    }

    async saveMessage(userId:string,groupId:string,content:string){
        const group = await this.prisma.conversation.findFirst({
            where:{
                id:groupId,
                participants:{
                    some:{
                        userId
                    }
                }
            }
        })
        if(!group){
            throw new WsException("Group doesn't exist or User isn't in group")
        }
        return  await this.prisma.message.create({
            data:{
                senderId:userId,
                conversationId:groupId,
                content
            }
        })
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
    return await this.prisma.conversationParticipant.findMany({
        where: {
            userId,
            conversation: {
                type: 'GROUP'
            }
        },
        select: {
            conversationId: true
        }
    });
}
    async markAsRead(messageId: string, userId: string) {
        const message = await this.prisma.message.findFirst({
            where: {
                id: messageId,
                conversation: {
                    participants: {
                        some: { userId }
                    }
                }
            }
        });

        if (!message) {
            throw new WsException("Message not found or user not in conversation");
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