import { z } from 'zod';

export const cartPostSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99).default(1),
});

export const cartPatchSchema = z.object({
  itemId: z.string().uuid(),
  quantity: z.number().int().min(0).max(99),
});

export const cartDeleteSchema = z.object({
  itemId: z.string().uuid(),
});

export const addressSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(100),
  stateProvince: z.string().max(100).optional(),
  postalCode: z.string().min(1).max(20),
  countryCode: z.string().length(2),
});

export const contactSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().min(5).max(20),
});

export const checkoutSchema = z.object({
  contact: contactSchema,
  address: addressSchema,
  deliveryType: z.enum(['STANDARD', 'EXPRESS', 'PICKUP']),
  pickupLocationId: z.string().uuid().optional().nullable(),
  paymentMethodType: z.enum(['FAKE_CARD', 'FAKE_BANK_TRANSFER', 'SAVED_FAKE_CARD', 'SAVED_FAKE_BANK']),
  fakeCardId: z.string().uuid().optional().nullable(),
  fakeBankAccountId: z.string().uuid().optional().nullable(),
  savedPaymentMethodId: z.string().uuid().optional().nullable(),
  couponCode: z.string().max(50).optional().nullable(),
  createFullAccount: z.boolean().optional(),
  password: z.string().min(8).max(128).optional().nullable(),
  savePayment: z.boolean().optional(),
  locale: z.enum(['EN', 'HE']).default('EN'),
});

export const registerSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200),
  phone: z.string().min(5).max(20).optional(),
  password: z.string().min(8).max(128),
  countryCode: z.string().length(2).optional(),
});

export const reviewSchema = z.object({
  productId: z.string().uuid(),
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid(),
  stars: z.number().int().min(1).max(5),
});

export const wishlistPostSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
});

export const wishlistDeleteSchema = z.object({
  itemId: z.string().uuid(),
});

export const consentSchema = z.object({
  analytics: z.boolean(),
  marketing: z.boolean(),
});

export const accountDeleteSchema = z.object({
  confirmText: z.literal('DELETE'),
  password: z.string().min(1).max(128).optional(),
});

export const couponValidateSchema = z.object({
  code: z.string().min(1).max(50),
  subtotalCents: z.number().int().min(0),
  currency: z.enum(['EUR', 'GBP']),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email().max(200),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export const returnRequestSchema = z.object({
  orderId: z.string().uuid(),
  orderItemId: z.string().uuid().optional().nullable(),
  reason: z.string().min(1).max(1000),
});

export const adminCouponSchema = z.object({
  code: z.string().min(1).max(50),
  type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
  percentageOff: z.number().min(1).max(100).optional(),
  valueEurCents: z.number().int().min(0).max(999999).optional(),
  valueGbpCents: z.number().int().min(0).max(999999).optional(),
});

export const adminShippingRateSchema = z.object({
  id: z.string().uuid(),
  priceEurCents: z.number().int().min(0).max(999999),
  priceGbpCents: z.number().int().min(0).max(999999),
  expressAvailable: z.boolean().optional(),
});

export const adminShippingPatchSchema = z.object({
  rates: z.array(adminShippingRateSchema).max(50),
});

export const adminPickupSchema = z.object({
  region: z.enum(['EU', 'UK']),
  countryCode: z.string().length(2),
  name: z.string().min(1).max(200),
  addressLine1: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  isActive: z.boolean().default(true),
});

export const abandonedCartSchema = z.object({
  email: z.string().email().max(200),
  phone: z.string().max(20).optional(),
});
