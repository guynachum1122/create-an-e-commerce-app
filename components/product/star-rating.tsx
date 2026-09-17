import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

export function StarRating({ rating, size = 16, className }: { rating: number; size?: number; className?: string }) {
  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(i <= Math.round(rating) ? 'fill-brand-honey text-brand-honey' : 'text-muted-foreground/30')}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}
