import React, { useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import { SetupContext, type EnabledModules, type SetupStatus, type RoleOrientation, type SetupContextType } from './SetupContextCore';

export type { EnabledModules, SetupStatus, RoleOrientation, SetupContextType };

export const SetupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [setupStatus, setSetupStatus] = useState<SetupStatus | null>(null);
  const [roleOrientation, setRoleOrientation] = useState<RoleOrientation | null>(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const refreshSetupStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('acadex_token');
      if (!token) {
        setLoading(false);
        return;
      }

      const [statusRes, orientationRes] = await Promise.allSettled([
        api.get('/api/setup/status'),
        api.get('/api/setup/role-orientation')
      ]);

      if (statusRes.status === 'fulfilled') {
        setSetupStatus(statusRes.value.data);
        setOffline(false);
      } else {
        // Network error or server unreachable — mark as offline
        const err = statusRes.reason;
        const isNetworkError = !err?.response; // axios sets response only when server responded
        if (isNetworkError) setOffline(true);
      }
      if (orientationRes.status === 'fulfilled') {
        setRoleOrientation(orientationRes.value.data);
      }
    } catch (err) {
      console.error('Failed to fetch setup status:', err);
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSetupStatus();
  }, [refreshSetupStatus]);

  const updateStage = async (stageKey: string, completed: boolean = true, currentStep?: number) => {
    try {
      await api.post('/api/setup/update-stage', { stageKey, completed, currentStep });
      await refreshSetupStatus();
    } catch (err) {
      console.error('Failed to update setup stage:', err);
    }
  };

  const updateModules = async (modules: Partial<EnabledModules>) => {
    try {
      await api.post('/api/setup/modules', { enabledModules: modules });
      await refreshSetupStatus();
    } catch (err) {
      console.error('Failed to update modules:', err);
    }
  };

  const seedCOA = async (): Promise<boolean> => {
    try {
      await api.post('/api/setup/seed-coa');
      await refreshSetupStatus();
      return true;
    } catch (err) {
      console.error('Failed to seed COA:', err);
      return false;
    }
  };

  const dismissRoleOrientation = async () => {
    try {
      await api.post('/api/setup/dismiss-orientation');
      setRoleOrientation(prev => prev ? { ...prev, dismissed: true } : null);
    } catch (err) {
      console.error('Failed to dismiss role orientation:', err);
    }
  };

  return (
    <SetupContext.Provider value={{
      setupStatus,
      loading,
      offline,
      refreshSetupStatus,
      updateStage,
      updateModules,
      seedCOA,
      roleOrientation,
      dismissRoleOrientation
    }}>
      {children}
    </SetupContext.Provider>
  );
};
