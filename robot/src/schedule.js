// Slots between "from" and "to" every N minutes, in the configured time zone (e.g. 10:00, 12:00 ... 20:00).

const minutesOf = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

function localMinutes(date, timeZone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
      .formatToParts(date)
      .map((p) => [p.type, Number(p.value)]),
  );
  return parts.hour * 60 + parts.minute + parts.second / 60;
}

export function slots({ from, to, everyMinutes }) {
  const list = [];
  for (let m = minutesOf(from); m <= minutesOf(to); m += everyMinutes) list.push(m);
  return list;
}

/** Milliseconds until the next slot after `now` (tomorrow's first slot when today's are over). */
export function msUntilNextSlot(schedule, now = new Date()) {
  const current = localMinutes(now, schedule.timeZone);
  const all = slots(schedule);
  const next = all.find((m) => m > current + 1 / 60) ?? all[0] + 24 * 60;
  return Math.round((next - current) * 60_000);
}
