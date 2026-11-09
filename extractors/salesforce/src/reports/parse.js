// Turns an Analytics API report result into { headers, records }.

export function describeColumns(result) {
  const names = result.reportMetadata?.detailColumns ?? [];
  const info = result.reportExtendedMetadata?.detailColumnInfo ?? {};
  return names.map((name) => ({ column: name, header: info[name]?.label ?? name }));
}

// Tabular reports keep rows in "T!T"; summary reports keep them per grouping ("0!T", "1!T", ...).
function allRows(factMap) {
  return Object.values(factMap ?? {}).flatMap((entry) => entry.rows ?? []);
}

function cellValue(cell, use) {
  if (!cell) return null;
  if (use === 'value') return cell.value;
  return cell.value === null && cell.label === '-' ? '' : cell.label;
}

// idColumn ({ column, header }) adds the raw value of that cell first, e.g. the opportunity record id,
// which stays stable when names change and lets consumers skip rows they already have.
export function toRecords(result, columns = [], idColumn = null) {
  if (result.allData === false) {
    throw new Error('Salesforce returned partial data (report runs are capped at 2,000 rows); narrow the filters');
  }
  const available = describeColumns(result);
  if (available.length === 0) throw new Error('Report result has no detail columns (reportMetadata.detailColumns)');

  const position = new Map(available.map((c, i) => [c.column, i]));
  const selected = [
    ...(idColumn ? [{ ...idColumn, use: 'value' }] : []),
    ...(columns.length ? columns : available),
  ];
  const unknown = selected.filter((c) => !position.has(c.column));
  if (unknown.length) {
    throw new Error(
      `Unknown column(s) ${unknown.map((c) => c.column).join(', ')}. Available: ${available.map((c) => c.column).join(', ')}`,
    );
  }

  const records = allRows(result.factMap).map((row) =>
    Object.fromEntries(selected.map((c) => [c.header, cellValue(row.dataCells[position.get(c.column)], c.use)])),
  );
  return { headers: selected.map((c) => c.header), records };
}
