// src/auth/auth.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MailService } from '../mail/mail.service';
import { AuthRepository } from './auth.repository';
import { AuthUtils } from './auth.util';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private authRepository: AuthRepository,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  private generateToken(userId: string): string {
    return this.jwtService.sign({ id: userId });
  }

  async signup(signupDto: SignupDto) {
    const { name, email, password } = signupDto;

    const existingUser = await this.authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await AuthUtils.hashPassword(password);
    const otp = AuthUtils.generateOTP();
    const otpExpiry = AuthUtils.getOTPExpiry();

    const user = await this.authRepository.createUser({
      name,
      email,
      password: hashedPassword,
      verificationOtp: otp,
      otpExpiry,
    });

    await this.mailService.sendOTPEmail(email, otp);

    const userResponse = AuthUtils.excludeFields(user, 'password', 'verificationOtp');

    return {
      user: userResponse,
      message: 'User registered successfully! Please check your email for the verification OTP.',
    };
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await AuthUtils.verifyPassword(user.password, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException({
        message: 'Please verify your email before logging in',
        needsVerification: true,
        email: user.email,
      });
    }

    const token = this.generateToken(user.id);
    const userResponse = AuthUtils.excludeFields(user, 'password', 'verificationOtp');

    return { user: userResponse, token };
  }

  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, otp } = verifyEmailDto;

    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    if (!user.verificationOtp || user.verificationOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    await this.authRepository.verifyUserEmail(user.id);

    return { message: 'Email verified successfully! You can now log in.' };
  }

  async resendVerification(resendDto: ResendVerificationDto) {
    const { email } = resendDto;

    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    const otp = AuthUtils.generateOTP();
    const otpExpiry = AuthUtils.getOTPExpiry();

    await this.authRepository.updateUserOtp(user.id, { verificationOtp: otp, otpExpiry });
    await this.mailService.sendOTPEmail(email, otp);

    return { message: 'Verification OTP sent! Please check your inbox.' };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const resetToken = AuthUtils.generateResetToken();
    const resetTokenExpiry = AuthUtils.getResetTokenExpiry();
    const hashedToken = AuthUtils.hashToken(resetToken);

    await this.authRepository.updateResetToken(user.id, {
      resetToken: hashedToken,
      resetTokenExpiry,
    });

    await this.mailService.sendPasswordResetEmail(email, resetToken);

    return { message: 'Password reset email sent! Please check your inbox.' };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    const user = await this.authRepository.findUserByResetToken(token);
    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await AuthUtils.hashPassword(password);
    await this.authRepository.updatePassword(user.id, hashedPassword);

    return {
      message: 'Password reset successful! You can now log in with your new password.',
    };
  }
}