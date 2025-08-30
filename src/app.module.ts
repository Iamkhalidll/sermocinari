import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import { DirectMessageModule } from './direct-message/direct-message.module';

@Module({
  imports: [AuthModule, ChatModule, DirectMessageModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
