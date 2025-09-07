import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger
} from '@nestjs/common';
import { DirectMessageRepository } from './direct-message.repository';

@Injectable()
export class DirectMessageService {
    private readonly logger = new Logger(DirectMessageService.name)
    constructor(
        private readonly directMessageRepository: DirectMessageRepository,
    ) {}
    async connect(userId:string,socketId:string):Promise<void> {
        await this.directMessageRepository.connect(userId,socketId)
        this.logger.log("User has connected  ")
    }
    async disconnect(socketId:string):Promise<void>{
        await this.directMessageRepository.disconnect(socketId);
        this.logger.log("User has disconnected")
    }

    async startConversation(
        fromUserId: string,
        toUserId: string,
    ): Promise<string> {
        try {
            const roomId = await this.directMessageRepository.findOrCreateConversation(
                fromUserId,
                toUserId,
            );
            if (!roomId) {
                throw new BadRequestException('Could not find or create room');
            }
            return roomId;
        } catch (error) {
            this.logger.log(error);
            throw new InternalServerErrorException();
        }
    }
    async getUserSockets(userId: string) {
    try {
        return await this.directMessageRepository.getActiveSessionforUser(userId);
    } catch (error) {
        this.logger.error(error);
        throw new InternalServerErrorException('Could not fetch user sessions');
    }
}
    async markAsDelivered(messageId:string){
        await this.directMessageRepository.markAsDelivered(messageId)
    }
    async getUserConversations(userId:string){
        return await this.directMessageRepository.findUserConversations(userId)
    }
    async getPendingMessage(recipientId:string){
        return await this.directMessageRepository.getPendingMessage(recipientId);
    }
    async sendTextMessage(
        conversationId: string,
        senderId: string,
        content: string,
    ) {
        try {
            const message = await this.directMessageRepository.createTextMessage(
                conversationId,
                senderId,
                content,
            );
            return message;
        } catch (error) {
            this.logger.log(error);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Could not send message');
        }
    }

}
