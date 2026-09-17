import { getDictionary, type AppLocale } from '@/lib/i18n';

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  const isHe = locale === 'he';

  return (
    <article className="mx-auto max-w-prose px-gutter py-section-y-sm prose dark:prose-invert">
      <h1>{isHe ? 'מדיניות פרטיות' : 'Privacy Policy'}</h1>
      <p>{isHe
        ? 'Kitchen-me ("אנחנו") מפעילה חנות מקוונת למוצרי בית ולייף סטייל, עם משלוחים ל-EU ול-UK. מדיניות זו מסבירה אילו נתונים אנו אוספים ומהן זכויותיכם לפי GDPR.'
        : 'Kitchen-me ("we", "us") operates kitchen-me.com, a single-brand online store shipping physical home and lifestyle products to customers in the European Union and United Kingdom. This policy explains what personal data we collect, why we collect it, and your rights under GDPR and UK GDPR.'}
      </p>
      <h2>{isHe ? 'עוגיות' : 'Cookies'}</h2>
      <p>{isHe ? 'עוגיות הכרחיות נדרשות לעגלה, תשלום והתחברות. אנליטיקה ושיווק — רק בהסכמתכם.' : 'Essential cookies are required for cart, checkout, and sign-in. Analytics and marketing cookies load only with your consent.'}</p>
      <h2>{isHe ? 'הזכויות שלכם' : 'Your rights'}</h2>
      <p>{isHe ? 'ניתן לבקש גישה, תיקון או מחיקת הנתונים האישיים שלכם דרך אזור החשבון.' : 'You may request access, correction, or deletion of your personal data via your account settings.'}</p>
    </article>
  );
}
