import { toLocalDateKey } from "./installation-date-range.js";

function addDays(value: Date, days: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

export function isInstallationDue(installationDate: Date | null, now: Date): boolean {
  if (!installationDate) {
    return false;
  }

  const todayDateKey = toLocalDateKey(now);
  const latestIncludedDateKey = toLocalDateKey(addDays(now, 13));
  const installationDateKey = toLocalDateKey(installationDate);

  return installationDateKey >= todayDateKey && installationDateKey <= latestIncludedDateKey;
}
