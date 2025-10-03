import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CallType, CallStatus } from '@prisma/client';

@Injectable()
export class CallRepository {
    constructor(
        private readonly prisma: PrismaService,
    ) { }

    async verifyUser(userId: string): Promise<boolean> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        return !!user;
    }

    async initiateCall(
        callerId: string,
        type: CallType,
        conversationId: string
    ): Promise<string> {
        const call = await this.prisma.call.create({
            data: {
                initiatorId: callerId,
                type,
                conversationId,
                status: CallStatus.INITIATED,
            }
        });
        return call.id;
    }

    async acceptCall(callId: string, acceptorId: string): Promise<void> {
        await this.prisma.call.update({
            where: { id: callId },
            data: {
                status: CallStatus.ACTIVE
            }
        });

        await this.prisma.callParticipant.create({
            data: {
                callId,
                userId: acceptorId,
            }
        });
    }

    async endCall(callId: string): Promise<void> {
        await this.prisma.call.update({
            where: { id: callId },
            data: {
                status: CallStatus.ENDED,
                endedAt: new Date(),
            }
        });
    }

    async getCall(callId: string) {
        return await this.prisma.call.findUnique({
            where: { id: callId },
            include: {
                participants: true,
                initiator: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    }
                },
                conversation: {
                    include: {
                        participants: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        avatar: true,
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
    }

    async getCallsByConversation(conversationId: string) {
        return await this.prisma.call.findMany({
            where: { conversationId },
            include: {
                participants: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                avatar: true,
                            }
                        }
                    }
                },
                initiator: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    }
                }
            },
            orderBy: {
                startedAt: 'desc'
            }
        });
    }
}