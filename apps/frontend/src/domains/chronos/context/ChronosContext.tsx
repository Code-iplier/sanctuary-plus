import React, { createContext, useContext } from 'react';
import { useChronos as useChronosImpl, type UseChronosReturn } from '../hooks/useChronos';

const ChronosContext = createContext<UseChronosReturn | null>(null);

export function ChronosProvider({ children }: { children: React.ReactNode }) {
  const value = useChronosImpl();
  return <ChronosContext.Provider value={value}>{children}</ChronosContext.Provider>;
}

export function useChronosContext(): UseChronosReturn {
  const ctx = useContext(ChronosContext);
  if (!ctx) throw new Error('useChronosContext must be used within ChronosProvider');
  return ctx;
}
