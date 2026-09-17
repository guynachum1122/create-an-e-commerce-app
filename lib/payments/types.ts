export type PaymentMethodInput =
  | { type: 'FAKE_CARD'; fakeCardId: string }
  | { type: 'FAKE_BANK_TRANSFER'; fakeBankAccountId: string }
  | { type: 'SAVED_FAKE_CARD'; savedPaymentMethodId: string }
  | { type: 'SAVED_FAKE_BANK'; savedPaymentMethodId: string };

export interface ChargeParams {
  orderId: string;
  amountCents: number;
  currency: 'EUR' | 'GBP';
  method: PaymentMethodInput;
  idempotencyKey?: string;
}

export interface ChargeResult {
  success: boolean;
  providerPaymentId: string;
  status: 'SUCCEEDED' | 'FAILED';
  errorMessage?: string;
}

export interface RefundParams {
  providerPaymentId: string;
  amountCents: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  providerRefundId: string;
  status: 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'FAILED';
}

export interface PaymentProvider {
  readonly name: string;
  charge(params: ChargeParams): Promise<ChargeResult>;
  refund(params: RefundParams): Promise<RefundResult>;
}
