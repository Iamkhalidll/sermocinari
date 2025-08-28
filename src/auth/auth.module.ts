import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from 'src/mail/mai.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
@Module({
  imports: [ConfigModule,PrismaModule,MailModule,JwtModule.register({
    secret:process.env.JWT_SECRET,
    signOptions:{ expiresIn: process.env.JWT_EXPIRATION_TIME}
  })],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
