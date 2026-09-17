import { MetadataRoute } from 'next';
import { config } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production') {
    return { rules: { userAgent: '*', disallow: '/' } };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/en/', '/he/'],
        disallow: ['/admin', '/en/cart', '/he/cart', '/en/checkout', '/he/checkout', '/en/auth/', '/he/auth/', '/en/account', '/he/account'],
      },
    ],
    sitemap: `${config.siteUrl}/sitemap.xml`,
  };
}
