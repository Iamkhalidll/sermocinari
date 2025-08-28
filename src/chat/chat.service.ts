import { Injectable } from '@nestjs/common';

@Injectable()
export class ChatService {
  addUser(socketId: string, username: string) {
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