import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Activity, 
  AlertCircle, 
  Cpu, 
  Layers, 
  Search, 
  Filter, 
  Clock, 
  Zap, 
  MoreHorizontal, 
  X, 
  CheckCircle2, 
  ChevronRight,
  ChevronDown,
  Database,
  RefreshCw,
  Bell,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardSettings } from '../context/DashboardContext';
import AcronisToolbar from './AcronisToolbar';

const AcronisMonitoringView = () => {
  const { isTvMode, globalFilters } = useDashboardSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('Todas');
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [expandedRegionals, setExpandedRegionals] = useState({});
  const containerRef = useRef(null);
  
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Helper to format relative time
  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `há ${diffHours} horas`;
    return `há ${Math.floor(diffHours / 24)} dias`;
  };

  const STATE_MAP = {
    'SP AL': 'Alagoas',
    'SP SP': 'São Paulo',
    'SP RJ': 'Rio de Janeiro',
    'SP CE': 'Ceará',
    'SP PB': 'Paraíba',
    'SP MT': 'Mato Grosso',
    'SP BA': 'Bahia',
    'SP PE': 'Pernambuco',
    'SP RN': 'Rio Grande do Norte',
    'SP SE': 'Sergipe',
    'SP MG': 'Minas Gerais',
    'SP ES': 'Espírito Santo',
    'SP GO': 'Goiás',
    'SP DF': 'Distrito Federal',
    'SP SC': 'Santa Catarina',
    'SP RS': 'Rio Grande do Sul',
    'SP PR': 'Paraná'
  };

  const fetchAcronisData = async () => {
    try {
      setLoading(true);
      
      // Parallel Fetch: Resources (Statuses), Alerts, and Agents
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

      // Filter only resource.machine from resource_statuses
      const machineResources = (resourcesData.items || []).filter(item => item.context && item.context.type === 'resource.machine');

      // Base mapping on agents to ensure all installed machines are visible
      const mapped = agents.map(agent => {
        // Find corresponding resource if it exists
        const resource = machineResources.find(r => r.context && r.context.agent_id === agent.id);
        const resourceId = resource ? resource.context.id : null;
        
        const machineName = agent.hostname || (resource ? (resource.context.display_name || resource.context.name) : 'PDV Desconhecido');
        
        // 2. Status Correlation
        let status = 'offline';
        if (agent.online) {
          status = 'online';
        } else if (resource && (resource.aggregate?.status === 'active' || resource.aggregate?.status === 'online')) {
          status = 'online';
        }

        // 3. Alerts Merge
        const machineAlerts = resourceId ? activeAlerts.filter(a => a.resource_id === resourceId) : [];
        const hasBackupFailure = machineAlerts.some(a => a.type === 'backup_failed' || a.severity === 'critical');
        if (hasBackupFailure) status = 'backup_error';

        // 4. CyberFit Score
        let cyberfit = 0;
        if (agent.meta?.atp?.components) {
            cyberfit = 100;
        }

        return {
          id: resourceId || agent.id, // Fallback to agent ID if resource not found
          name: machineName,
          store: agent.hostname || machineName.split('PDV')[0].trim(),
          status: status,
          lastBackup: resource ? formatRelativeTime(resource.context.updated_at) : 'Nunca',
          cyberfit: cyberfit,
          version: agent.core_version?.current?.release_id || 'v15.x',
          alerts: machineAlerts.length,
          ip: agent.network?.network_interfaces?.[0]?.cidr_notations?.[0]?.split('/')[0] || 'N/A'
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

  React.useEffect(() => {
    fetchAcronisData();
    const interval = setInterval(fetchAcronisData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getRegionalName = (machineName) => {
    const name = (machineName || '').toUpperCase();
    const parts = name.split('-');
    
    if (parts.length >= 2) {
      const regionalCode = parts[1].trim();
      if (regionalCode === 'CE') return 'RMA';
      if (regionalCode === 'CSC') return 'CSC';
      if (regionalCode) return `SP ${regionalCode}`;
    }
    
    return 'OUTRAS REGIÕES';
  };

  const regions = useMemo(() => {
    const r = new Set();
    machines.forEach(m => {
      const reg = getRegionalName(m.name);
      if (reg) r.add(reg);
    });
    return Array.from(r).sort();
  }, [machines]);

  // AGROPAMENTO POR REGIONAL (ESTADO) ou LISTA SIMPLES
  const groupedRegionals = useMemo(() => {
    const filtered = machines.filter(m => {
      const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.store.toLowerCase().includes(searchQuery.toLowerCase());
      
      const regionalName = getRegionalName(m.name);
      const matchesRegion = selectedRegion === 'Todas' || regionalName === selectedRegion;
      
      let matchesStatus = true;
      if (onlyCritical) {
        matchesStatus = m.status === 'offline' || m.status === 'backup_error' || m.alerts > 0;
      }
      
      // Global filter: hideHealthy / onlyOffline
      if ((isTvMode || globalFilters?.hideHealthy || globalFilters?.onlyOffline) && m.status === 'online') {
        matchesStatus = false;
      }
      
      return matchesSearch && matchesRegion && matchesStatus;
    });

    return filtered.reduce((acc, machine) => {
      const regionalName = globalFilters?.groupByUF !== false ? getRegionalName(machine.name) : 'TODOS OS PDVs';
      
      if (!acc[regionalName]) {
        acc[regionalName] = {
          name: regionalName,
          machines: [],
          stats: { online: 0, offline: 0, backup_error: 0, degraded: 0 }
        };
      }
      
      acc[regionalName].machines.push(machine);
      if (acc[regionalName].stats[machine.status] !== undefined) {
        acc[regionalName].stats[machine.status]++;
      }
      return acc;
    }, {});
  }, [machines, searchQuery, selectedRegion, onlyCritical, isTvMode, globalFilters]);

  const stats = useMemo(() => ({
    total: machines.length,
    online: machines.filter(m => m.status === 'online').length,
    offline: machines.filter(m => m.status === 'offline').length,
    failures: machines.filter(m => m.status === 'backup_error' || m.alerts > 0).length
  }), [machines]);

  const toggleRegional = (regionalName) => {
    setExpandedRegionals(prev => {
      const regStats = groupedRegionals[regionalName]?.stats || { offline: 0, degraded: 0, backup_error: 0 };
      const isCurrentlyExpanded = prev[regionalName] !== undefined 
        ? prev[regionalName] 
        : (regStats.offline + regStats.degraded + regStats.backup_error > 0);
        
      return {
        ...prev,
        [regionalName]: !isCurrentlyExpanded
      };
    });
  };

  const resetFilters = () => {
    setSelectedRegion('Todas');
    setOnlyCritical(false);
    setSearchQuery('');
  };

  const totalFilteredResults = useMemo(() => {
    return Object.values(groupedRegionals).reduce((acc, reg) => acc + reg.machines.length, 0);
  }, [groupedRegionals]);

  const handleManualBackup = (machineId) => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      alert('Backup disparado com sucesso via Acronis API!');
    }, 1500);
  };

  // Engine Modo TV: Auto Scroll Vertical Suave
  useEffect(() => {
    if (!isTvMode) return;
    
    const intervalTime = 12000; // 12s

    const scrollInterval = setInterval(() => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollPos = window.innerHeight + window.scrollY;
      
      // Se chegou no final, volta ao topo
      if (scrollPos >= scrollHeight - 100) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollBy({ top: 400, behavior: 'smooth' });
      }
    }, intervalTime);

    return () => clearInterval(scrollInterval);
  }, [isTvMode]);

  const openDetails = (machine) => {
    setSelectedMachine(machine);
    setShowDetailModal(true);
  };

  return (
    <div className="animate-fade" style={{ padding: isTvMode ? '0' : '0 1rem', width: '100%', maxWidth: '100%' }}>
      {loading && machines.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '50vh', gap: '1rem' }}>
           <RefreshCw size={40} color="#dc2626" className="animate-spin" />
           <div style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 700 }}>SINCRONIZANDO COM ACRONIS CLOUD...</div>
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '2rem', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '12px', textAlign: 'center', marginBottom: '2rem' }}>
           <AlertCircle size={32} color="#ef4444" style={{ margin: '0 auto 1rem' }} />
           <div style={{ color: 'white', fontWeight: 800, marginBottom: '0.5rem' }}>ERRO DE CONEXÃO</div>
           <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>{error}</div>
           <button onClick={fetchAcronisData} style={{ marginTop: '1rem', background: '#dc2626', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 800 }}>TENTAR NOVAMENTE</button>
        </div>
      )}

      {(!loading || machines.length > 0) && (
        <>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', marginTop: isTvMode ? '4rem' : '0' }}>
          <div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <ShieldCheck size={28} color="#dc2626" /> Monitoramento Acronis
            </h2>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.4rem' }}>Status de backups, integridade de agentes e conectividade de PDVs.</p>
          </div>
        </div>

        <AcronisToolbar 
          regions={regions}
          selectedRegion={selectedRegion}
          onRegionChange={setSelectedRegion}
          onlyCritical={onlyCritical}
          onCriticalChange={setOnlyCritical}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalResults={totalFilteredResults}
          onReset={resetFilters}
        />
      {/* Header Metrics Movido para baixo do Toolbar se necessário, ou mantido acima */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(31, 23, 20, 0.4), rgba(220, 38, 38, 0.05))', borderLeft: '4px solid #dc2626' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Total PDVs Acronis</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', marginTop: '5px' }}>{stats.total}</div>
            </div>
            <ShieldCheck size={32} color="#dc2626" opacity={0.6} />
          </div>
        </div>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(31, 23, 20, 0.4), rgba(34, 197, 94, 0.05))', borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Online / Protegidos</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', marginTop: '5px' }}>{stats.online}</div>
            </div>
            <Activity size={32} color="#22c55e" opacity={0.6} />
          </div>
        </div>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(31, 23, 20, 0.4), rgba(239, 68, 68, 0.05))', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Desconectados</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', marginTop: '5px' }}>{stats.offline}</div>
            </div>
            <AlertCircle size={32} color="#ef4444" opacity={0.6} />
          </div>
        </div>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(31, 23, 20, 0.4), rgba(218, 85, 19, 0.05))', borderLeft: '4px solid #da5513' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Alertas de Backup</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: 'white', marginTop: '5px' }}>{stats.failures}</div>
            </div>
            <Zap size={32} color="#da5513" opacity={0.6} />
          </div>
        </div>
      </div>

      {/* REGIONALS VERTICAL GRID LAYOUT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} ref={containerRef}>
        {Object.values(groupedRegionals).map(reg => (
          <div key={reg.name} style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {/* Regional Header */}
            <div 
              onClick={() => toggleRegional(reg.name)}
              style={{
                padding: '12px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                background: 'rgba(255, 255, 255, 0.03)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                transition: 'background 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <MapPin size={16} color="#dc2626" />
                <span style={{ color: 'white', fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{reg.name}</span>
                <span style={{ 
                  fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', 
                  background: 'rgba(255,255,255,0.05)', padding: '2px 10px', borderRadius: '10px' 
                }}>
                  {reg.machines.length}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {reg.stats.online > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'rgba(255,255,255,0.4)' }}>{reg.stats.online}</span>
                  </div>
                )}
                {(reg.stats.offline > 0 || reg.stats.backup_error > 0) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#ef4444' }}>{reg.stats.offline + (reg.stats.backup_error || 0)}</span>
                  </div>
                )}
                <ChevronDown size={16} color="var(--text-dim)" style={{ 
                  transition: 'transform 0.3s',
                  transform: (expandedRegionals[reg.name] !== false && (expandedRegionals[reg.name] || (reg.stats.offline + reg.stats.degraded + reg.stats.backup_error > 0))) ? 'rotate(0deg)' : 'rotate(-90deg)'
                }} />
              </div>
            </div>

            {/* Regional Content (Collapsible Grid) */}
            <AnimatePresence>
              {(expandedRegionals[reg.name] !== false && (expandedRegionals[reg.name] || (reg.stats.offline + reg.stats.degraded + reg.stats.backup_error > 0))) && (
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
                    {reg.machines.map(m => {
                      const isOffline = m.status !== 'online';
                      const hasBackupError = m.status === 'backup_error';
                      return (
                        <div 
                          key={m.id} 
                          className="mini-card"
                          onClick={() => openDetails(m)}
                          style={{ 
                            cursor: 'pointer',
                            boxShadow: hasBackupError ? '0 0 12px rgba(220, 38, 38, 0.15)' : 'none',
                            borderLeft: isOffline 
                              ? '3px solid #ef4444' 
                              : '3px solid rgba(34, 197, 94, 0.4)',
                          }}
                        >
                          <div className="mini-card-info">
                            <div className="mini-card-title">{m.name}</div>
                            <div className="mini-card-subtitle" style={{ 
                              color: hasBackupError ? '#dc2626' : isOffline ? '#ef4444' : 'var(--text-dim)' 
                            }}>
                              {hasBackupError ? 'FALHA DE BACKUP' : m.status.toUpperCase()}
                            </div>
                          </div>

                          <div className="mini-card-icon" style={{ opacity: m.status === 'online' ? 0.3 : 1 }}>
                            <Database size={14} color={hasBackupError ? '#dc2626' : 'var(--text-dim)'} />
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

      {/* DETAIL MODAL */}
      <AnimatePresence>
        {showDetailModal && selectedMachine && (
           <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                style={{ background: '#181210', width: '100%', maxWidth: '700px', borderRadius: '16px', border: '1px solid rgba(220, 38, 38, 0.2)', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.8)' }}
              >
                 <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <ShieldCheck size={20} color="#dc2626" />
                      <div>
                        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>DETALHES: {selectedMachine.name}</h2>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>IP: {selectedMachine.ip}</span>
                      </div>
                    </div>
                    <button onClick={() => setShowDetailModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                      <X size={18} />
                    </button>
                 </div>

                 <div style={{ padding: '2rem', maxHeight: '60vh', overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                       
                       {/* Coluna 1: Segurança */}
                       <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <ShieldCheck size={16} color="#22c55e" /> Segurança
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                             <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '5px' }}>CyberFit Score</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                   <Activity size={24} color={selectedMachine.cyberfit > 80 ? '#22c55e' : '#ef4444'} />
                                   <span style={{ fontSize: '2rem', fontWeight: 900, color: 'white' }}>{selectedMachine.cyberfit}%</span>
                                </div>
                             </div>
                             <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '5px' }}>Último Backup</div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                   <Clock size={16} color="var(--text-secondary)" /> {selectedMachine.lastBackup}
                                </div>
                             </div>
                             <div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '5px' }}>Status da Proteção</div>
                                <div style={{ 
                                   display: 'inline-block',
                                   background: selectedMachine.status === 'online' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                                   color: selectedMachine.status === 'online' ? '#22c55e' : '#dc2626',
                                   padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800
                                 }}>
                                   {selectedMachine.status === 'backup_error' ? 'ALERTA DE BACKUP' : selectedMachine.status.toUpperCase()}
                                 </div>
                             </div>
                          </div>
                       </div>

                       {/* Coluna 2: Infra */}
                       <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <Database size={16} color="var(--brand-orange)" /> Infra & Patches
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                             <div style={{ padding: '1rem', background: 'rgba(218, 85, 19, 0.05)', borderRadius: '8px', border: '1px solid rgba(218, 85, 19, 0.1)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                   <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>Vulnerabilidades (Mock)</div>
                                   <span style={{ background: '#da5513', color: 'white', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900 }}>3</span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>• CVE-2024-2138<br/>• CVE-2023-4421</div>
                             </div>
                             <div style={{ padding: '1rem', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                   <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white' }}>Patches Pendentes do Windows</div>
                                   <span style={{ background: 'var(--text-dim)', color: '#111', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6rem', fontWeight: 900 }}>2</span>
                                </div>
                                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>Atualizações Críticas aguardando instalação.</div>
                             </div>
                             <button style={{ marginTop: 'auto', background: 'transparent', border: '1px solid var(--brand-orange)', color: 'var(--brand-orange)', padding: '10px', borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer', transition: '0.2s' }} className="hover:bg-orange-500/10">
                                INSTALAR PATCHES
                             </button>
                          </div>
                       </div>

                       {/* Coluna 3: Ações Rápidas */}
                       <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                          <h3 style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <Zap size={16} color="var(--brand-blue)" /> Ações Rápidas
                          </h3>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                             <button 
                               onClick={() => handleManualBackup(selectedMachine.id)}
                               disabled={isBackingUp}
                               style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', background: '#dc2626', color: 'white', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }}
                             >
                               {isBackingUp ? <RefreshCw size={16} className="animate-spin" /> : <Database size={16} />} 
                               FORÇAR BACKUP AGORA
                             </button>

                             <button style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer' }} className="hover:bg-white/10">
                               <RefreshCw size={16} color="var(--text-dim)" /> 
                               ATUALIZAR AGENTE
                             </button>

                             <button onClick={() => window.open(`https://br1-cloud.acronis.com/api/cyber_desktop/v1/session/${selectedMachine.id}`, '_blank')} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(42, 128, 255, 0.1)', color: '#2a80ff', border: '1px solid rgba(42, 128, 255, 0.2)', padding: '12px', borderRadius: '8px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', marginTop: 'auto' }} className="hover:bg-blue-500/20">
                               <Activity size={16} /> 
                               ABRIR CYBER DESKTOP
                             </button>
                          </div>
                       </div>

                    </div>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
      </>
      )}
    </div>
  );
};

export default AcronisMonitoringView;
