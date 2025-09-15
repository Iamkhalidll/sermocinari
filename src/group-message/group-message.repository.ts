import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Conversation, Message } from '@prisma/client';
import { createGroup } from './group-message.service';

@Injectable()
export class GroupMessageRepository {
    constructor(private readonly prisma: PrismaService) { }
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
}