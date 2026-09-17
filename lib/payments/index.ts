import { mockPaymentProvider } from './mock-provider';
import type { PaymentProvider } from './types';

let provider: PaymentProvider = mockPaymentProvider;

export function getPaymentProvider(): PaymentProvider {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.PAYMENT_PROVIDER !== 'mock' &&
    !process.env.STRIPE_SECRET_KEY
  ) {
    throw new Error('Production requires a real payment provider (set STRIPE_SECRET_KEY or PAYMENT_PROVIDER=mock for demo)');
  }
  return provider;
}

export function setPaymentProvider(next: PaymentProvider): void {
  provider = next;
}

export * from './types';
