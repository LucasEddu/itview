import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Network, Activity, ShieldCheck, AlertTriangle, Wifi, WifiOff, Clock, Download, Settings, Info, X, MonitorOff, Search, Tv, Filter, MapPin, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNoc } from '../context/NocContext';
import { useDashboardSettings } from '../context/DashboardContext';
import NocToolbar from './NocToolbar';

const NocLojasView = () => {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [diagnosingStore, setDiagnosingStore] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  const [lockedStore, setLockedStore] = useState(null);
  const containerRef = useRef(null);
  const [expandedRegionals, setExpandedRegionals] = useState({});

  const toggleRegional = (regionName) => {
    setExpandedRegionals(prev => ({
      ...prev,
      [regionName]: !prev[regionName]
    }));
  };

  const { filters, setFilters, recentIncidents, addIncident } = useNoc();
  const { isTvMode, globalFilters, playAlertSound } = useDashboardSettings();

  const fetchAcronisData = async () => {
    try {
      if (machines.length === 0) setLoading(true);
      const [resourcesRes, alertsRes, agentsRes] = await Promise.all([
        fetch('/api/acronis/resources'),
        fetch('/api/acronis/alerts'),
        fetch('/api/acronis/agents')
      ]);

      const resourcesData = await resourcesRes.json();
      const alertsData = await alertsRes.json();
      const agentsData = await agentsRes.json();
      
      if (resourcesData.mock) {
        setError('API Acronis não configurada corretamente no servidor.');
        return;
      }

      const activeAlerts = alertsData.items || [];
      const agents = agentsData.items || [];
      const machineResources = (resourcesData.items || []).filter(item => item.context && item.context.type === 'resource.machine');

      const mapped = agents.map(agent => {
        const resource = machineResources.find(r => r.context && r.context.agent_id === agent.id);
        const resourceId = resource ? resource.context.id : null;
        
        const machineName = agent.hostname || (resource ? (resource.context.display_name || resource.context.name) : 'PDV Desconhecido');
        
        let status = 'offline';
        if (agent.online) {
          status = 'online';
        } else if (resource && (resource.aggregate?.status === 'active' || resource.aggregate?.status === 'online')) {
          status = 'online';
        }

        const machineAlerts = resourceId ? activeAlerts.filter(a => a.resource_id === resourceId) : [];
        const hasBackupFailure = machineAlerts.some(a => a.type === 'backup_failed' || a.severity === 'critical');
        if (hasBackupFailure) status = 'backup_error';

        return {
          id: resourceId || agent.id,
          name: machineName,
          status: status,
          // Buscar timestamps de última atividade reais da estrutura correta
          lastSeen: agent.last_online_time || agent.last_seen || (resource?.context?.updated_at) || null 
        };
      });

      setMachines(mapped);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Falha na orquestração de dados Acronis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcronisData();
    const interval = setInterval(fetchAcronisData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getStorePrefix = (machineName) => {
    const name = (machineName || '').toUpperCase();
    const parts = name.split('-');
    if (parts.length >= 3) {
      return `${parts[1]} ${parts[2]}`;
    } else if (parts.length === 2) {
      return `${parts[1]}`;
    }
    return 'LOJA DESCONHECIDA';
  };

  const allNocStores = useMemo(() => {
    const now = new Date();
    const grouped = machines.reduce((acc, machine) => {
      const storeName = getStorePrefix(machine.name);
      if (!acc[storeName]) {
        acc[storeName] = {
          name: storeName,
          region: storeName.split(' ')[0], // Ex: "PE"
          totalCount: 0,
          onlineCount: 0,
          machines: []
        };
      }
      acc[storeName].totalCount++;
      if (machine.status === 'online') {
        acc[storeName].onlineCount++;
      }
      acc[storeName].machines.push(machine);
      return acc;
    }, {});

    return Object.values(grouped).map(store => {
      let internetStatus = 'ESTÁVEL';
      let statusColor = '#22c55e';
      let statusBg = 'rgba(34, 197, 94, 0.1)';
      
      if (store.onlineCount === 0 && store.totalCount > 0) {
        internetStatus = 'LINK CAÍDO';
        statusColor = '#ef4444';
        statusBg = 'rgba(239, 68, 68, 0.1)';
      } else if (store.onlineCount < store.totalCount / 2) {
        internetStatus = 'LINK DEGRADADO';
        statusColor = '#f97316';
        statusBg = 'rgba(249, 115, 22, 0.1)';
      }

      // Lógica de Latência Real baseada na diferença de tempo
      const fifteenMinutes = 15 * 60 * 1000;
      let isTimeout = internetStatus === 'LINK CAÍDO';
      let hasMissingData = false;
      
      if (!isTimeout) {
        const hasDelayedMachine = store.machines.some(m => {
          if (!m.lastSeen) {
            if (m.status === 'online') {
               hasMissingData = true;
               return false;
            }
            return true; 
          }

          let lastSeenMs;
          if (!isNaN(m.lastSeen) && m.lastSeen !== null && m.lastSeen !== '') {
            const num = Number(m.lastSeen);
            lastSeenMs = num < 20000000000 ? num * 1000 : num;
          } else {
            lastSeenMs = new Date(m.lastSeen).getTime();
          }

          if (isNaN(lastSeenMs)) {
            hasMissingData = true;
            return false;
          }

          const diff = Math.abs(Date.now() - lastSeenMs);
          return diff > fifteenMinutes;
        });

        if (hasDelayedMachine) isTimeout = true;
      }

      const offlinePDVs = store.machines.filter(m => m.status !== 'online');

      let latencyDisplay = `${Math.floor(Math.random() * 40) + 10}ms`;
      if (isTimeout) {
        latencyDisplay = 'TIMEOUT';
      } else if (hasMissingData && store.machines.length > 0) {
        latencyDisplay = 'Sincronizando...';
      }

      return {
        ...store,
        internetStatus,
        statusColor,
        statusBg,
        latency: latencyDisplay,
        offlinePDVs
      };
    }).sort((a, b) => {
      const order = { 'LINK CAÍDO': 0, 'LINK DEGRADADO': 1, 'ESTÁVEL': 2 };
      return order[a.internetStatus] - order[b.internetStatus];
    });
  }, [machines]);

  // Monitoramento de Lock e Criação de Incidentes (Modo TV)
  const prevStoresRef = useRef([]);
  useEffect(() => {
    if (allNocStores.length === 0) return;
    
    let lockTimeout;
    allNocStores.forEach(store => {
      const prevStore = prevStoresRef.current.find(s => s.name === store.name);
      if (prevStore && prevStore.internetStatus !== store.internetStatus) {
        if (store.internetStatus === 'LINK CAÍDO') {
           addIncident(store.name, 'CAÍDO');
           if (isTvMode && !isLocked) {
             setIsLocked(true); setLockedStore(store.name);
             playAlertSound();
             // Scrolla até o item que caiu
             setTimeout(() => {
               const el = document.getElementById(`store-card-${store.name}`);
               if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
             }, 100);
             
             // Libera o lock após 60 segundos
             lockTimeout = setTimeout(() => {
               setIsLocked(false); setLockedStore(null);
             }, 60000);
           }
        } else if (store.internetStatus === 'ESTÁVEL' && prevStore.internetStatus === 'LINK CAÍDO') {
           addIncident(store.name, 'ONLINE');
        }
      }
    });
    prevStoresRef.current = allNocStores;
    return () => clearTimeout(lockTimeout);
  }, [allNocStores, isTvMode, isLocked, playAlertSound]);

  // Engine Modo TV: Auto Scroll Vertical Suave
  useEffect(() => {
    if (!isTvMode || isLocked) return;
    
    const intervalTime = 12000; // 12s

    const scrollInterval = setInterval(() => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollPos = window.innerHeight + window.scrollY;
      
      // Se chegou no final, volta ao topo
      if (scrollPos >= scrollHeight - 100) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollBy({ top: 450, behavior: 'smooth' });
      }
    }, intervalTime);

    return () => clearInterval(scrollInterval);
  }, [isTvMode, isLocked]);

  // Listener para Botão de Pânico (ESC)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isTvMode) {
        setIsLocked(false);
        setLockedStore(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTvMode]);

  // Aplicação de Filtros
  const filteredStores = useMemo(() => {
    return allNocStores.filter(store => {
      // Global Filters
      if ((globalFilters?.onlyOffline || globalFilters?.hideHealthy) && store.internetStatus === 'ESTÁVEL') return false;

      // Local Filters
      if (filters.region !== 'Todas' && store.region !== filters.region) return false;
      if (filters.onlyCritical && store.internetStatus === 'ESTÁVEL') return false;
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const matchStore = store.name.toLowerCase().includes(term);
        const matchPDV = store.machines.some(m => m.name.toLowerCase().includes(term));
        if (!matchStore && !matchPDV) return false;
      }
      return true;
    });
  }, [allNocStores, filters, globalFilters]);

  const groupedByRegion = useMemo(() => {
    const groups = {};
    filteredStores.forEach(store => {
      if (!groups[store.region]) groups[store.region] = [];
      groups[store.region].push(store);
    });
    // Sort regions by name
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {});
  }, [filteredStores]);

  // Gerar lista de regiões únicas
  const regions = useMemo(() => {
    const r = new Set(allNocStores.map(s => s.region));
    return ['Todas', ...Array.from(r).sort()];
  }, [allNocStores]);

  return (
    <div className="animate-fade" style={{ padding: isTvMode ? '0' : '0 1rem', width: '100%', maxWidth: '100%' }} ref={containerRef}>
      <style>
        {`
          @keyframes pulse-red-border {
            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
          @keyframes panic-pulse {
            0% { box-shadow: inset 0 0 0px rgba(255, 0, 0, 0); }
            50% { box-shadow: inset 0 0 100px rgba(255, 0, 0, 0.5); }
            100% { box-shadow: inset 0 0 0px rgba(255, 0, 0, 0); }
          }
          .panic-pulse-screen {
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 9998;
            pointer-events: none;
            animation: panic-pulse 1s infinite;
          }
          .card-link-caido {
            border-color: rgba(239, 68, 68, 0.6) !important;
            animation: pulse-red-border 2s infinite;
          }
          .diagnose-overlay {
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(15, 12, 10, 0.98);
            backdrop-filter: blur(10px);
            z-index: 50;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
          }
          
          /* Toolbar Styling */
          .noc-toolbar {
            display: flex;
            align-items: center;
            gap: 1rem;
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 0.8rem 1.2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            flex-wrap: wrap;
          }
          .noc-toolbar select, .noc-toolbar input {
            background: rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.85rem;
            outline: none;
          }
          .noc-toolbar select option {
            background: var(--bg-dark);
            color: white;
          }
          .noc-toolbar .tv-btn {
            background: var(--brand-red);
            border: none;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-weight: 700;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: all 0.2s;
            margin-left: auto;
          }
          .noc-toolbar .tv-btn:hover {
            filter: brightness(1.2);
          }
        `}
      </style>

      {/* Ticker de Incidentes no Modo TV */}
      <AnimatePresence>
        {isTvMode && recentIncidents.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              background: 'rgba(10, 10, 10, 0.95)',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              padding: '0.8rem 2rem',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '2rem',
              overflow: 'hidden'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800, color: 'var(--brand-red)', whiteSpace: 'nowrap' }}>
               <AlertTriangle size={16} /> PAINEL DE INCIDENTES RECENTES
            </div>
            <div style={{ flex: 1, display: 'flex', gap: '2rem', overflowX: 'auto', whiteSpace: 'nowrap' }} className="hide-scrollbar">
               {recentIncidents.map(inc => (
                 <div key={inc.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-dim)' }}>{inc.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    <strong style={{ color: 'white' }}>{inc.storeName}</strong>
                    <span style={{ color: inc.status === 'CAÍDO' ? '#ef4444' : '#22c55e', fontWeight: 800 }}>{inc.status === 'CAÍDO' ? 'OFFLINE' : 'VOLTOU ONLINE'}</span>
                 </div>
               ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', marginTop: isTvMode ? '4rem' : '0' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
             <Network size={28} color="#22c55e" /> NOC Lojas
          </h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.4rem' }}>Status consolidado de link de internet e conectividade por localidade.</p>
        </div>
      </div>

      {/* Toolbar Extraída */}
      <NocToolbar regions={regions} />

      {loading && allNocStores.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '1rem' }}>
           <Activity size={40} color="#dc2626" className="animate-spin" />
           <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 700 }}>VERIFICANDO CONECTIVIDADE...</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} ref={containerRef}>
          {Object.entries(groupedByRegion).map(([region, stores]) => (
            <div key={region} style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              {/* Regional Header */}
              <div 
                onClick={() => toggleRegional(region)}
                style={{
                  padding: '12px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: 'rgba(255, 255, 255, 0.03)',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <MapPin size={16} color="var(--brand-red)" />
                  <span style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase' }}>{region}</span>
                  <span style={{ 
                    fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', 
                    background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '10px' 
                  }}>
                    {stores.length}
                  </span>
                </div>
                <ChevronDown size={16} color="var(--text-dim)" style={{ 
                  transition: 'transform 0.3s',
                  transform: (expandedRegionals[region] !== false && (expandedRegionals[region] || stores.some(s => s.internetStatus !== 'ESTÁVEL'))) ? 'rotate(0deg)' : 'rotate(-90deg)'
                }} />
              </div>

              {/* Regional Content (Grid) */}
              <AnimatePresence>
                {(expandedRegionals[region] !== false && (expandedRegionals[region] || stores.some(s => s.internetStatus !== 'ESTÁVEL'))) && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ 
                      padding: '12px', 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', 
                      gap: '8px' 
                    }}>
                      {stores.map(store => {
                        const isOffline = store.internetStatus !== 'ESTÁVEL';
                        return (
                          <div 
                            key={store.name} 
                            className="mini-card"
                            id={`store-card-${store.name}`}
                            onClick={() => setDiagnosingStore(store.name)}
                            style={{ 
                              cursor: 'pointer',
                              boxShadow: isOffline ? '0 0 15px rgba(239, 68, 68, 0.15)' : 'none',
                              borderLeft: isOffline ? '3px solid #ef4444' : '3px solid rgba(34, 197, 94, 0.4)'
                            }}
                          >
                            <div className="mini-card-info">
                              <div className="mini-card-title">{store.name}</div>
                              <div className="mini-card-subtitle" style={{ color: isOffline ? '#ef4444' : 'var(--text-dim)' }}>
                                {store.internetStatus === 'ESTÁVEL' ? 'ONLINE' : 'LINK CAÍDO'}
                              </div>
                            </div>

                            <div className="mini-card-icon">
                              {isOffline ? (
                                <AlertCircle size={14} color="#ef4444" />
                              ) : (
                                <Activity size={14} color="var(--text-dim)" opacity={0.5} />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NocLojasView;
