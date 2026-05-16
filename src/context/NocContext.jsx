import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const NocContext = createContext();

export const useNoc = () => useContext(NocContext);

export const NocProvider = ({ children }) => {
  // Inicializar do localStorage
  const getInitialFilters = () => {
    const saved = localStorage.getItem('noc_filters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          region: parsed.region || 'Todas',
          onlyCritical: parsed.onlyCritical || false,
          search: parsed.search || ''
        };
      } catch (e) {
        return { region: 'Todas', onlyCritical: false, search: '' };
      }
    }
    return { region: 'Todas', onlyCritical: false, search: '' };
  };

  const [filters, setFilters] = useState(getInitialFilters);
  const [recentIncidents, setRecentIncidents] = useState([]);

  // Salvar no localStorage sempre que filters mudar
  useEffect(() => {
    localStorage.setItem('noc_filters', JSON.stringify(filters));
  }, [filters]);

  const addIncident = useCallback((storeName, status) => {
    setRecentIncidents(prev => {
      const newIncident = {
        id: Math.random().toString(36).substring(7),
        storeName,
        status, // 'CAÍDO' ou 'ONLINE'
        time: new Date()
      };
      const updated = [newIncident, ...prev].slice(0, 5); // Manter apenas os últimos 5
      return updated;
    });
  }, []);

  return (
    <NocContext.Provider value={{
      filters, setFilters,
      recentIncidents, addIncident
    }}>
      {children}
    </NocContext.Provider>
  );
};
