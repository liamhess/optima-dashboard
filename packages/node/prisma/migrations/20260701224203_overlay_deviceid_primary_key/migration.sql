/*
  Warnings:

  - The primary key for the `DeviceOverlay` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `DeviceOverlay` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DeviceOverlay" (
    "deviceId" TEXT NOT NULL PRIMARY KEY,
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
INSERT INTO "new_DeviceOverlay" ("baseLifecycle", "baseMacAddress", "baseNotes", "baseSerialNumber", "deviceId", "lifecycle", "macAddress", "notes", "serialNumber", "updatedAt") SELECT "baseLifecycle", "baseMacAddress", "baseNotes", "baseSerialNumber", "deviceId", "lifecycle", "macAddress", "notes", "serialNumber", "updatedAt" FROM "DeviceOverlay";
DROP TABLE "DeviceOverlay";
ALTER TABLE "new_DeviceOverlay" RENAME TO "DeviceOverlay";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
