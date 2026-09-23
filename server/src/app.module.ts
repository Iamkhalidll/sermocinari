import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DirectMessageModule } from './direct-message/direct-message.module';
import { MailModule } from './mail/mai.module';
import { GroupMessageModule } from './group-message/group-message.module';
import { SessionModule } from './session/session.module';
import { CallModule } from './call/call.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    DirectMessageModule,
    MailModule,
    GroupMessageModule,
    SessionModule,
    CallModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
