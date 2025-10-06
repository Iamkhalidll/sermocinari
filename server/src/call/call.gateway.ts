import { SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket, WebSocketServer } from '@nestjs/websockets';
import { AuthenticatedSocket, WsAuthMiddleware } from '../common/middleware/ws-auth.middleware'
import { Server } from 'socket.io';
import { CallService } from './call.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway()
export class CallGateway {
  @WebSocketServer() server: Server; 
  
  constructor(
      private readonly wsAuthMiddleware: WsAuthMiddleware,
      private readonly callService: CallService,
      private readonly logger: Logger
  ) {}

  afterInit(server: Server) {
    server.use(this.wsAuthMiddleware.use);
  }

  @SubscribeMessage('initiate-call')
  async initiateCall(
      @MessageBody() payload: { calleeId: string, callType: 'VOICE' | 'VIDEO' },
      @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      const { calleeSessions, callId } = await this.callService.initiateCall(
        client.user.id, 
        payload.calleeId, 
        payload.callType
      );
      
      client.emit('call-initiated', { callId });
      
      for (const session of calleeSessions) {
        const calleeSocket = this.server.sockets.sockets.get(session.socketId);
        if (calleeSocket) {
          calleeSocket.emit('incoming-call', {
            callId,
            fromUserId: client.user.id,
            callType: payload.callType,
          });
        }
      }
      
      this.logger.log(`Call ${callId} initiated from ${client.user.id} to ${payload.calleeId}`);
    } catch (error) {
      this.logger.error(`Error initiating call: ${error.message}`);
      client.emit('call-error', { message: error.message });
    }
  }

  @SubscribeMessage('accept-call')
  async acceptCall(
      @MessageBody() payload: { callerId: string, callId: string },
      @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      const callerSessions = await this.callService.acceptCall(
        payload.callId, 
        payload.callerId, 
        client.user.id
      );
      
      for (const session of callerSessions) {
        const callerSocket = this.server.sockets.sockets.get(session.socketId);
        if (callerSocket) {
          callerSocket.emit('call-accepted', {
            callId: payload.callId,
            byUserId: client.user.id,
          });
        }
      }
      
      this.logger.log(`Call ${payload.callId} accepted by ${client.user.id}`);
    } catch (error) {
      this.logger.error(`Error accepting call: ${error.message}`);
      client.emit('call-error', { message: error.message });
    }
  }

  @SubscribeMessage('reject-call')
  async rejectCall(
      @MessageBody() payload: { callerId: string, callId: string },
      @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      await this.callService.rejectCall(payload.callId);
      const callerSessions = await this.callService.getUserSessions(payload.callerId);
      
      for (const session of callerSessions) {
        const callerSocket = this.server.sockets.sockets.get(session.socketId);
        if (callerSocket) {
          callerSocket.emit('call-rejected', {
            callId: payload.callId,
            byUserId: client.user.id,
          });
        }
      }
      
      this.logger.log(`Call ${payload.callId} rejected by ${client.user.id}`);
    } catch (error) {
      this.logger.error(`Error rejecting call: ${error.message}`);
      client.emit('call-error', { message: error.message });
    }
  }

  @SubscribeMessage('webrtc-offer')
  async handleWebRTCOffer(
      @MessageBody() payload: { toUserId: string, offer: RTCSessionDescriptionInit },
      @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      const receiverSessions = await this.callService.getUserSessions(payload.toUserId);
      
      for (const session of receiverSessions) {
        const receiverSocket = this.server.sockets.sockets.get(session.socketId);
        if (receiverSocket) {
          receiverSocket.emit('webrtc-offer', {
            fromUserId: client.user.id,
            offer: payload.offer,
          });
        }
      }
      
      this.logger.log(`WebRTC offer sent from ${client.user.id} to ${payload.toUserId}`);
    } catch (error) {
      this.logger.error(`Error handling WebRTC offer: ${error.message}`);
      client.emit('call-error', { message: error.message });
    }
  }

  @SubscribeMessage('webrtc-answer')
  async handleWebRTCAnswer(
      @MessageBody() payload: { toUserId: string, answer: RTCSessionDescriptionInit },
      @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      const receiverSessions = await this.callService.getUserSessions(payload.toUserId);
      
      for (const session of receiverSessions) {
        const receiverSocket = this.server.sockets.sockets.get(session.socketId);
        if (receiverSocket) {
          receiverSocket.emit('webrtc-answer', {
            fromUserId: client.user.id,
            answer: payload.answer,
          });
        }
      }
      
      this.logger.log(`WebRTC answer sent from ${client.user.id} to ${payload.toUserId}`);
    } catch (error) {
      this.logger.error(`Error handling WebRTC answer: ${error.message}`);
      client.emit('call-error', { message: error.message });
    }
  }

  @SubscribeMessage('ice-candidate')
  async handleICECandidate(
      @MessageBody() payload: { toUserId: string, candidate: RTCIceCandidateInit },
      @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      const receiverSessions = await this.callService.getUserSessions(payload.toUserId);
      
      for (const session of receiverSessions) {
        const receiverSocket = this.server.sockets.sockets.get(session.socketId);
        if (receiverSocket) {
          receiverSocket.emit('ice-candidate', {
            fromUserId: client.user.id,
            candidate: payload.candidate,
          });
        }
      }
      
      this.logger.debug(`ICE candidate sent from ${client.user.id} to ${payload.toUserId}`);
    } catch (error) {
      this.logger.error(`Error handling ICE candidate: ${error.message}`);
      client.emit('call-error', { message: error.message });
    }
  }

  @SubscribeMessage('end-call')
  async handleEndCall(
      @MessageBody() payload: { otherUserId: string, callId: string },
      @ConnectedSocket() client: AuthenticatedSocket
  ) {
    try {
      await this.callService.endCall(payload.callId);
      
      const otherUserSessions = await this.callService.getUserSessions(payload.otherUserId);
      
      for (const session of otherUserSessions) {
        const otherSocket = this.server.sockets.sockets.get(session.socketId);
        if (otherSocket) {
          otherSocket.emit('call-ended', {
            callId: payload.callId,
            byUserId: client.user.id,
          });
        }
      }
      
      this.logger.log(`Call ${payload.callId} ended by ${client.user.id}`);
    } catch (error) {
      this.logger.error(`Error ending call: ${error.message}`);
      client.emit('call-error', { message: error.message });
    }
  }
}