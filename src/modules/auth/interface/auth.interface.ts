import { Request } from 'express';

export interface Options {
  numberOfDigits?: number;
  numberOfAlphabets?: number;
}
export interface RandomAlphanumeric {
  randomDigits: string;
  randomAlphabets?: string;
}

export interface AuthResponse {
  message: string;
  token?: string;
}

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
  };
}
