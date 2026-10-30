// Turns extractor output records (keyed by column header) into API payload items.

// "29/10/2026" -> "2026-10-29"; ISO days pass through.
export function toIsoDay(value) {
  const text = String(value ?? '').trim();
  const fr = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  throw new Error(`Unrecognized date "${text}"`);
}

// A field maps to one header, or to a list of headers where the first non-empty value wins.
function pick(record, headers) {
  for (const header of [headers].flat()) {
    const value = record[header];
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return undefined;
}

const text = (value) => (value === undefined || value === null ? undefined : String(value));

export function mapRecords(kind, records, fields) {
  const item = (record) => Object.fromEntries(Object.entries(fields).map(([key, headers]) => [key, pick(record, headers)]));

  if (kind === 'sales') {
    return records.map(item).map((s) => ({
      externalId: text(s.externalId),
      agentName: text(s.agentName),
      opportunityName: text(s.opportunityName),
      phone: text(s.phone),
      recordType: text(s.recordType),
      offer: text(s.offer),
      provider: text(s.provider),
      stage: text(s.stage),
      date: toIsoDay(s.date),
    }));
  }
  if (kind === 'leads') {
    return records.map(item).map((l) => ({ agentEmail: text(l.agentEmail), leads: Number(l.leads) || 0, date: toIsoDay(l.date) }));
  }
  throw new Error(`Unknown source kind "${kind}" (expected sales or leads)`);
}
