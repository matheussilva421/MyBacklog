import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import { cloudDb } from "./firebase";

/**
 * Sync incremental por entidade no Firestore.
 * Em vez de substituir o snapshot inteiro, cada entidade é sincronizada individualmente.
 */

// Mapeamento de nomes de tabelas locais para coleções Firestore
const COLLECTION_MAP: Record<string, string> = {
  games: "games",
  libraryEntries: "library-entries",
  playSessions: "play-sessions",
  reviews: "reviews",
  lists: "lists",
  tags: "tags",
  stores: "stores",
  platforms: "platforms",
  goals: "goals",
  savedViews: "saved-views",
  importJobs: "import-jobs",
  libraryEntryStores: "library-entry-stores",
  libraryEntryLists: "library-entry-lists",
  gameTags: "game-tags",
  gamePlatforms: "game-platforms",
};

function getCollectionPath(uid: string, collectionName: string): string {
  return `users/${uid}/${collectionName}`;
}

function getEntityDocRef(uid: string, collectionName: string, uuid: string) {
  const firestore = cloudDb;
  if (!firestore) {
    throw new Error("Firestore não configurado");
  }
  return doc(firestore, getCollectionPath(uid, collectionName), uuid);
}

/**
 * Push de uma única entidade para o Firestore.
 * Usa setDoc com merge para criar ou atualizar.
 */
export async function pushEntityToCloud<
  T extends { uuid: string; version: number; updatedAt: string; deletedAt?: string | null },
>(uid: string, tableName: string, entity: T): Promise<void> {
  const firestore = cloudDb;
  if (!firestore) {
    throw new Error("Firestore não configurado");
  }

  const collectionName = COLLECTION_MAP[tableName];
  if (!collectionName) {
    throw new Error(`Coleção não mapeada para tabela: ${tableName}`);
  }

  const docRef = getEntityDocRef(uid, collectionName, entity.uuid);

  // Converter timestamp para formato do Firestore
  const entityWithTimestamp = {
    ...entity,
    updatedAt: Timestamp.fromDate(new Date(entity.updatedAt)),
    createdAt: Object.hasOwn(entity, "createdAt")
      ? Timestamp.fromDate(new Date((entity as { createdAt: string }).createdAt))
      : Timestamp.now(),
  };

  await setDoc(docRef, entityWithTimestamp, { merge: true });
}

/**
 * Pull de entidades modificadas desde um timestamp.
 * Retorna apenas entidades com updatedAt > since.
 */
export async function pullEntitiesFromCloud<T extends { uuid: string; version: number; updatedAt: string }>(
  uid: string,
  tableName: string,
  since?: string,
): Promise<T[]> {
  const firestore = cloudDb;
  if (!firestore) {
    throw new Error("Firestore não configurado");
  }

  const collectionName = COLLECTION_MAP[tableName];
  if (!collectionName) {
    throw new Error(`Coleção não mapeada para tabela: ${tableName}`);
  }

  const collectionRef = collection(firestore, getCollectionPath(uid, collectionName));

  let q;
  if (since) {
    const sinceTimestamp = Timestamp.fromDate(new Date(since));
    q = query(collectionRef, where("updatedAt", ">", sinceTimestamp));
  } else {
    q = query(collectionRef);
  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data() as DocumentData;
    return {
      ...data,
      updatedAt: (data.updatedAt as Timestamp).toDate().toISOString(),
      createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate().toISOString() : undefined,
      uuid: docSnap.id,
    } as unknown as T;
  });
}

/**
 * Delete lógico de uma entidade (tombstone).
 * Marca deletedAt no Firestore em vez de remover o documento.
 */
export async function deleteEntityInCloud(
  uid: string,
  tableName: string,
  uuid: string,
  deletedAt: string,
): Promise<void> {
  const firestore = cloudDb;
  if (!firestore) {
    throw new Error("Firestore não configurado");
  }

  const collectionName = COLLECTION_MAP[tableName];
  if (!collectionName) {
    throw new Error(`Coleção não mapeada para tabela: ${tableName}`);
  }

  const docRef = getEntityDocRef(uid, collectionName, uuid);

  await updateDoc(docRef, {
    deletedAt: Timestamp.fromDate(new Date(deletedAt)),
    updatedAt: Timestamp.fromDate(new Date(deletedAt)),
  });
}

/**
 * Delete permanente de uma entidade do Firestore.
 * Usar apenas para cleanup de tombstones antigos.
 */
export async function hardDeleteEntityInCloud(uid: string, tableName: string, uuid: string): Promise<void> {
  const firestore = cloudDb;
  if (!firestore) {
    throw new Error("Firestore não configurado");
  }

  const collectionName = COLLECTION_MAP[tableName];
  if (!collectionName) {
    throw new Error(`Coleção não mapeada para tabela: ${tableName}`);
  }

  const docRef = getEntityDocRef(uid, collectionName, uuid);
  await deleteDoc(docRef);
}

/**
 * Push em lote de múltiplas entidades.
 * Nota: Firestore não tem bulkWrite, então fazemos múltiplos setDoc em paralelo.
 */
export async function batchPushEntitiesToCloud<
  T extends { uuid: string; version: number; updatedAt: string; deletedAt?: string | null },
>(uid: string, tableName: string, entities: T[], concurrencyLimit: number = 10): Promise<void> {
  // Executar pushes com limite de concorrência para evitar rate limiting
  const chunks: T[][] = [];
  for (let i = 0; i < entities.length; i += concurrencyLimit) {
    chunks.push(entities.slice(i, i + concurrencyLimit));
  }

  for (const chunk of chunks) {
    await Promise.all(chunk.map((entity) => pushEntityToCloud(uid, tableName, entity)));
  }
}

/**
 * Pull de todas as entidades de uma coleção.
 * Útil para sync inicial ou quando não há since timestamp.
 */
export async function pullAllEntitiesFromCloud<T extends { uuid: string; version: number; updatedAt: string }>(
  uid: string,
  tableName: string,
): Promise<T[]> {
  return pullEntitiesFromCloud(uid, tableName, undefined);
}

/**
 * Obtém o timestamp da última sincronização para uma coleção.
 * Armazenado em um documento especial de metadados.
 */
export async function getLastSyncTimestamp(uid: string, tableName: string): Promise<string | null> {
  const firestore = cloudDb;
  if (!firestore) {
    throw new Error("Firestore não configurado");
  }

  const collectionName = COLLECTION_MAP[tableName];
  if (!collectionName) {
    throw new Error(`Coleção não mapeada para tabela: ${tableName}`);
  }

  // Documento de metadados de sync
  const metadataRef = doc(firestore, `users/${uid}/_sync_metadata`, collectionName);
  const snap = await getDoc(metadataRef);

  if (snap.exists()) {
    const data = snap.data() as DocumentData;
    return data.lastSyncAt ? (data.lastSyncAt as Timestamp).toDate().toISOString() : null;
  }

  return null;
}

/**
 * Atualiza o timestamp da última sincronização.
 */
export async function updateLastSyncTimestamp(uid: string, tableName: string, timestamp: string): Promise<void> {
  const firestore = cloudDb;
  if (!firestore) {
    throw new Error("Firestore não configurado");
  }

  const collectionName = COLLECTION_MAP[tableName];
  if (!collectionName) {
    throw new Error(`Coleção não mapeada para tabela: ${tableName}`);
  }

  const metadataRef = doc(firestore, `users/${uid}/_sync_metadata`, collectionName);
  await setDoc(
    metadataRef,
    {
      lastSyncAt: Timestamp.fromDate(new Date(timestamp)),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
}
