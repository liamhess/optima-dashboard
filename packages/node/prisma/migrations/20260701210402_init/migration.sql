-- CreateTable
CREATE TABLE "Device" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
