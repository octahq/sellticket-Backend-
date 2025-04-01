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
