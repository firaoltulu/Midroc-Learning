import { LoadingIndicator } from '../shared/ui/loading-indicator';

/** Shown while a route's guards or loaders are still running. */
export function PendingScreen() {
  return <LoadingIndicator />;
}
