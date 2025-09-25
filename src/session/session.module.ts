import { Module, Logger } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { Keyv } from 'keyv';
import { CacheableMemory } from 'cacheable';
import { SessionService } from './session.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      useFactory: async () => {
        const logger = new Logger('SessionModule');
        
        const memoryStore = new Keyv({
          store: new CacheableMemory({ 
            ttl: 24 * 60 * 60 * 1000, 
            lruSize: 10000 
          }),
        });
        logger.log('✅ Memory cache (primary) initialized for sessions');

        try {
          const redisStore = new KeyvRedis('redis://redis:6379');
          
          await redisStore.set('connection-test', 'ok');
          await redisStore.delete('connection-test');
          
          logger.log('✅ Redis fallback cache connected successfully');
          
          return {
            stores: [
              memoryStore, 
              redisStore, 
            ],
          };
        } catch (error) {
          logger.error('❌ Redis fallback cache connection failed:', error.message);
          logger.warn('⚠️  Running with memory cache only (no fallback)');
          
          return {
            stores: [
              memoryStore,
            ],
          };
        }
      },
    }),
  ],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}