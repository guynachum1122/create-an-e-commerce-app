'use client';

import { useState } from 'react';
import { StarRating } from '@/components/product/star-rating';
import { Button } from '@/components/ui/button';
import { getDictionary, type AppLocale } from '@/lib/i18n';
import { getConsentHeader } from '@/lib/analytics';
import { toast } from 'sonner';

interface Props {
  locale: AppLocale;
  productId: string;
  averageRating: number;
  reviewCount: number;
  canRate: boolean;
  eligibleOrderId?: string;
  eligibleOrderItemId?: string;
}

export function ReviewSection({
  locale,
  productId,
  averageRating,
  reviewCount,
  canRate,
  eligibleOrderId,
  eligibleOrderItemId,
}: Props) {
  const dict = getDictionary(locale);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function submitRating() {
    if (!eligibleOrderId || !eligibleOrderItemId || stars < 1) return;
    setSubmitting(true);
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getConsentHeader() },
      body: JSON.stringify({ productId, orderId: eligibleOrderId, orderItemId: eligibleOrderItemId, stars }),
    });
    setSubmitting(false);
    if (res.ok) {
      toast.success(dict['product.ratings.submitted'] ?? 'Rating submitted');
      window.location.reload();
    } else {
      const data = await res.json();
      toast.error(data.error ?? 'Could not submit rating');
    }
  }

  return (
    <section className="mt-12 rounded-xl bg-brand-honey-muted p-6">
      <h2 className="font-display text-display-sm">{dict['product.ratings.title'] ?? 'Customer ratings'}</h2>
      <div className="mt-4 flex items-center gap-3">
        <StarRating rating={averageRating} size={20} />
        <span className="text-sm text-muted-foreground">
          {reviewCount > 0 ? `${averageRating.toFixed(1)} (${reviewCount})` : (dict['product.ratings.none'] ?? 'No ratings yet')}
        </span>
      </div>
      {canRate && eligibleOrderId && eligibleOrderItemId ? (
        <div className="mt-6">
          <p className="text-sm mb-2">{dict['product.ratings.yourRating'] ?? 'Your rating'}</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className="p-1"
                onMouseEnter={() => setHover(n)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setStars(n)}
              >
                <StarRating rating={hover || stars >= n ? n : 0} size={24} />
              </button>
            ))}
          </div>
          <Button className="mt-4" disabled={stars < 1 || submitting} onClick={submitRating}>
            {submitting ? (dict['loading.checkout'] ?? 'Processing…') : (dict['product.ratings.submit'] ?? 'Submit rating')}
          </Button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {dict['product.ratings.eligibility'] ?? 'Purchase and receive this product to leave a rating.'}
        </p>
      )}
    </section>
  );
}
