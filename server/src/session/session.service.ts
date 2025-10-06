import { Injectable, Logger, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface SessionData {
  socketId: string;
  userId: string;
  createdAt: Date;
  connectionType?: 'DIRECT' | 'GROUP';
}

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  private readonly SESSION_KEY_PREFIX = 'session:';
  private readonly USER_SESSIONS_KEY_PREFIX = 'user_sessions:';
  private readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; 

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async createSession(userId: string, socketId: string, connectionType?: 'DIRECT' | 'GROUP'): Promise<SessionData> {
    const sessionData: SessionData = {
      socketId,
      userId,
      createdAt: new Date(),
      connectionType,
    };

    const sessionKey = this.getSessionKey(socketId);
    const userSessionsKey = this.getUserSessionsKey(userId);

    try {
      await this.cacheManager.set(sessionKey, sessionData, this.DEFAULT_TTL);

      const userSessions = await this.getUserSessions(userId);
      userSessions.push(sessionData);
      await this.cacheManager.set(userSessionsKey, userSessions, this.DEFAULT_TTL);

      this.logger.log(`Session created: ${socketId} for user: ${userId}`);
      return sessionData;
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
      throw error;
    }
  }

  async getSession(socketId: string): Promise<SessionData | null> {
    try {
      const sessionKey = this.getSessionKey(socketId);
      const session = await this.cacheManager.get<SessionData>(sessionKey);
      return session || null;
    } catch (error) {
      this.logger.error(`Failed to get session: ${error.message}`);
      return null;
    }
  }

 
  async getUserSessions(userId: string): Promise<SessionData[]> {
    try {
      const userSessionsKey = this.getUserSessionsKey(userId);
      const sessions = await this.cacheManager.get<SessionData[]>(userSessionsKey);
      return sessions || [];
    } catch (error) {
      this.logger.error(`Failed to get user sessions: ${error.message}`);
      return [];
    }
  }

  async removeSession(socketId: string): Promise<void> {
    try {
      const session = await this.getSession(socketId);
      if (!session) {
        this.logger.warn(`Session not found for socket: ${socketId}`);
        return;
      }

      const sessionKey = this.getSessionKey(socketId);
      const userSessionsKey = this.getUserSessionsKey(session.userId);

      await this.cacheManager.del(sessionKey);

      const userSessions = await this.getUserSessions(session.userId);
      const updatedSessions = userSessions.filter(s => s.socketId !== socketId);
      
      if (updatedSessions.length > 0) {
        await this.cacheManager.set(userSessionsKey, updatedSessions, this.DEFAULT_TTL);
      } else {
        await this.cacheManager.del(userSessionsKey);
      }

      this.logger.log(`Session removed: ${socketId} for user: ${session.userId}`);
    } catch (error) {
      this.logger.error(`Failed to remove session: ${error.message}`);
      throw error;
    }
  }

  async removeUserSessions(userId: string): Promise<void> {
    try {
      const sessions = await this.getUserSessions(userId);
      for (const session of sessions) {
        const sessionKey = this.getSessionKey(session.socketId);
        await this.cacheManager.del(sessionKey);
      }

      const userSessionsKey = this.getUserSessionsKey(userId);
      await this.cacheManager.del(userSessionsKey);

      this.logger.log(`All sessions removed for user: ${userId}`);
    } catch (error) {
      this.logger.error(`Failed to remove user sessions: ${error.message}`);
      throw error;
    }
  }


  async hasActiveSessions(userId: string): Promise<boolean> {
    const sessions = await this.getUserSessions(userId);
    return sessions.length > 0;
  }

  async updateSession(socketId: string, updates: Partial<SessionData>): Promise<SessionData | null> {
    try {
      const session = await this.getSession(socketId);
      if (!session) {
        return null;
      }

      const updatedSession = { ...session, ...updates };
      const sessionKey = this.getSessionKey(socketId);
      await this.cacheManager.set(sessionKey, updatedSession, this.DEFAULT_TTL);

      if (updates.userId && updates.userId !== session.userId) {
        await this.removeFromUserSessions(session.userId, socketId);
        const userSessionsKey = this.getUserSessionsKey(updates.userId);
        const userSessions = await this.getUserSessions(updates.userId);
        userSessions.push(updatedSession);
        await this.cacheManager.set(userSessionsKey, userSessions, this.DEFAULT_TTL);
      } else {
        await this.updateInUserSessions(session.userId, socketId, updatedSession);
      }

      return updatedSession;
    } catch (error) {
      this.logger.error(`Failed to update session: ${error.message}`);
      return null;
    }
  }

  private getSessionKey(socketId: string): string {
    return `${this.SESSION_KEY_PREFIX}${socketId}`;
  }

  private getUserSessionsKey(userId: string): string {
    return `${this.USER_SESSIONS_KEY_PREFIX}${userId}`;
  }

  private async removeFromUserSessions(userId: string, socketId: string): Promise<void> {
    const userSessions = await this.getUserSessions(userId);
    const updatedSessions = userSessions.filter(s => s.socketId !== socketId);
    
    const userSessionsKey = this.getUserSessionsKey(userId);
    if (updatedSessions.length > 0) {
      await this.cacheManager.set(userSessionsKey, updatedSessions, this.DEFAULT_TTL);
    } else {
      await this.cacheManager.del(userSessionsKey);
    }
  }

  private async updateInUserSessions(userId: string, socketId: string, updatedSession: SessionData): Promise<void> {
    const userSessions = await this.getUserSessions(userId);
    const sessionIndex = userSessions.findIndex(s => s.socketId === socketId);
    
    if (sessionIndex !== -1) {
      userSessions[sessionIndex] = updatedSession;
      const userSessionsKey = this.getUserSessionsKey(userId);
      await this.cacheManager.set(userSessionsKey, userSessions, this.DEFAULT_TTL);
    }
  }
}