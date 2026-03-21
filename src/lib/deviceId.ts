import { db } from "../core/db";

const DEVICE_ID_KEY = "deviceId";

function generateDeviceId(): string {
  return `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function getDeviceId(): Promise<string> {
  const row = await db.settings.get({ key: DEVICE_ID_KEY });
  if (row?.value) return row.value;

  const newId = generateDeviceId();
  await db.settings.add({
    key: DEVICE_ID_KEY,
    value: newId,
    updatedAt: new Date().toISOString(),
  });

  return newId;
}

export async function clearDeviceId(): Promise<void> {
  await db.settings.where("key").equals(DEVICE_ID_KEY).delete();
}
