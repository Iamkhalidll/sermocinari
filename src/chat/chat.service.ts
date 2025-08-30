import { Injectable } from '@nestjs/common';
import { ChatRepository } from './chat.repository';
@Injectable()
export class ChatService {
  constructor(
    private readonly chatRepository: ChatRepository,
  ) {}

  addUser(socketId: string) {
    
  }

  removeUser(socketId: string) {
  }

  getUser(socketId: string){
  }

  getUsersInRoom(room: string){
  }

  joinRoom(socketId: string, room: string) {
  }

  leaveRoom(socketId: string, room: string) {
  }

  saveMessage() {
  }

  getMessagesForRoom(room?: string){
}}