import type { components, paths } from './generated/schema';

/**
 * Type helpers over the generated OpenAPI types (`npm run gen:api`). Request bodies and query
 * parameters are typed from the contract. Most responses have no schema in openapi.yaml, so
 * features describe responses with zod schemas and validate them at runtime.
 */

export type ApiPath = keyof paths;
type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';

type Operation<P extends ApiPath, M extends Method> = paths[P][M] extends infer O
  ? O extends { parameters: unknown }
    ? O
    : never
  : never;

/** JSON body of `M P`, e.g. `RequestBody<'/courses', 'post'>`. */
export type RequestBody<P extends ApiPath, M extends Method> =
  Operation<P, M> extends { requestBody?: { content: { 'application/json': infer B } } }
    ? B
    : never;

/** Query parameters of `M P`, e.g. `QueryParams<'/courses', 'get'>`. */
export type QueryParams<P extends ApiPath, M extends Method> =
  Operation<P, M> extends { parameters: { query?: infer Q } } ? NonNullable<Q> : never;

/** A named schema from components.schemas, e.g. `Schema<'CourseCreate'>`. */
export type Schema<N extends keyof components['schemas']> = components['schemas'][N];

/** The paginated list envelope every list endpoint returns. */
export interface Page<T> {
  page: number;
  pageSize: number;
  total: number;
  items: T[];
}
