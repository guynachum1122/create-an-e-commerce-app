import { PrismaClient, Locale, Region, DeliveryType, CouponType, AccountType, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'KitchenMe2026!';

const PRODUCTS = [
  { slug: 'ceramic-stacking-bowls', nameEn: 'Ceramic Stacking Bowls Set', nameHe: 'סט קערות קרamic מוערמות', cat: 'kitchen', sizes: ['S', 'M', 'L'], colors: [{ name: 'Sage Green', hex: '#5C7A6B' }, { name: 'Terracotta', hex: '#C45A3B' }] },
  { slug: 'linen-table-runner', nameEn: 'Linen Table Runner', nameHe: 'ראנר שולחן פשתן', cat: 'decor', sizes: ['One Size'], colors: [{ name: 'Natural', hex: '#E8DFD0' }, { name: 'Navy', hex: '#2B3A4A' }] },
  { slug: 'oak-cutting-board', nameEn: 'Oak Cutting Board', nameHe: 'קרש חיתוך אלon', cat: 'kitchen', sizes: ['M', 'L'], colors: [{ name: 'Natural Oak', hex: '#C4A574' }] },
  { slug: 'cast-iron-skillet', nameEn: 'Cast Iron Skillet', nameHe: 'מחבת יציקה', cat: 'kitchen', sizes: ['26cm', '30cm'], colors: [{ name: 'Black', hex: '#2B2B2B' }] },
  { slug: 'woven-basket-set', nameEn: 'Woven Storage Basket Set', nameHe: 'סט סלסלות אחסון', cat: 'storage', sizes: ['Set of 3'], colors: [{ name: 'Natural', hex: '#D4C4A8' }] },
  { slug: 'glass-storage-jars', nameEn: 'Glass Storage Jars', nameHe: 'צנצנות זכוכית', cat: 'storage-jars', sizes: ['S', 'M', 'L'], colors: [{ name: 'Clear', hex: '#E8F0EC' }] },
  { slug: 'herb-planter-trio', nameEn: 'Herb Planter Trio', nameHe: 'שלישיית עציצים', cat: 'decor', sizes: ['One Size'], colors: [{ name: 'White', hex: '#FFFFFF' }, { name: 'Sage', hex: '#5C7A6B' }] },
  { slug: 'marble-coaster-set', nameEn: 'Marble Coaster Set', nameHe: 'סט תחתיות שיש', cat: 'decor', sizes: ['Set of 4'], colors: [{ name: 'White Marble', hex: '#F5F0EA' }] },
  { slug: 'bamboo-utensil-set', nameEn: 'Bamboo Utensil Set', nameHe: 'סט כלי במבוק', cat: 'kitchen', sizes: ['One Size'], colors: [{ name: 'Natural', hex: '#C4A574' }] },
  { slug: 'cotton-tea-towels', nameEn: 'Cotton Tea Towels (2-pack)', nameHe: 'מגבות תה כותna (זוג)', cat: 'kitchen', sizes: ['One Size'], colors: [{ name: 'Cream', hex: '#FAF7F2' }, { name: 'Sage', hex: '#5C7A6B' }] },
  { slug: 'ceramic-mug-set', nameEn: 'Handmade Ceramic Mug Set', nameHe: 'סט ספלים קeramic', cat: 'kitchen', sizes: ['350ml'], colors: [{ name: 'Terracotta', hex: '#C45A3B' }, { name: 'Cream', hex: '#FAF7F2' }] },
  { slug: 'linen-throw', nameEn: 'Linen Throw Blanket', nameHe: 'שמיכת פשתן', cat: 'decor', sizes: ['S', 'M', 'L'], colors: [{ name: 'Sage Green', hex: '#5C7A6B' }, { name: 'Navy', hex: '#2B3A4A' }] },
  { slug: 'spice-grinder', nameEn: 'Manual Spice Grinder', nameHe: 'מטחנת תבלינים', cat: 'kitchen', sizes: ['One Size'], colors: [{ name: 'Walnut', hex: '#6B5344' }] },
  { slug: 'dinner-plates-set', nameEn: 'Stoneware Dinner Plates', nameHe: 'צלחות אבnstone', cat: 'kitchen', sizes: ['Set of 4'], colors: [{ name: 'Sand', hex: '#E8DFD0' }] },
  { slug: 'wall-shelf-oak', nameEn: 'Floating Oak Wall Shelf', nameHe: 'מדף קיר אלon', cat: 'decor', sizes: ['60cm', '90cm'], colors: [{ name: 'Natural Oak', hex: '#C4A574' }] },
  { slug: 'kitchen-timer', nameEn: 'Retro Kitchen Timer', nameHe: 'טיimer מטבח רטרו', cat: 'kitchen', sizes: ['One Size'], colors: [{ name: 'Red', hex: '#DC2626' }, { name: 'Cream', hex: '#FAF7F2' }] },
  { slug: 'ceramic-vase', nameEn: 'Sculptural Ceramic Vase', nameHe: 'אגרטל קeramic', cat: 'decor', sizes: ['M', 'L'], colors: [{ name: 'Terracotta', hex: '#C45A3B' }] },
  { slug: 'pantry-labels', nameEn: 'Pantry Label Kit', nameHe: 'ערכת תוויות מזווה', cat: 'storage', sizes: ['One Size'], colors: [{ name: 'Kraft', hex: '#D4C4A8' }] },
  { slug: 'silicone-spatula-set', nameEn: 'Silicone Spatula Set', nameHe: 'סט מרית סilicone', cat: 'kitchen', sizes: ['Set of 3'], colors: [{ name: 'Sage', hex: '#5C7A6B' }] },
  { slug: 'bread-box', nameEn: 'Bamboo Bread Box', nameHe: 'קופסת לחם במboo', cat: 'storage', sizes: ['One Size'], colors: [{ name: 'Natural', hex: '#C4A574' }] },
  { slug: 'measuring-cups', nameEn: 'Stainless Measuring Cups', nameHe: 'כוסות מדידה', cat: 'kitchen', sizes: ['Set of 4'], colors: [{ name: 'Silver', hex: '#A8A29E' }] },
  { slug: 'candle-holders', nameEn: 'Brass Candle Holders', nameHe: 'פמוטי פלz', cat: 'decor', sizes: ['Pair'], colors: [{ name: 'Brass', hex: '#E8A838' }] },
  { slug: 'mixing-bowl-set', nameEn: 'Nested Mixing Bowl Set', nameHe: 'סet קערות ערבוב', cat: 'kitchen', sizes: ['Set of 5'], colors: [{ name: 'White', hex: '#FFFFFF' }] },
  { slug: 'dish-rack', nameEn: 'Countertop Dish Rack', nameHe: 'מתקן כלים', cat: 'kitchen', sizes: ['One Size'], colors: [{ name: 'Black', hex: '#2B2B2B' }] },
  { slug: 'herb-drying-rack', nameEn: 'Herb Drying Rack', nameHe: 'מתקן ייבוש עשbi', cat: 'kitchen', sizes: ['One Size'], colors: [{ name: 'Natural', hex: '#C4A574' }] },
];

async function main() {
  console.log('🌱 Seeding Kitchen-me…');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  await prisma.rateLimitBucket.deleteMany();
  await prisma.review.deleteMany();
  await prisma.returnRequest.deleteMany();
  await prisma.orderInternalNote.deleteMany();
  await prisma.orderStatusHistory.deleteMany();
  await prisma.refund.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.orderShippingAddress.deleteMany();
  await prisma.orderCustomerContact.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.wishlistItem.deleteMany();
  await prisma.savedPaymentMethod.deleteMany();
  await prisma.collectionProduct.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.variant.deleteMany();
  await prisma.productTranslation.deleteMany();
  await prisma.product.deleteMany();
  await prisma.categoryTranslation.deleteMany();
  await prisma.category.deleteMany();
  await prisma.collectionTranslation.deleteMany();
  await prisma.collection.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.fakeCreditCard.deleteMany();
  await prisma.fakeBankAccount.deleteMany();
  await prisma.pickupLocation.deleteMany();
  await prisma.shippingRate.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.address.deleteMany();
  await prisma.dataDeletionRequest.deleteMany();
  await prisma.cookieConsent.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: { email: 'admin@kitchen-me.com', name: 'Admin User', passwordHash, role: UserRole.ADMIN, accountType: AccountType.FULL },
  });
  const worker = await prisma.user.create({
    data: { email: 'worker@kitchen-me.com', name: 'Warehouse Worker', passwordHash, role: UserRole.WORKER, accountType: AccountType.FULL },
  });
  const fullCustomer = await prisma.user.create({
    data: { email: 'customer@kitchen-me.com', name: 'Sophie Customer', phone: '+31612345678', passwordHash, role: UserRole.CUSTOMER, accountType: AccountType.FULL, preferredLocale: Locale.EN },
  });
  const thinCustomer = await prisma.user.create({
    data: { email: 'thin@kitchen-me.com', name: 'Guest Thin', phone: '+447700900123', role: UserRole.CUSTOMER, accountType: AccountType.THIN },
  });

  await prisma.address.create({
    data: {
      userId: fullCustomer.id,
      firstName: 'Sophie', lastName: 'Customer', line1: 'Keizersgracht 123', city: 'Amsterdam',
      postalCode: '1015 CJ', countryCode: 'NL', phone: '+31612345678', region: Region.EU,
    },
  });

  const kitchen = await prisma.category.create({ data: { slug: 'kitchen', sortOrder: 1, translations: { create: [{ locale: Locale.EN, name: 'Kitchen', description: 'Tools and essentials' }, { locale: Locale.HE, name: 'מטבח', description: 'כלים ומוצרי חובה' }] } } });
  const decor = await prisma.category.create({ data: { slug: 'decor', sortOrder: 2, translations: { create: [{ locale: Locale.EN, name: 'Decor', description: 'Style for every room' }, { locale: Locale.HE, name: 'עיצוב', description: 'סטיil לכל חדר' }] } } });
  const storage = await prisma.category.create({ data: { slug: 'storage', sortOrder: 3, translations: { create: [{ locale: Locale.EN, name: 'Storage', description: 'Organise beautifully' }, { locale: Locale.HE, name: 'אחסון', description: 'ארgonיה יפה' }] } } });
  const storageJars = await prisma.category.create({ data: { slug: 'storage-jars', sortOrder: 1, parentId: storage.id, translations: { create: [{ locale: Locale.EN, name: 'Jars & Containers', description: 'Glass and ceramic storage' }, { locale: Locale.HE, name: 'צנצנות ומיכלים', description: 'אחסון זכוכית וקרamic' }] } } });
  const categories = [kitchen, decor, storage, storageJars];

  const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  const collections = await Promise.all([
    prisma.collection.create({ data: { slug: 'morning-ritual', isFeatured: true, sortOrder: 1, heroImageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800', translations: { create: [{ locale: Locale.EN, name: 'Morning Ritual', description: 'Start the day right' }, { locale: Locale.HE, name: 'טקס בוקר', description: 'התחילו את היום נכון' }] } } }),
    prisma.collection.create({ data: { slug: 'summer-kitchen', isFeatured: true, sortOrder: 2, heroImageUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=800', translations: { create: [{ locale: Locale.EN, name: 'Summer Kitchen', description: 'Light and bright' }, { locale: Locale.HE, name: 'מטבח קיץ', description: 'קליל ומואר' }] } } }),
    prisma.collection.create({ data: { slug: 'cozy-home', isFeatured: true, sortOrder: 3, heroImageUrl: 'https://images.unsplash.com/photo-1616046229476-4439a3c4a148?w=800', translations: { create: [{ locale: Locale.EN, name: 'Cozy Home', description: 'Warm textures' }, { locale: Locale.HE, name: 'בית חמים', description: 'מרקמים חמים' }] } } }),
    prisma.collection.create({ data: { slug: 'entertainer', isFeatured: true, sortOrder: 4, heroImageUrl: 'https://images.unsplash.com/photo-1606787366850-de6330128bfc?w=800', translations: { create: [{ locale: Locale.EN, name: 'The Entertainer', description: 'For gathering' }, { locale: Locale.HE, name: 'Mezuman', description: 'לאירוח' }] } } }),
  ]);

  for (const p of PRODUCTS) {
    const baseEur = 2000 + Math.floor(Math.random() * 8000);
    const baseGbp = Math.round(baseEur * 0.85);
    const onSale = Math.random() > 0.7;

    const product = await prisma.product.create({
      data: {
        slug: p.slug,
        status: 'ACTIVE',
        categoryId: catMap[p.cat] ?? catMap.kitchen,
        translations: {
          create: [
            { locale: Locale.EN, name: p.nameEn, shortDescription: `${p.nameEn} — crafted for everyday living.`, description: `Our ${p.nameEn} brings bold lifestyle character to your home. Tax-inclusive pricing.`, sizeFitGuide: 'Standard sizing for home goods.', careInstructions: 'Wipe clean. Hand wash recommended.', materials: 'Premium sustainable materials.' },
            { locale: Locale.HE, name: p.nameHe, shortDescription: `${p.nameHe} — לחיים יomiim.`, description: `${p.nameHe} מביא אופי ואיכות לבית.`, sizeFitGuide: 'מידות סטандard למוצרי בית.', careInstructions: 'ניגוב. hand wash מומלץ.', materials: 'חומרים איכותיים.' },
          ],
        },
        images: { create: [{ url: `https://images.unsplash.com/photo-${1556910103 + Math.floor(Math.random() * 1000)}?w=600`, altText: p.nameEn, sortOrder: 0 }] },
      },
    });

    let vi = 0;
    for (const size of p.sizes) {
      for (const color of p.colors) {
        vi++;
        const sku = `KM-${p.slug.slice(0, 8).toUpperCase()}-${size.replace(/\s/g, '')}-${color.name.slice(0, 3).toUpperCase()}`;
        await prisma.variant.create({
          data: {
            productId: product.id, sku, size, color: color.name, colorHex: color.hex,
            stockQuantity: 5 + Math.floor(Math.random() * 50),
            priceEurCents: baseEur, priceGbpCents: baseGbp,
            salePriceEurCents: onSale ? Math.round(baseEur * 0.85) : null,
            salePriceGbpCents: onSale ? Math.round(baseGbp * 0.85) : null,
          },
        });
      }
    }

    if (collections[0]) {
      await prisma.collectionProduct.create({ data: { collectionId: collections[Math.floor(Math.random() * collections.length)].id, productId: product.id, sortOrder: vi } });
    }
  }

  await prisma.shippingRate.createMany({
    data: [
      { region: Region.EU, deliveryType: DeliveryType.STANDARD, priceEurCents: 499, priceGbpCents: null, labelEn: 'Standard Delivery', labelHe: 'משלוח רגיל', estimatedDaysMin: 3, estimatedDaysMax: 7, isActive: true, expressAvailable: true },
      { region: Region.EU, deliveryType: DeliveryType.EXPRESS, priceEurCents: 999, priceGbpCents: null, labelEn: 'Express Delivery', labelHe: 'משלוח מהיר', estimatedDaysMin: 1, estimatedDaysMax: 2, isActive: true, expressAvailable: true },
      { region: Region.EU, deliveryType: DeliveryType.PICKUP, priceEurCents: 499, priceGbpCents: null, labelEn: 'Pickup Point', labelHe: 'נקודת איסוף', estimatedDaysMin: 2, estimatedDaysMax: 5, isActive: true },
      { region: Region.UK, deliveryType: DeliveryType.STANDARD, priceEurCents: null, priceGbpCents: 449, labelEn: 'Standard Delivery', labelHe: 'משלוח רגיל', estimatedDaysMin: 2, estimatedDaysMax: 5, isActive: true, expressAvailable: true },
      { region: Region.UK, deliveryType: DeliveryType.EXPRESS, priceEurCents: null, priceGbpCents: 899, labelEn: 'Express Delivery', labelHe: 'משלוח מהיר', estimatedDaysMin: 1, estimatedDaysMax: 1, isActive: true, expressAvailable: true },
      { region: Region.UK, deliveryType: DeliveryType.PICKUP, priceEurCents: null, priceGbpCents: 449, labelEn: 'Pickup Point', labelHe: 'נקודת איסוף', estimatedDaysMin: 2, estimatedDaysMax: 4, isActive: true },
    ],
  });

  await prisma.pickupLocation.createMany({
    data: [
      { region: Region.EU, countryCode: 'NL', nameEn: 'PackLocker Central Station', nameHe: 'PackLocker תחנת מרכז', addressLine1: 'Stationsplein 1', city: 'Amsterdam', postalCode: '1012 AB' },
      { region: Region.EU, countryCode: 'DE', nameEn: 'CityHub Locker Mitte', nameHe: 'CityHub Locker Mitte', addressLine1: 'Friedrichstraße 68', city: 'Berlin', postalCode: '10117' },
      { region: Region.EU, countryCode: 'FR', nameEn: 'PickUp Point Rivoli', nameHe: 'נקודת איסוף Rivoli', addressLine1: '12 Rue de Rivoli', city: 'Paris', postalCode: '75001' },
      { region: Region.UK, countryCode: 'GB', nameEn: 'LockerZone Piccadilly', nameHe: 'LockerZone Piccadilly', addressLine1: '1 Piccadilly Gardens', city: 'Manchester', postalCode: 'M1 1RN' },
      { region: Region.UK, countryCode: 'GB', nameEn: 'CollectPlus Camden', nameHe: 'CollectPlus Camden', addressLine1: '142 Camden High Street', city: 'London', postalCode: 'NW1 0NE' },
    ],
  });

  const cards = [
    ['Visa ···· 4242 (Demo)', 'Visa ···· 4242 (דemo)', '4242', 'Visa'],
    ['Mastercard ···· 5555 (Demo)', 'Mastercard ···· 5555 (דemo)', '5555', 'Mastercard'],
    ['Visa ···· 1111 (Demo)', 'Visa ···· 1111 (דemo)', '1111', 'Visa'],
    ['Mastercard ···· 2222 (Demo)', 'Mastercard ···· 2222 (דemo)', '2222', 'Mastercard'],
    ['Amex ···· 0005 (Demo)', 'Amex ···· 0005 (דemo)', '0005', 'Amex'],
    ['Visa ···· 3333 (Demo)', 'Visa ···· 3333 (דemo)', '3333', 'Visa'],
    ['Mastercard ···· 4444 (Demo)', 'Mastercard ···· 4444 (דemo)', '4444', 'Mastercard'],
    ['Visa ···· 6666 (Demo)', 'Visa ···· 6666 (דemo)', '6666', 'Visa'],
    ['Mastercard ···· 7777 (Demo)', 'Mastercard ···· 7777 (דemo)', '7777', 'Mastercard'],
    ['Visa ···· 8888 (Demo)', 'Visa ···· 8888 (דemo)', '8888', 'Visa'],
  ];
  for (const [labelEn, labelHe, lastFour, brand] of cards) {
    await prisma.fakeCreditCard.create({ data: { labelEn, labelHe, lastFour, brand } });
  }

  await prisma.fakeBankAccount.createMany({
    data: [
      { labelEn: 'Kitchen-me Demo Bank — NL · IBAN ···4321', labelHe: 'Kitchen-me Demo Bank — NL · IBAN ···4321', bankName: 'Demo NL Bank', accountLastFour: '4321' },
      { labelEn: 'Kitchen-me Demo Bank — DE · IBAN ···8765', labelHe: 'Kitchen-me Demo Bank — DE · IBAN ···8765', bankName: 'Demo DE Bank', accountLastFour: '8765' },
      { labelEn: 'Kitchen-me Demo Bank — UK · Sort ··20-00 · Acct ···6789', labelHe: 'Kitchen-me Demo Bank — UK · Sort ··20-00 · Acct ···6789', bankName: 'Demo UK Bank', accountLastFour: '6789' },
    ],
  });

  await prisma.coupon.createMany({
    data: [
      { code: 'WELCOME10', type: CouponType.PERCENTAGE, percentageOff: 10, isActive: true, usageLimit: 1000 },
      { code: 'KITCHEN15', type: CouponType.FIXED_AMOUNT, valueEurCents: 1500, valueGbpCents: 1200, minOrderEurCents: 8000, minOrderGbpCents: 7000, isActive: true },
      { code: 'WINTER20', type: CouponType.PERCENTAGE, percentageOff: 20, isActive: true, expiresAt: new Date('2026-12-31') },
    ],
  });

  const sampleProduct = await prisma.product.findFirst({ include: { variants: { take: 1 } } });
  if (sampleProduct?.variants[0]) {
    const variant = sampleProduct.variants[0];
    const orderNum = `KM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0001`;
    await prisma.order.create({
      data: {
        orderNumber: orderNum,
        userId: fullCustomer.id,
        status: 'DELIVERED',
        currency: 'EUR',
        region: Region.EU,
        subtotalCents: variant.priceEurCents,
        shippingCents: 499,
        totalCents: variant.priceEurCents + 499,
        deliveryType: DeliveryType.STANDARD,
        locale: Locale.EN,
        deliveredAt: new Date(),
        shippingAddress: { create: { firstName: 'Sophie', lastName: 'Customer', line1: 'Keizersgracht 123', city: 'Amsterdam', postalCode: '1015 CJ', countryCode: 'NL', phone: '+31612345678' } },
        customerContact: { create: { name: 'Sophie Customer', email: 'customer@kitchen-me.com', phone: '+31612345678' } },
        items: { create: [{ variantId: variant.id, productId: sampleProduct.id, sku: variant.sku, productName: 'Demo Order Item', size: variant.size, color: variant.color, quantity: 1, unitPriceCents: variant.priceEurCents, lineTotalCents: variant.priceEurCents }] },
        statusHistory: { create: [{ toStatus: 'PROCESSING' }, { toStatus: 'SHIPPED' }, { toStatus: 'DELIVERED' }] },
        payment: { create: { provider: 'MOCK', methodType: 'FAKE_CARD', status: 'SUCCEEDED', amountCents: variant.priceEurCents + 499, currency: 'EUR' } },
      },
    });

    const thinOrderNum = `KM-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-0002`;
    await prisma.order.create({
      data: {
        orderNumber: thinOrderNum,
        userId: thinCustomer.id,
        status: 'PROCESSING',
        currency: 'GBP',
        region: Region.UK,
        subtotalCents: variant.priceGbpCents,
        shippingCents: 449,
        totalCents: variant.priceGbpCents + 449,
        deliveryType: DeliveryType.STANDARD,
        locale: Locale.EN,
        shippingAddress: { create: { firstName: 'Guest', lastName: 'Thin', line1: '142 Camden High Street', city: 'London', postalCode: 'NW1 0NE', countryCode: 'GB', phone: '+447700900123' } },
        customerContact: { create: { name: 'Guest Thin', email: 'thin@kitchen-me.com', phone: '+447700900123' } },
        items: { create: [{ variantId: variant.id, productId: sampleProduct.id, sku: variant.sku, productName: 'Thin Account Order', size: variant.size, color: variant.color, quantity: 1, unitPriceCents: variant.priceGbpCents, lineTotalCents: variant.priceGbpCents }] },
        statusHistory: { create: { toStatus: 'PROCESSING' } },
        payment: { create: { provider: 'MOCK', methodType: 'FAKE_CARD', status: 'SUCCEEDED', amountCents: variant.priceGbpCents + 449, currency: 'GBP' } },
      },
    });
  }

  if (process.env.NODE_ENV === 'development') {
    console.log('Demo password:', DEMO_PASSWORD);
  }
  console.log('✅ Seed complete');
  console.log('Admin:', admin.email, '| Worker:', worker.email, '| Customer:', fullCustomer.email, '| Thin:', thinCustomer.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
