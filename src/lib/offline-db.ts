import Dexie, { type Table } from "dexie";

export type PendingPhotoStatus = "pendente" | "enviando" | "erro";

export interface PendingPhoto {
  id: string;
  inspecao_id: string;
  organizacao_id: string;
  tipo_foto: string;
  blob: Blob;
  nome: string;
  content_type: string;
  status: PendingPhotoStatus;
  attempts: number;
  last_error?: string;
  next_attempt_at: number;
  created_at: number;
}

class OfflineDB extends Dexie {
  pendingPhotos!: Table<PendingPhoto, string>;

  constructor() {
    super("agrobotic-offline");
    this.version(1).stores({
      pendingPhotos: "id, inspecao_id, status, next_attempt_at, created_at",
    });
  }
}

export const offlineDB = new OfflineDB();
