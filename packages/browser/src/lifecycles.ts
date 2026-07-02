export const lifecycleOptions = [
  "Bestellt",
  "Verschickt",
  "Verbaut",
  "Aktiviert",
  "Online",
  "Online mit Problem",
  "Offline",
  "Storniert",
] as const;

export type LifecycleOption = (typeof lifecycleOptions)[number];
