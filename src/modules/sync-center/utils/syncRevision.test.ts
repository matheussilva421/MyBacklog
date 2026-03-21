import { describe, it, expect, beforeEach } from "vitest";
import { db } from "../../../core/db";
import { getLocalRevision, incrementLocalRevision } from "./syncRevision";

describe("syncRevision", () => {
  beforeEach(async () => {
    // Limpar revisão inicial
    await db.settings.where("key").equals("localRevision").delete();
  });

  it("deve retornar 0 quando não há revisão salva", async () => {
    const revision = await getLocalRevision();
    expect(revision).toBe(0);
  });

  it("deve incrementar revisão corretamente", async () => {
    const rev1 = await incrementLocalRevision();
    expect(rev1).toBe(1);

    const rev2 = await incrementLocalRevision();
    expect(rev2).toBe(2);

    // Aguardar um microtask para garantir que o DB foi atualizado
    await new Promise(resolve => setTimeout(resolve, 10));

    const stored = await getLocalRevision();
    expect(stored).toBe(2);
  });

  it("deve persistir revisão entre chamadas", async () => {
    await incrementLocalRevision();
    await incrementLocalRevision();

    // Aguardar um microtask para garantir que o DB foi atualizado
    await new Promise(resolve => setTimeout(resolve, 10));

    // Nova "instância" - simular leitura fresca do DB
    const revision = await getLocalRevision();
    expect(revision).toBe(2);
  });
});
