function startOfLocalWeek(value: Date): Date {
  const start = new Date(value);
  start.setHours(0, 0, 0, 0);

  const day = start.getDay();
  const daysSinceMonday = (day + 6) % 7;
  start.setDate(start.getDate() - daysSinceMonday);

  return start;
}

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

export function isInstallationDue(installationDate: Date | null, now: Date): boolean {
  if (!installationDate) {
    return false;
  }

  const currentWeekStart = startOfLocalWeek(now);
  const weekAfterNextStart = addDays(currentWeekStart, 14);

  return installationDate >= currentWeekStart && installationDate < weekAfterNextStart;
}
