import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

export class AuthUtils {
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  static async verifyPassword(hashedPassword: string, plainPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  static generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static getOTPExpiry(minutes: number = 5): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }

  static getResetTokenExpiry(hours: number = 1): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }

  static excludeFields<T, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  }
}