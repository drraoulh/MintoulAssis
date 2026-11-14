import type {
  ProducerAuthDocKind,
  ProducerAuthDocumentMeta,
  ProducerAuthFields,
  ProducerAuthentication,
  ProducerEntityType,
} from '@/lib/film/types';

export const PRODUCER_AUTH_MAX_BYTES = 4 * 1024 * 1024;
export const PRODUCER_AUTH_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';

const DB_NAME = 'smartmboa_film_auth';
const DB_VERSION = 1;
const STORE = 'documents';

/** Lightweight KYC: no document is mandatory to enter. */
export const COMPANY_REQUIRED: ProducerAuthDocKind[] = [];
export const INDIVIDUAL_REQUIRED: ProducerAuthDocKind[] = [];
/** Optional proof — one is enough for a stronger local badge. */
export const OPTIONAL_PROOF: ProducerAuthDocKind[] = ['rccm', 'cni', 'niu'];
export const OPTIONAL_AGREEMENT: ProducerAuthDocKind[] = ['autorisation', 'quittance'];

export const EMPTY_AUTH_FIELDS: ProducerAuthFields = {
  companyName: '',
  legalRepName: '',
  rccmNumber: '',
  cniNumber: '',
  niuNumber: '',
  authContact: '',
};

export function requiredKinds(entity: ProducerEntityType): ProducerAuthDocKind[] {
  return entity === 'company' ? COMPANY_REQUIRED : INDIVIDUAL_REQUIRED;
}

/** Preferred optional proof slot for the entity type. */
export function preferredProofKind(entity: ProducerEntityType): ProducerAuthDocKind {
  return entity === 'company' ? 'rccm' : 'cni';
}

export function hasRequiredFields(
  entityType: ProducerEntityType,
  fields: ProducerAuthFields,
): boolean {
  const contact = fields.authContact?.trim();
  const niu = fields.niuNumber?.trim();
  if (!contact || !niu) return false;
  if (entityType === 'company') {
    return Boolean(
      fields.companyName?.trim() &&
        fields.legalRepName?.trim() &&
        fields.rccmNumber?.trim(),
    );
  }
  return Boolean(fields.legalRepName?.trim() && fields.cniNumber?.trim());
}

export function computeAuthStatus(
  entityType: ProducerEntityType,
  documents: ProducerAuthDocumentMeta[],
  fields: ProducerAuthFields = EMPTY_AUTH_FIELDS,
): ProducerAuthentication['status'] {
  if (!hasRequiredFields(entityType, fields)) return 'incomplete';
  const kinds = new Set(documents.map((d) => d.kind));
  const hasProof = OPTIONAL_PROOF.some((k) => kinds.has(k));
  const hasAgreement = OPTIONAL_AGREEMENT.some((k) => kinds.has(k));
  if (hasProof || hasAgreement) return 'agreed';
  return 'ready';
}

export function buildAuthentication(
  entityType: ProducerEntityType,
  documents: ProducerAuthDocumentMeta[],
  fields: ProducerAuthFields = EMPTY_AUTH_FIELDS,
  submittedAt?: string,
): ProducerAuthentication {
  return {
    entityType,
    fields: {
      companyName: fields.companyName?.trim() || undefined,
      legalRepName: fields.legalRepName?.trim() || undefined,
      rccmNumber: fields.rccmNumber?.trim() || undefined,
      cniNumber: fields.cniNumber?.trim() || undefined,
      niuNumber: fields.niuNumber?.trim() || undefined,
      authContact: fields.authContact?.trim() || undefined,
    },
    documents,
    status: computeAuthStatus(entityType, documents, fields),
    submittedAt,
    updatedAt: new Date().toISOString(),
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function docKey(kind: ProducerAuthDocKind): string {
  return kind;
}

export async function saveAuthFile(
  kind: ProducerAuthDocKind,
  file: File,
): Promise<ProducerAuthDocumentMeta> {
  if (file.size > PRODUCER_AUTH_MAX_BYTES) {
    throw new Error('FILE_TOO_LARGE');
  }
  const mime = file.type || 'application/octet-stream';
  if (!/^(application\/pdf|image\/(jpeg|png|jpg))$/i.test(mime) && !/\.(pdf|jpe?g|png)$/i.test(file.name)) {
    throw new Error('FILE_TYPE');
  }
  const buffer = await file.arrayBuffer();
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ buffer, mimeType: mime, fileName: file.name }, docKey(kind));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'));
  });
  db.close();
  return {
    kind,
    fileName: file.name,
    mimeType: mime,
    size: file.size,
    uploadedAt: new Date().toISOString(),
  };
}

export async function removeAuthFile(kind: ProducerAuthDocKind): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(docKey(kind));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'));
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function clearAllAuthFiles(): Promise<void> {
  const kinds: ProducerAuthDocKind[] = [
    'rccm',
    'niu',
    'statutes',
    'cni',
    'autorisation',
    'quittance',
  ];
  await Promise.all(kinds.map((k) => removeAuthFile(k)));
}

export async function getAuthFileBlob(
  kind: ProducerAuthDocKind,
): Promise<{ blob: Blob; fileName: string } | null> {
  try {
    const db = await openDb();
    const row = await new Promise<{
      buffer: ArrayBuffer;
      mimeType: string;
      fileName: string;
    } | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(docKey(kind));
      req.onsuccess = () => resolve(req.result as typeof row);
      req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'));
    });
    db.close();
    if (!row?.buffer) return null;
    return {
      blob: new Blob([new Uint8Array(row.buffer)], {
        type: row.mimeType || 'application/octet-stream',
      }),
      fileName: row.fileName || kind,
    };
  } catch {
    return null;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
