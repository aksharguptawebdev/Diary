import React, { createContext, useContext, useState, useEffect } from "react";
import { syncService, SyncStatusState } from "../services/syncService";
import { networkService } from "../services/network";
import { getCurrentBaseUrl, updateBaseUrl } from "../services/api";

interface SyncContextType extends SyncStatusState {
  serverUrl: string;
  syncNow: () => Promise<void>;
  updateServerUrl: (url: string) => Promise<void>;
  testConnection: () => Promise<boolean>;
}

const SyncContext = createContext<SyncContextType | null>(null);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<SyncStatusState>(
    syncService.getStatus(),
  );
  const [serverUrl, setServerUrl] = useState<string>("");

  useEffect(() => {
    // Load initial server URL
    getCurrentBaseUrl().then(setServerUrl);

    // Subscribe to sync service state updates
    const unsubscribe = syncService.addListener((newStatus) => {
      setStatus(newStatus);
    });

    return unsubscribe;
  }, []);

  const handleSyncNow = async () => {
    await syncService.sync();
  };

  const handleUpdateServerUrl = async (newUrl: string) => {
    await updateBaseUrl(newUrl);
    setServerUrl(newUrl);
    // After changing URL, trigger a sync to pull
    if (networkService.online) {
      await syncService.sync();
    }
  };

  const handleTestConnection = async () => {
    return networkService.checkServerConnection();
  };

  return (
    <SyncContext.Provider
      value={{
        ...status,
        serverUrl,
        syncNow: handleSyncNow,
        updateServerUrl: handleUpdateServerUrl,
        testConnection: handleTestConnection,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
}
