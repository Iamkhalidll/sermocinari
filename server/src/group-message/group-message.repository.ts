import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class GroupMessageRepository {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async saveMessage(userId: string, groupId: string, content: string) {
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
    
    async findMessageById(messageId: string) {
        return await this.prisma.message.findFirst({
            where: {
                id: messageId,
            }
        });
    }

    async markAsRead(messageId: string) {
        return await this.prisma.message.update({
            where: { id: messageId },
            data: {
                isRead: true,
                readAt: new Date()
            }
        });
    }
}