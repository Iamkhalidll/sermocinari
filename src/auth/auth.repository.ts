import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  verificationOtp: string;
  otpExpiry: Date;
}

export interface UpdateUserOtpData {
  verificationOtp: string;
  otpExpiry: Date;
}

export interface UpdateResetTokenData {
  resetToken: string;
  resetTokenExpiry: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private prisma: PrismaService) {}

  async findUserByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findUserByResetToken(token: string) {
    return this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });
  }

  async createUser(data: CreateUserData) {
    return this.prisma.user.create({ data });
  }

  async verifyUserEmail(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: true,
        verificationOtp: null,
        otpExpiry: null,
      },
    });
  }

  async updateUserOtp(userId: string, data: UpdateUserOtpData) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updateResetToken(userId: string, data: UpdateResetTokenData) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  async updatePassword(userId: string, password: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });
  }
}