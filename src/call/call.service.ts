import { Injectable } from '@nestjs/common';
import { CallRepository } from './call.repository';
import { SessionService } from 'src/session/session.service';
import { ConversationManager } from 'src/common/utilities/conversation-manager';
import { WsException } from '@nestjs/websockets';
import { SessionData } from 'src/session/session.service';

@Injectable()
export class CallService {
    constructor(
        private readonly callRepository: CallRepository,
        private readonly sessionService: SessionService,
        private readonly conversationManager: ConversationManager
    ) {}

    async initiateCall(
        callerId: string, 
        calleeId: string, 
        callType: 'VOICE' | 'VIDEO'
    ): Promise<{ calleeSessions: SessionData[], callId: string }> {
        const calleeSessions = await this.sessionService.getUserSessions(calleeId);
        if (calleeSessions.length === 0) {
            throw new WsException('User is not online');
        }

        if (!await this.callRepository.verifyUser(calleeId)) {
            throw new WsException('Callee does not exist');
        }

        const conversationId = await this.conversationManager.findOrCreateDirectConversation(
            callerId, 
            calleeId
        );

        const callId = await this.callRepository.initiateCall(
            callerId, 
            callType, 
            conversationId
        );

        return { calleeSessions, callId };
    }

    async acceptCall(
        callId: string, 
        callerId: string, 
        acceptorId: string
    ): Promise<SessionData[]> {
        const callerSessions = await this.sessionService.getUserSessions(callerId);
        if (callerSessions.length === 0) {
            throw new WsException('Caller is not online');
        }

        if (!await this.callRepository.verifyUser(callerId)) {
            throw new WsException('Caller does not exist');
        }

        await this.callRepository.acceptCall(callId, acceptorId);

        return callerSessions;
    }

    async rejectCall(callId: string): Promise<void> {
        await this.callRepository.endCall(callId);
    }

    async endCall(callId: string): Promise<void> {
        await this.callRepository.endCall(callId);
    }

    async getUserSessions(userId: string): Promise<SessionData[]> {
        const sessions = await this.sessionService.getUserSessions(userId);
        if (sessions.length === 0) {
            throw new WsException('User is not online');
        }
        return sessions;
    }
}