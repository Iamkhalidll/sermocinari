export type User = {
  id: string
  name: string
  email: string
  avatar?: string | null
  isOnline?: boolean
  lastSeen?: string | null
}

export type AuthResponse = {
  user: User
  token: string
}

export type Message = {
  id: string
  conversationId?: string
  groupId?: string
  senderId: string
  recipientId?: string | null
  content?: string | null
  type?: string
  isDelivered?: boolean
  deliveredAt?: string | null
  isRead?: boolean
  readAt?: string | null
  createdAt?: string
}

export type ChatMode = 'direct' | 'group'