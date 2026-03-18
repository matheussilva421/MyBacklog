import { db } from "../../../core/db";

export async function upsertSettingsRows(pairs: Array<{ key: string; value: string }>) {
  const existingRows = await db.settings.toArray();
  const existingByKey = new Map(existingRows.map((row) => [row.key, row] as const));

  for (const pair of pairs) {
    const existing = existingByKey.get(pair.key);
    if (existing?.id != null) {
      await db.settings.update(existing.id, {
        value: pair.value,
        updatedAt: new Date().toISOString(),
      });
      continue;
    }

    await db.settings.add({
      key: pair.key,
      value: pair.value,
      updatedAt: new Date().toISOString(),
    });
  }
}
