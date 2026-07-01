-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Device" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceType" TEXT NOT NULL,
    "lifecycle" TEXT NOT NULL,
    "serialNumber" TEXT,
    "macAddress" TEXT,
    "trackingUrl" TEXT,
    "notes" TEXT,
    "orderedAt" DATETIME,
    "shippedAt" DATETIME,
    "installedAt" DATETIME,
    "activatedAt" DATETIME,
    "lastSeenAt" DATETIME,
    "customerName" TEXT,
    "customerEmail" TEXT,
    "customerState" TEXT,
    "installationType" TEXT,
    "installationDate" DATETIME,
    "lastSyncedAt" DATETIME NOT NULL
);
INSERT INTO "new_Device" ("activatedAt", "customerEmail", "customerName", "customerState", "deviceType", "id", "installationDate", "installationType", "installedAt", "lastSeenAt", "lastSyncedAt", "lifecycle", "macAddress", "notes", "orderedAt", "serialNumber", "shippedAt", "trackingUrl") SELECT "activatedAt", "customerEmail", "customerName", "customerState", "deviceType", "id", "installationDate", "installationType", "installedAt", "lastSeenAt", "lastSyncedAt", "lifecycle", "macAddress", "notes", "orderedAt", "serialNumber", "shippedAt", "trackingUrl" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
