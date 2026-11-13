import type { GuardContext } from '../features/auth';

/** Available to every route's beforeLoad/loader: the auth controller and the query client. */
export type RouterContext = GuardContext;
