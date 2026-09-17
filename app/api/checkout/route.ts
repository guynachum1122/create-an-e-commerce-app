import { NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { auth, signIn } from '@/auth';
import { prisma } from '@/lib/db';
import { getCartItems, getGuestSessionId, serializeCart } from '@/lib/cart/service';
import { getPaymentProvider } from '@/lib/payments';
import { decrementStock } from '@/lib/stock';
import { generateOrderNumber } from '@/lib/utils';
import { checkRateLimit } from '@/lib/rate-limit';
import { sendOrderConfirmation } from '@/lib/email/service';
import { captureServerEvent } from '@/lib/posthog-server';
import { validateCoupon } from '@/lib/coupons';
import { formatPrice, countryToRegion, regionToCurrency } from '@/lib/i18n';
import { csrfGuard } from '@/lib/security/csrf';
import { checkoutSchema } from '@/lib/validations';
import { AccountType, type Currency, type DeliveryType, type PaymentMethodType, type Locale } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { mergeThinAccountsInto } from '@/lib/account/merge';

export async function POST(request: Request) {
  const blocked = csrfGuard(request);
  if (blocked) return blocked;

  return Sentry.startSpan({ name: 'checkout.place_order', op: 'checkout' }, async () => {
    try {
      const session = await auth();
      const guestSessionId = session?.user?.id ? undefined : await getGuestSessionId();
      const rateKey = session?.user?.id ?? guestSessionId ?? 'anon';
      const rate = await checkRateLimit('checkout:payment', rateKey);
      if (!rate.allowed) {
        return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
      }

      const body = await request.json();
      const parsed = checkoutSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid checkout data', details: parsed.error.flatten() }, { status: 400 });
      }

      const {
        contact, address, deliveryType, pickupLocationId,
        paymentMethodType, fakeCardId, fakeBankAccountId, savedPaymentMethodId,
        couponCode, createFullAccount, password, savePayment, locale,
      } = parsed.data;

      if (deliveryType === 'PICKUP' && !pickupLocationId) {
        return NextResponse.json({ error: 'Pickup location required' }, { status: 400 });
      }

      const { items } = await getCartItems(session?.user?.id, guestSessionId);
      if (!items.length) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });

      const currency = regionToCurrency(countryToRegion(address.countryCode)) as Currency;
      const cart = serializeCart(items, currency, locale);

      for (const item of items) {
        if (item.variant.stockQuantity < item.quantity) {
          return NextResponse.json({ error: `Out of stock: ${item.variant.sku}` }, { status: 422 });
        }
      }

      let userId = session?.user?.id;
      let shouldSignIn = false;
      let signInEmail: string | undefined;
      let signInPassword: string | undefined;

      if (!userId) {
        const emailLower = contact.email.toLowerCase();
        const existing = await prisma.user.findFirst({
          where: { OR: [{ email: emailLower }, { phone: contact.phone }], deletedAt: null },
        });

        if (existing) {
          if (createFullAccount && password) {
            if (existing.accountType === AccountType.FULL) {
              return NextResponse.json(
                { error: 'An account with this email or phone already exists. Please sign in to continue.' },
                { status: 409 },
              );
            }
            const passwordHash = await bcrypt.hash(password, 12);
            await prisma.$transaction(async (tx) => {
              await tx.user.update({
                where: { id: existing.id },
                data: {
                  name: contact.name,
                  email: emailLower,
                  phone: contact.phone,
                  passwordHash,
                  accountType: AccountType.FULL,
                  emailVerified: new Date(),
                },
              });
              await mergeThinAccountsInto(tx, existing.id, emailLower, contact.phone);
            });
            userId = existing.id;
            shouldSignIn = true;
            signInEmail = emailLower;
            signInPassword = password;
          } else {
            userId = existing.id;
            if (existing.accountType === AccountType.THIN) {
              await prisma.user.update({
                where: { id: userId },
                data: { name: contact.name, email: emailLower, phone: contact.phone },
              });
            } else if (existing.accountType === AccountType.FULL && !session?.user?.id) {
              return NextResponse.json(
                { error: 'Please sign in to place an order with your account.' },
                { status: 409 },
              );
            }
          }
        } else {
          const thin = await prisma.user.create({
            data: {
              name: contact.name,
              email: emailLower,
              phone: contact.phone,
              accountType: createFullAccount ? AccountType.FULL : AccountType.THIN,
              passwordHash: createFullAccount && password ? await bcrypt.hash(password, 12) : undefined,
            },
          });
          userId = thin.id;
          if (createFullAccount && password) {
            shouldSignIn = true;
            signInEmail = emailLower;
            signInPassword = password;
          }
        }

        if (createFullAccount && address) {
          await prisma.address.upsert({
            where: { userId },
            create: {
              userId,
              firstName: address.firstName,
              lastName: address.lastName,
              line1: address.line1,
              line2: address.line2,
              city: address.city,
              stateProvince: address.stateProvince,
              postalCode: address.postalCode,
              countryCode: address.countryCode,
              phone: contact.phone,
              region: countryToRegion(address.countryCode),
            },
            update: {
              firstName: address.firstName,
              lastName: address.lastName,
              line1: address.line1,
              line2: address.line2,
              city: address.city,
              stateProvince: address.stateProvince,
              postalCode: address.postalCode,
              countryCode: address.countryCode,
              phone: contact.phone,
              region: countryToRegion(address.countryCode),
            },
          });
        }
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 400 });

      const region = countryToRegion(address.countryCode);
      const shippingRate = await prisma.shippingRate.findUnique({
        where: { region_deliveryType: { region, deliveryType: deliveryType as DeliveryType } },
      });
      if (!shippingRate?.isActive) {
        return NextResponse.json({ error: 'Shipping option unavailable' }, { status: 400 });
      }
      if (deliveryType === 'EXPRESS' && !shippingRate.expressAvailable) {
        return NextResponse.json({ error: 'Express delivery unavailable for this region' }, { status: 400 });
      }

      const shippingCents = currency === 'EUR' ? (shippingRate.priceEurCents ?? 499) : (shippingRate.priceGbpCents ?? 449);

      let discountCents = 0;
      let couponId: string | undefined;
      if (couponCode) {
        const couponResult = await validateCoupon({
          code: couponCode,
          userId: userId!,
          accountType: user.accountType,
          subtotalCents: cart.subtotalCents,
          currency,
        });
        if (!couponResult.valid) {
          return NextResponse.json({ error: couponResult.error ?? 'Invalid coupon' }, { status: 400 });
        }
        discountCents = couponResult.discountCents;
        couponId = couponResult.couponId;
      }

      let resolvedFakeCardId = fakeCardId ?? undefined;
      let resolvedFakeBankAccountId = fakeBankAccountId ?? undefined;
      let methodType = paymentMethodType as PaymentMethodType;

      if (savedPaymentMethodId) {
        const saved = await prisma.savedPaymentMethod.findFirst({
          where: { id: savedPaymentMethodId, userId: userId! },
        });
        if (!saved) {
          return NextResponse.json({ error: 'Invalid saved payment method' }, { status: 400 });
        }
        resolvedFakeCardId = saved.fakeCardId ?? undefined;
        resolvedFakeBankAccountId = saved.fakeBankAccountId ?? undefined;
        methodType = saved.type;
      }

      if ((methodType === 'FAKE_CARD' || methodType === 'SAVED_FAKE_CARD') && !resolvedFakeCardId) {
        return NextResponse.json({ error: 'Payment method required' }, { status: 400 });
      }
      if ((methodType === 'FAKE_BANK_TRANSFER' || methodType === 'SAVED_FAKE_BANK') && !resolvedFakeBankAccountId) {
        return NextResponse.json({ error: 'Bank account required' }, { status: 400 });
      }

      if (resolvedFakeCardId) {
        const card = await prisma.fakeCreditCard.findFirst({ where: { id: resolvedFakeCardId, isActive: true } });
        if (!card) return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 });
      }
      if (resolvedFakeBankAccountId) {
        const bank = await prisma.fakeBankAccount.findFirst({ where: { id: resolvedFakeBankAccountId, isActive: true } });
        if (!bank) return NextResponse.json({ error: 'Invalid bank account' }, { status: 400 });
      }

      const totalCents = cart.subtotalCents - discountCents + shippingCents;
      const orderNumber = generateOrderNumber();
      const paymentProvider = getPaymentProvider();

      const order = await prisma.$transaction(async (tx) => {
        const stockOk = await decrementStock(
          cart.items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
          tx,
        );
        if (!stockOk) {
          throw new Error('OUT_OF_STOCK');
        }

        const charge = await paymentProvider.charge({
          orderId: orderNumber,
          amountCents: totalCents,
          currency,
          method: methodType === 'FAKE_CARD' || methodType === 'SAVED_FAKE_CARD'
            ? { type: 'FAKE_CARD' as const, fakeCardId: resolvedFakeCardId! }
            : { type: 'FAKE_BANK_TRANSFER' as const, fakeBankAccountId: resolvedFakeBankAccountId! },
        });

        if (!charge.success) {
          throw new Error('PAYMENT_FAILED');
        }

        const created = await tx.order.create({
          data: {
            orderNumber,
            userId: userId!,
            status: 'PROCESSING',
            currency,
            region,
            subtotalCents: cart.subtotalCents,
            discountCents,
            shippingCents,
            totalCents,
            couponId,
            couponCode: couponCode?.toUpperCase(),
            deliveryType: deliveryType as DeliveryType,
            pickupLocationId: pickupLocationId ?? undefined,
            locale: locale as Locale,
            shippingAddress: {
              create: {
                firstName: address.firstName,
                lastName: address.lastName,
                line1: address.line1,
                line2: address.line2,
                city: address.city,
                stateProvince: address.stateProvince,
                postalCode: address.postalCode,
                countryCode: address.countryCode,
                phone: contact.phone,
              },
            },
            customerContact: {
              create: { name: contact.name, email: contact.email, phone: contact.phone },
            },
            items: {
              create: cart.items.map((item) => ({
                variantId: item.variantId,
                productId: items.find((i) => i.variantId === item.variantId)!.variant.productId,
                sku: item.sku,
                productName: item.productName,
                size: item.size,
                color: item.color,
                quantity: item.quantity,
                unitPriceCents: item.priceCents,
                lineTotalCents: item.lineTotalCents,
              })),
            },
            statusHistory: { create: { toStatus: 'PROCESSING', note: 'Order placed' } },
            payment: {
              create: {
                provider: 'MOCK',
                providerPaymentId: charge.providerPaymentId,
                methodType,
                fakeCardId: resolvedFakeCardId,
                fakeBankAccountId: resolvedFakeBankAccountId,
                savedPaymentMethodId: savedPaymentMethodId ?? undefined,
                status: 'SUCCEEDED',
                amountCents: totalCents,
                currency,
              },
            },
          },
        });

        for (const item of items) {
          await tx.cartItem.delete({ where: { id: item.id } });
        }

        if (couponId) {
          await tx.coupon.update({ where: { id: couponId }, data: { usageCount: { increment: 1 } } });
          await tx.couponRedemption.create({
            data: { couponId, userId: userId!, orderId: created.id },
          });
        }

        return created;
      });

      if (savePayment && user.accountType === AccountType.FULL) {
        if (resolvedFakeCardId) {
          const card = await prisma.fakeCreditCard.findUnique({ where: { id: resolvedFakeCardId } });
          if (card) {
            const existing = await prisma.savedPaymentMethod.findFirst({
              where: { userId: userId!, fakeCardId: resolvedFakeCardId },
            });
            if (!existing) {
              await prisma.savedPaymentMethod.create({
                data: { userId: userId!, type: 'SAVED_FAKE_CARD', fakeCardId: resolvedFakeCardId, label: card.labelEn },
              });
            }
          }
        }
        if (resolvedFakeBankAccountId) {
          const bank = await prisma.fakeBankAccount.findUnique({ where: { id: resolvedFakeBankAccountId } });
          if (bank) {
            const existing = await prisma.savedPaymentMethod.findFirst({
              where: { userId: userId!, fakeBankAccountId: resolvedFakeBankAccountId },
            });
            if (!existing) {
              await prisma.savedPaymentMethod.create({
                data: {
                  userId: userId!,
                  type: 'SAVED_FAKE_BANK',
                  fakeBankAccountId: resolvedFakeBankAccountId,
                  label: bank.labelEn,
                },
              });
            }
          }
        }
      }

      await sendOrderConfirmation({
        email: contact.email,
        name: contact.name,
        orderNumber,
        total: formatPrice(totalCents, currency),
      });

      await captureServerEvent(userId!, 'purchase_completed', { orderNumber, totalCents, currency });

      if (shouldSignIn && signInEmail && signInPassword) {
        await signIn('credentials', { email: signInEmail, password: signInPassword, redirect: false });
      }

      return NextResponse.json({ orderId: order.id, orderNumber, userId, signedIn: shouldSignIn });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'OUT_OF_STOCK') {
          return NextResponse.json({ error: 'One or more items are out of stock' }, { status: 422 });
        }
        if (error.message === 'PAYMENT_FAILED') {
          return NextResponse.json({ error: 'Payment failed' }, { status: 402 });
        }
      }
      Sentry.captureException(error);
      return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
    }
  });
}
