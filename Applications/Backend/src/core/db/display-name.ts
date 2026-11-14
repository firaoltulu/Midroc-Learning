/**
 * SQL for how other learners see a person: first name and last initial ("Sara Tadesse" ->
 * "Sara T."), a single name as it is, NULL without a name. Never the email.
 * `column` is a trusted column reference such as `u.name` (never user input).
 */
export function shortNameSql(column: string): string {
  const parts = `regexp_split_to_array(btrim(${column}), '[[:space:]]+')`;
  return `
    CASE
      WHEN ${column} IS NULL OR btrim(${column}) = '' THEN NULL
      WHEN cardinality(${parts}) = 1 THEN btrim(${column})
      ELSE (${parts})[1] || ' ' || left((${parts})[cardinality(${parts})], 1) || '.'
    END
  `;
}
