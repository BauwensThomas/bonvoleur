// Planning de publication, en heure de Bruxelles (change tout seul entre heure
// d'hiver et d'été). Les crons Vercel tournent en UTC : ils sont donc lancés aux
// DEUX heures UTC possibles (vercel.json) et ce module décide si c'est
// réellement l'heure. Le contrôle "déjà fait" est assuré par l'appelant
// (agent_runs), ce qui rend le double déclenchement sans effet.
//
//   Article de blog : lundi, mercredi, vendredi 18h00 ; dimanche 8h30
//   Post réseaux    : 2 h après (20h00, 20h00, 20h00, 10h30)

export const SCHEDULE_TZ = "Europe/Brussels";

// 0 = dimanche ... 6 = samedi
const BLOG_SLOTS: Record<number, { hour: number; minute: number }> = {
  1: { hour: 18, minute: 0 },
  3: { hour: 18, minute: 0 },
  5: { hour: 18, minute: 0 },
  0: { hour: 8, minute: 30 },
};

export const SOCIAL_DELAY_MINUTES = 120;
// Un cron peut démarrer avec du retard : le créneau reste valable ce temps-là.
export const SLOT_WINDOW_MINUTES = 150;

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function brusselsParts(date: Date) {
  const f = new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHEDULE_TZ,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    weekday: WEEKDAYS[p.weekday as string],
    year: Number(p.year),
    month: Number(p.month),
    day: Number(p.day),
    hour: Number(p.hour),
    minute: Number(p.minute),
    second: Number(p.second),
  };
}

// Début (UTC) du créneau de blog du jour de Bruxelles de `now`, ou null si ce
// jour n'a pas de créneau.
export function blogSlotStart(now: Date): Date | null {
  const p = brusselsParts(now);
  const slot = BLOG_SLOTS[p.weekday];
  if (!slot) return null;
  const offsetMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(p.year, p.month - 1, p.day, slot.hour, slot.minute) - offsetMs);
}

function inWindow(now: Date, start: Date | null, delayMinutes: number): Date | null {
  if (!start) return null;
  const from = start.getTime() + delayMinutes * 60000;
  const to = from + SLOT_WINDOW_MINUTES * 60000;
  return now.getTime() >= from && now.getTime() < to ? start : null;
}

// Créneau de publication d'article en cours (sinon null).
export function dueBlogSlot(now: Date = new Date()): Date | null {
  return inWindow(now, blogSlotStart(now), 0);
}

// Créneau de post réseaux en cours (2 h après l'article du jour), sinon null.
export function dueSocialSlot(now: Date = new Date()): Date | null {
  return inWindow(now, blogSlotStart(now), SOCIAL_DELAY_MINUTES);
}
