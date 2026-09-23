import { request } from './http'
import type { AuthResponse, User } from '../types/chat'

export const login = (email: string, password: string) => request<AuthResponse>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
export const signup = (name: string, email: string, password: string) => request<{ user: User; message: string }>('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) })
export const verifyEmail = (email: string, otp: string) => request<{ message: string }>('/auth/verify-email', { method: 'POST', body: JSON.stringify({ email, otp }) })
export const resendVerification = (email: string) => request<{ message: string }>('/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) })