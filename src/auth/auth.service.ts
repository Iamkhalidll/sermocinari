import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

export interface OAuthUser {
  email: string;
  name: string;
  accessToken: string;
  refreshToken: string;
}

export interface facebookOAuthUser {
  email:string;
  name:string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  // Generate JWT token
  generateToken(userId: string): string {
    return this.jwtService.sign({ id: userId });
  }

  // Hash password with bcrypt
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  // Verify password with bcrypt
  async verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // Generate 6-digit OTP
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Signup
  async signup(signupDto: SignupDto) {
    const { name, email, password } = signupDto;

    // Check if user exists
    const userExists = await this.prisma.user.findUnique({
      where: { email },
    });

    if (userExists) {
      throw new ConflictException('User already exists');
    }

    // Hash password with bcrypt
    const hashedPassword = await this.hashPassword(password);

    // Generate OTP and expiry (5 minutes)
    const otp = this.generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        verificationOtp: otp,
        otpExpiry,
      },
    });

    // Send OTP email
    await this.mailService.sendOTPEmail(user.email, otp);

    // Return user without password
    const { password: _, verificationOtp: __, ...result } = user;

    return {
      user: result,
      message: 'User registered successfully! Please check your email for the verification OTP.',
    };
  }

  // Login
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error('Login attempt with non-existent email:', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check password using bcrypt
    const passwordValid = await this.verifyPassword(user.password, password);

    if (!passwordValid) {
      console.error('Login attempt with invalid password for email:', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      throw new UnauthorizedException({
        message: 'Please verify your email before logging in',
        needsVerification: true,
        email: user.email,
      });
    }

    // Generate token
    const token = this.generateToken(user.id);

    // Return user without password
    const { password: _, verificationOtp: __, ...result } = user;

    return {
      user: result,
      token,
    };
  }

  // Verify email with OTP
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, otp } = verifyEmailDto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Check if OTP is valid and not expired
    if (!user.verificationOtp || user.verificationOtp !== otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (!user.otpExpiry || user.otpExpiry < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    // Update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationOtp: null,
        otpExpiry: null,
      },
    });

    return { message: 'Email verified successfully! You can now log in.' };
  }

  // Resend verification OTP
  async resendVerification(resendDto: ResendVerificationDto) {
    const { email } = resendDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new OTP and expiry
    const otp = this.generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: { 
        verificationOtp: otp,
        otpExpiry 
      },
    });

    // Send OTP email
    await this.mailService.sendOTPEmail(user.email, otp);

    return { message: 'Verification OTP sent! Please check your inbox.' };
  }

  // Forgot password
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Hash token
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry,
      },
    });

    // Send password reset email
    await this.mailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'Password reset email sent! Please check your inbox.' };
  }

  // Reset password
  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { token, password } = resetPasswordDto;

    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password with bcrypt
    const hashedPassword = await this.hashPassword(password);

    // Update user
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return {
      message: 'Password reset successful! You can now log in with your new password.',
    };
  }

}