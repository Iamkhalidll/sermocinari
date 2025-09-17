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
}