import { PageHeaderSkeleton, TextSkeleton } from '../shared/ui/skeletons';

/** Shown while a route's guards or loaders are still running (skeletons, not spinners). */
export function PendingScreen() {
  return (
    <>
      <PageHeaderSkeleton />
      <TextSkeleton lines={4} />
    </>
  );
}
