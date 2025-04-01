export interface PaymentRequest {
  amount: number;
  currency: string;
  email: string;
  reference?: string;
}
