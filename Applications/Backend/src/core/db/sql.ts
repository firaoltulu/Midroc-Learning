import type { Queryable } from './pool.js';

const identifier = /^[a-z_][a-z0-9_]*$/;

export async function updateRow(
  queryable: Queryable,
  table: string,
  idColumn: string,
  id: string,
  columnMap: Readonly<Record<string, string>>,
  values: Readonly<Record<string, unknown>>
): Promise<void> {
  if (!identifier.test(table) || !identifier.test(idColumn)) {
    throw new Error('Invalid SQL identifier');
  }
  const entries = Object.entries(values);
  if (entries.length === 0) return;
  for (const [key] of entries) {
    const column = columnMap[key];
    if (!column || !identifier.test(column)) {
      throw new Error(`Column is not allowed for update: ${key}`);
    }
  }
  const assignments = entries.map(([key], index) => `"${columnMap[key]}" = $${index + 1}`);
  const parameters = entries.map(([, value]) => value);
  await queryable.query(
    `UPDATE "${table}" SET ${assignments.join(', ')} WHERE "${idColumn}" = $${entries.length + 1}`,
    [...parameters, id]
  );
}

export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

/**
 * Splits rows selected with `count(*) OVER() AS total` into a page: the items (without the
 * window column) and the total row count.
 */
export function toPage<T extends { total: string | number }>(
  rows: T[]
): { items: Array<Omit<T, 'total'>>; total: number } {
  const items = rows.map((row) => {
    const item: Partial<T> = { ...row };
    delete item.total;
    return item as Omit<T, 'total'>;
  });
  return { items, total: Number(rows[0]?.total ?? 0) };
}
