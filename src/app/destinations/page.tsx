'use client';

import { Suspense } from 'react';

import DestinationsInner from './DestinationsInner';
import { Skeleton } from '@/components/ui';

export default function DestinationsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-12 md:px-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="mt-3 h-5 w-96 max-w-full" />
          <Skeleton className="mt-8 h-40 w-full" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        </div>
      }
    >
      <DestinationsInner />
    </Suspense>
  );
}
