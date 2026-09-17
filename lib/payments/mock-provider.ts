import type { ChargeParams, ChargeResult, PaymentProvider, RefundParams, RefundResult } from './types';

/** Mock payment provider — always succeeds. Swappable for Stripe later. */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'MOCK';

  async charge(params: ChargeParams): Promise<ChargeResult> {
    const providerPaymentId = `mock_pay_${params.orderId}_${Date.now()}`;
    return {
      success: true,
      providerPaymentId,
      status: 'SUCCEEDED',
    };
  }

  async refund(params: RefundParams): Promise<RefundResult> {
    return {
      success: true,
      providerRefundId: `mock_ref_${params.providerPaymentId}_${Date.now()}`,
      status: 'REFUNDED',
    };
  }
}

export const mockPaymentProvider = new MockPaymentProvider();
