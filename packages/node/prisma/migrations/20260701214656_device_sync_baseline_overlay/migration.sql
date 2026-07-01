/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Device` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Device` table. All the data in the column will be lost.
  - Added the required column `lastSyncedAt` to the `Device` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "DeviceOverlay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deviceId" TEXT NOT NULL,
    "lifecycle" TEXT,
    "serialNumber" TEXT,
    "macAddress" TEXT,
    "notes" TEXT,
    "baseLifecycle" TEXT,
    "baseSerialNumber" TEXT,
    "baseMacAddress" TEXT,
    "baseNotes" TEXT,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DeviceOverlay_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

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
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerState" TEXT NOT NULL,
    "installationType" TEXT,
    "installationDate" DATETIME,
    "lastSyncedAt" DATETIME NOT NULL
);
INSERT INTO "new_Device" ("activatedAt", "customerEmail", "customerName", "customerState", "deviceType", "id", "installationDate", "installationType", "installedAt", "lastSeenAt", "lifecycle", "macAddress", "notes", "orderedAt", "serialNumber", "shippedAt", "trackingUrl") SELECT "activatedAt", "customerEmail", "customerName", "customerState", "deviceType", "id", "installationDate", "installationType", "installedAt", "lastSeenAt", "lifecycle", "macAddress", "notes", "orderedAt", "serialNumber", "shippedAt", "trackingUrl" FROM "Device";
DROP TABLE "Device";
ALTER TABLE "new_Device" RENAME TO "Device";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "DeviceOverlay_deviceId_key" ON "DeviceOverlay"("deviceId");
