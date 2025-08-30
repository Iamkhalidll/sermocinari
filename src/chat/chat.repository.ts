import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
@Injectable()
export class ChatRepository {
    constructor(
    private prisma: PrismaService,
    ) {}
async createSession(userId: string, socketId: string):Promise<void> {
    await this.prisma.session.create({data: { userId, socketId }});
}

async removeSessionBySocketId(socketId: string):Promise<void> {
    await this.prisma.session.deleteMany({where: { socketId }});
}}
