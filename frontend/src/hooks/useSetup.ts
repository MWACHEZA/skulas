import { useContext } from 'react';
import { SetupContext } from '../context/SetupContextCore';

export const useSetup = () => {
  const context = useContext(SetupContext);
  if (!context) {
    throw new Error('useSetup must be used within a SetupProvider');
  }
  return context;
};
