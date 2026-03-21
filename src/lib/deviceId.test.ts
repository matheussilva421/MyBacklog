import { describe, it, expect, beforeEach } from "vitest";
import { getDeviceId, clearDeviceId } from "./deviceId";

describe("deviceId", () => {
  beforeEach(async () => {
    await clearDeviceId();
  });

  it("deve gerar deviceId na primeira chamada", async () => {
    const id1 = await getDeviceId();
    expect(id1).toMatch(/^device-\d+-[a-z0-9]+$/);
  });

  it("deve retornar mesmo deviceId em chamadas subsequentes", async () => {
    const id1 = await getDeviceId();
    const id2 = await getDeviceId();
    expect(id1).toBe(id2);
  });

  it("deve gerar novo deviceId após clear", async () => {
    const id1 = await getDeviceId();
    await clearDeviceId();
    const id2 = await getDeviceId();
    expect(id1).not.toBe(id2);
  });
});
