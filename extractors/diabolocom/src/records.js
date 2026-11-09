// Turns API rows into { headers, records }, optionally prefixed with a date column for the period.
export function toRecords(rows, columns = [], dateColumn = null, dateLabel = null) {
  const available = Object.keys(rows[0] ?? {});
  const selected = columns.length ? columns : available.map((field) => ({ field, header: field }));

  const unknown = rows.length ? selected.filter((c) => !available.includes(c.field)) : [];
  if (unknown.length) {
    throw new Error(`Unknown field(s) ${unknown.map((c) => c.field).join(', ')}. Available: ${available.join(', ')}`);
  }

  const headers = [...(dateColumn ? [dateColumn] : []), ...selected.map((c) => c.header)];
  const records = rows.map((row) => ({
    ...(dateColumn ? { [dateColumn]: dateLabel } : {}),
    ...Object.fromEntries(selected.map((c) => [c.header, row[c.field] ?? null])),
  }));
  return { headers, records };
}
