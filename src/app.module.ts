import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { DirectMessageModule } from './direct-message/direct-message.module';
import { MailModule } from './mail/mai.module';

@Module({
  imports: [AuthModule, DirectMessageModule,MailModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
