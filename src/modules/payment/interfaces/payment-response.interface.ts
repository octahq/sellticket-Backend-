import { PaymentStatus } from '../enums/payment-status.enum';

export interface PaymentResponse {
  status: PaymentStatus;
  message: string;
  reference: string;
  gatewayResponse?: any;
}
