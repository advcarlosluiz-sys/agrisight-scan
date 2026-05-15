import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { offlineDB, type PendingPhoto } from "./offline-db";
import { initSyncQueue, subscribeSyncQueue } from "./sync-queue";

export function usePendingPhotos(inspecaoId?: string): PendingPhoto[] {
  const items = useLiveQuery(
    () =>
      inspecaoId
        ? offlineDB.pendingPhotos.where("inspecao_id").equals(inspecaoId).sortBy("created_at")
        : offlineDB.pendingPhotos.orderBy("created_at").toArray(),
    [inspecaoId],
    [] as PendingPhoto[],
  );
  return items ?? [];
}

export function useSyncQueueState() {
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    initSyncQueue();
    const unsub = subscribeSyncQueue((s) => setProcessing(s.processing));
    return () => {
      unsub();
    };
  }, []);
  return { processing };
}
