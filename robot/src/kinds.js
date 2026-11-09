// One entry per kind of source: where its items go in the API payload (payloadKey) and how a
// picked record (the configured field keys, already resolved from the extractor headers)
// becomes one payload item. Adding a kind of source means adding an entry here.

// "29/10/2026" -> "2026-10-29"; ISO days pass through.
export function toIsoDay(value) {
  const text = String(value ?? '').trim();
  const fr = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  throw new Error(`Unrecognized date "${text}"`);
}

const text = (value) => (value === undefined || value === null ? undefined : String(value));

export const KINDS = {
  sales: {
    payloadKey: 'sales',
    map: (s) => ({
      externalId: text(s.externalId),
      agentName: text(s.agentName),
      opportunityName: text(s.opportunityName),
      phone: text(s.phone),
      recordType: text(s.recordType),
      offer: text(s.offer),
      provider: text(s.provider),
      stage: text(s.stage),
      date: toIsoDay(s.date),
    }),
  },
  leads: {
    payloadKey: 'leads',
    map: (l) => ({ agentEmail: text(l.agentEmail), leads: Number(l.leads) || 0, date: toIsoDay(l.date) }),
  },
  kpis: {
    payloadKey: 'kpis',
    // A null value is meaningful: the source has no data right now.
    map: (k) => ({ key: text(k.key), value: k.value === undefined ? null : Number(k.value), date: toIsoDay(k.date) }),
  },
};

export const knownKinds = () => Object.keys(KINDS);

export function kindOf(kind) {
  const entry = KINDS[kind];
  if (!entry) throw new Error(`Unknown source kind "${kind}" (known kinds: ${knownKinds().join(', ')})`);
  return entry;
}

// The empty payload lists, one per kind, so the API always receives every key.
export const emptyPayloadLists = () => Object.fromEntries(Object.values(KINDS).map((k) => [k.payloadKey, []]));
