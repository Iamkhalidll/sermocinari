import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Conversation, Message } from '@prisma/client';

@Injectable()
export class GroupMessageRepository {
    constructor(private readonly prisma: PrismaService) { }
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
}