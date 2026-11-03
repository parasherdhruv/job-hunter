/** Removes duplicates, trims and drops empty entries from a string list. */
export function normalizeStringList(values: readonly string[] | null | undefined): string[] {
  if (!values) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/** Lower-cases and trims a value for case-insensitive comparisons. */
export function normalizeToken(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase();
}
