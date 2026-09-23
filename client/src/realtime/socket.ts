import { io, type Socket } from 'socket.io-client'

export function createSocket(url: string, token: string): Socket {
  return io(url, { auth: { token }, transports: ['websocket', 'polling'], autoConnect: true })
}