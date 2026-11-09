// Diabolocom expects local times with an explicit offset, e.g. 2026-10-30T00:00:00.000+0100.

export const PERIODS = ['today', 'yesterday'];

const pad = (n, size = 2) => String(n).padStart(size, '0');

function offsetOf(instant, timeZone) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(instant)
    .find((p) => p.type === 'timeZoneName').value; // "GMT+01:00" or "GMT"
  const match = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  return match ? `${match[1]}${match[2]}${match[3]}` : '+0000';
}

function partsIn(instant, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
    }).formatToParts(instant).map((p) => [p.type, p.value]),
  );
  return { ...parts, ms: pad(instant.getUTCMilliseconds(), 3) };
}

export function formatInZone(instant, timeZone) {
  const p = partsIn(instant, timeZone);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}.${p.ms}${offsetOf(instant, timeZone)}`;
}

// Local wall-clock time on a given calendar day; the offset is the one in force at that time.
function localTime(year, month, day, time, timeZone) {
  const approx = new Date(Date.UTC(year, month - 1, day, 12));
  const date = `${approx.getUTCFullYear()}-${pad(approx.getUTCMonth() + 1)}-${pad(approx.getUTCDate())}`;
  return { date, text: `${date}T${time}${offsetOf(approx, timeZone)}` };
}

// Returns { startDate, endDate, label } for the period, label being the day as dd/mm/yyyy.
export function resolvePeriod(period, timeZone, now = new Date()) {
  const today = partsIn(now, timeZone);
  const [y, m, d] = [Number(today.year), Number(today.month), Number(today.day)];
  const dayOffset = { today: 0, yesterday: -1 }[period];
  if (dayOffset === undefined) throw new Error(`Unknown period "${period}" (expected ${PERIODS.join(', ')})`);

  const start = localTime(y, m, d + dayOffset, '00:00:00.000', timeZone);
  const endDate = period === 'today' ? formatInZone(now, timeZone) : localTime(y, m, d + dayOffset, '23:59:59.999', timeZone).text;
  const [yy, mm, dd] = start.date.split('-');
  return { startDate: start.text, endDate, label: `${dd}/${mm}/${yy}` };
}
