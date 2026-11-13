import { QueryClient } from '@tanstack/react-query';
import { queryClientDefaults } from '../shared/api/query-defaults';

export function createQueryClient() {
  return new QueryClient({ defaultOptions: queryClientDefaults });
}
