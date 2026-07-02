function padDatePart(value: number): string {
  return value.toString().padStart(2, "0");
}

export function toLocalDateKey(value: Date): string {
  return [
    value.getFullYear().toString(),
    padDatePart(value.getMonth() + 1),
    padDatePart(value.getDate()),
  ].join("-");
}

export function matchesInstallationDateRange(
  installationDate: Date | null,
  installationFrom: string,
  installationTo: string,
): boolean {
  if (!installationFrom && !installationTo) {
    return true;
  }

  if (!installationDate) {
    return false;
  }

  const installationDateKey = toLocalDateKey(installationDate);

  if (installationFrom && installationDateKey < installationFrom) {
    return false;
  }

  if (installationTo && installationDateKey > installationTo) {
    return false;
  }

  return true;
}
