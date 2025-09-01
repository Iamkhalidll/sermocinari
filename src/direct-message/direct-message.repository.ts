import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class DirectMessageRepository{
constructor(
    private readonly prisma: PrismaService
){}

    async findOrCreateConversation(userId1: string, userId2: string): Promise<string> {
        let conversation = await this.prisma.conversation.findFirst({
            where:{
                participants:{
                    every:{
                        userId: { in: [userId1, userId2] }
                    }
                }
            }
        })
    
        if(!conversation){
            conversation = await this.prisma.conversation.create({
                data:{
                    // messages:{
                    //     create:{
                    //         content: "Conversation started",
                    //         senderId: userId1,
                    //         recipientId: userId2,
                    //     }
                    // }
                    participants:{
                        createMany:{
                            data:[
                                { userId: userId1 },
                                { userId: userId2 }
                            ]
                    }
                    
                }
            }})
        }
        return conversation.id;
    }
    async saveTextMessage(fromUserId: string, toUserId: string, message: string): Promise<void> {
        const conversationId = await this.findOrCreateConversation(fromUserId, toUserId);
        await this.prisma.message.create({
            data:{
                conversationId,
                content: message,
                senderId: fromUserId,
                recipientId: toUserId,
            }
        })
    }

    
}