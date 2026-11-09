// Turns extractor output records (keyed by column header) into API payload items.
import { kindOf } from './kinds.js';

export { toIsoDay } from './kinds.js';

// A field maps to one header, or to a list of headers where the first non-empty value wins.
function pick(record, headers) {
  for (const header of [headers].flat()) {
    const value = record[header];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return undefined;
}

export function mapRecords(kind, records, fields) {
  const { map } = kindOf(kind);
  const item = (record) => Object.fromEntries(Object.entries(fields).map(([key, headers]) => [key, pick(record, headers)]));
  return records.map(item).map(map);
}
