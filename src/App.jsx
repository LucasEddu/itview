import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  Ticket,
  TrendingUp, 
  Calendar, 
  MapPin, 
  Search, 
  Filter, 
  BarChart2, 
  PieChart, 
  AlertCircle, 
  CheckCircle2, 
  Menu, 
  X, 
  Info, 
  Download, 
  RefreshCcw as SyncIcon,
  Tv,
  Moon,
  Sun,
  Zap,
  List,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  Cell, 
  PieChart as RePieChart, 
  Pie 
} from 'recharts';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
};

const COLORS = ['#ef4444', '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#06b6d4', '#ec4899'];
const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 9); // 9h to 18h

export default function App() {
  const [selectedAgent, setSelectedAgent] = useState('Todos');
  const [selectedSector, setSelectedSector] = useState('Todos');
  const [isTvMode, setIsTvMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('performance'); // 'performance' | 'map' | 'base'
  const [theme, setTheme] = useState('dark');
  const [rawData, setRawData] = useState({ tickets: [], agents: [], sectors: [], last_updated: 'Carregando...' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(''); 
  const [fetchError, setFetchError] = useState(false); 
  
  // Data fetching from API
  const fetchData = async () => {
    try {
      setFetchError(false);
      const response = await fetch('/api/data');
      if (response.ok) {
        const json = await response.json();
        setRawData(json);
        setLoading(false);
      } else {
        throw new Error('Backend not responding');
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setFetchError(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSync = async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    setSyncStatus('Iniciando sincronização...');
    
    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const result = await response.json();
      
      if (response.ok) {
        setSyncStatus('Dados atualizados!');
        await fetchData(); // Refresh local data
        setTimeout(() => setSyncStatus(''), 3000);
      } else {
        setSyncStatus('Erro na sincronização');
        alert('Erro: ' + (result.details || result.error));
      }
    } catch (error) {
      setSyncStatus('Erro de conexão');
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);
  
  // Date Filtering State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeInterval, setActiveInterval] = useState('Tudo');

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Predefined Interval Logic
  const handleInterval = (interval) => {
    setActiveInterval(interval);
    if (interval === 'Tudo') {
      setStartDate('');
      setEndDate('');
      return;
    }

    const calculateDates = () => {
      if (!rawData.tickets || rawData.tickets.length === 0) {
        return { latest: new Date('2026-03-31'), maxStr: '2026-03-31' };
      }
      const maxStr = rawData.tickets.reduce((max, t) => t.date > max ? t.date : max, rawData.tickets[0].date);
      const [year, month, day] = maxStr.split('-').map(Number);
      return { latest: new Date(year, month - 1, day), maxStr };
    };

    const { latest: latestDate, maxStr: maxDateString } = calculateDates();
    let start = new Date(latestDate);
    
    if (interval === '7D') start.setDate(latestDate.getDate() - 7);
    if (interval === '30D') start.setDate(latestDate.getDate() - 30);
    if (interval === 'Ano Atual') start = new Date(latestDate.getFullYear(), 0, 1);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(maxDateString);
  };

  // Filtering Logic
  const filteredTickets = useMemo(() => {
    return rawData.tickets.filter(t => {
      if (['Não Atribuído', 'Sistema'].includes(t.agent) || t.total === 0) return false;

      const agentMatch = selectedAgent === 'Todos' || t.agent === selectedAgent;
      const sectorMatch = selectedSector === 'Todos' || t.sector === selectedSector;
      const searchMatch = !searchQuery || 
        t.user.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toString().includes(searchQuery);
      
      const dateVal = t.date;
      const dateMatch = (!startDate || dateVal >= startDate) && (!endDate || dateVal <= endDate);
      
      return agentMatch && sectorMatch && searchMatch && dateMatch;
    });
  }, [selectedAgent, selectedSector, searchQuery, startDate, endDate]);

  // KPIs
  const metrics = useMemo(() => {
    const total = filteredTickets.length;
    const avgWait = filteredTickets.reduce((acc, t) => acc + t.wait, 0) / (total || 1);
    const avgTotal = filteredTickets.reduce((acc, t) => acc + t.total, 0) / (total || 1);
    const users = Array.from(new Set(filteredTickets.map(t => t.user)));
    
    // CSAT Global (Para filtros aplicados usando Média Ponderada)
    const csatWeights = {
      'Muito Satisfeito': 100,
      'Satisfeito': 75,
      'Indiferente': 50,
      'Insatisfeito': 25
    };
    
    const rated = filteredTickets.filter(t => t.csat && csatWeights[t.csat] !== undefined);
    const totalScore = rated.reduce((sum, t) => sum + csatWeights[t.csat], 0);
    const csatScore = rated.length > 0 ? (totalScore / rated.length) : 0;

    return { total, avgWait, avgTotal, uniqueUsers: users.length, csatScore };
  }, [filteredTickets]);

  // Section 1: Atendimento
  const agentPerf = useMemo(() => {
    const csatWeights = {
      'Muito Satisfeito': 100,
      'Satisfeito': 75,
      'Indiferente': 50,
      'Insatisfeito': 25
    };

    const agentStats = filteredTickets.reduce((acc, t) => {
      if (!acc[t.agent]) acc[t.agent] = { count: 0, rated: 0, totalScore: 0 };
      acc[t.agent].count++;
      
      if (t.csat && csatWeights[t.csat] !== undefined) {
        acc[t.agent].rated++;
        acc[t.agent].totalScore += csatWeights[t.csat];
      }
      return acc;
    }, {});
    
    return Object.entries(agentStats).sort((a,b) => b[1].count - a[1].count).slice(0, 10).map(([name, data]) => ({ 
      name, 
      count: data.count,
      "CSAT (%)": data.rated > 0 ? parseFloat((data.totalScore / data.rated).toFixed(1)) : 0
    }));
  }, [filteredTickets]);

  const topCategories = useMemo(() => {
    const counts = filteredTickets.reduce((acc, t) => {
      if (t.sector === 'Não Informado') return acc;
      acc[t.sector] = (acc[t.sector] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).sort((a,b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
  }, [filteredTickets]);

  // Section 2: Tempo & Heatmap
  const weekData = useMemo(() => {
    const counts = WEEKDAYS.map((day, i) => ({ day: day.substring(0,3), count: 0 }));
    filteredTickets.forEach(t => { if (t.weekday !== -1) counts[t.weekday].count++; });
    return counts;
  }, [filteredTickets]);

  const heatmapMatrix = useMemo(() => {
    const matrix = WEEKDAYS.map((day, dIdx) => ({
      day,
      hours: HOURS.map(h => ({ hour: h, count: 0 }))
    }));
    filteredTickets.forEach(t => {
      if (t.weekday !== -1 && t.hour >= 9 && t.hour <= 18) {
        const hIdx = t.hour - 9;
        matrix[t.weekday].hours[hIdx].count++;
      }
    });
    let max = 1;
    matrix.forEach(d => d.hours.forEach(h => { if (h.count > max) max = h.count; }));
    return { matrix, max };
  }, [filteredTickets]);

  const getHeatColor = (count, max) => {
    const ratio = count / (max || 1);
    if (count === 0) return 'rgba(255,255,255,0.02)';
    if (ratio < 0.3) return 'rgba(16, 185, 129, 0.4)';
    if (ratio < 0.7) return 'rgba(245, 158, 11, 0.5)';
    return 'rgba(239, 68, 68, 0.6)';
  };

  // Section 3: SLA & Satisfação
  const csatData = useMemo(() => {
    const counts = filteredTickets.reduce((acc, t) => {
      acc[t.csat] = (acc[t.csat] || 0) + 1;
      return acc;
    }, {});
    return [
      { name: 'Muito Satisfeito', value: counts['Muito Satisfeito'] || 0, color: '#10b981' },
      { name: 'Satisfeito', value: counts['Satisfeito'] || 0, color: '#3b82f6' },
      { name: 'Indiferente', value: counts['Indiferente'] || 0, color: '#f59e0b' },
      { name: 'Insatisfeito', value: counts['Insatisfeito'] || 0, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [filteredTickets]);

  const avgTimeByAgent = useMemo(() => {
    const totals = filteredTickets.reduce((acc, t) => {
      if (!acc[t.agent]) acc[t.agent] = { sum: 0, count: 0 };
      acc[t.agent].sum += t.total;
      acc[t.agent].count++;
      return acc;
    }, {});
    return Object.entries(totals)
      .map(([name, data]) => ({ name, avg: data.sum / data.count }))
      .sort((a,b) => b.avg - a.avg)
      .slice(0, 8);
  }, [filteredTickets]);

  // Section 4: Evolução Mensal
  const evolution = useMemo(() => {
    const dataByMonth = filteredTickets.reduce((acc, t) => {
      if (!t.month) return acc;
      if (!acc[t.month]) acc[t.month] = { count: 0, time: 0 };
      acc[t.month].count++;
      acc[t.month].time += t.total;
      return acc;
    }, {});
    return Object.entries(dataByMonth)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([month, d]) => ({ month, volume: d.count, time: Math.round((d.time / d.count) / 60) }));
  }, [filteredTickets]);

  // Section 5: Ranking Usuários
  const userRanking = useMemo(() => {
    const userGroups = filteredTickets.reduce((acc, t) => {
      if (!acc[t.user]) acc[t.user] = { count: 0, company: t.company };
      acc[t.user].count++;
      return acc;
    }, {});
    const sorted = Object.entries(userGroups).sort((a,b) => b[1].count - a[1].count).slice(0, 20);
    const max = sorted[0]?.[1].count || 1;
    return sorted.map(([name, d], index) => ({ name, company: d.company, count: d.count, percent: (d.count / max) * 100 }));
  }, [filteredTickets]);

  // Section 6: Regional Criticality Data
  const criticalityData = useMemo(() => {
    const regional = {};
    const REGIONS = {
      'Ceará': ['CE', 'RMA', 'FORTALEZA', 'SOBRAL', 'EUSEBIO', 'AQUIRAZ', 'JUAZEIRO'],
      'Pará': ['PA', 'BELEM', 'UMARIZAL', 'BOULEVARD'],
      'São Paulo': ['SP', 'MORUMBI', 'PAULISTA'],
      'Pernambuco': ['PE', 'RECIFE', 'OLINDA', 'CARUARU', 'BOA VIAGEM'],
      'Bahia': ['BA', 'SALVADOR'],
      'RN': ['RN', 'NATAL', 'MOSSORO'],
      'Piauí': ['PI', 'TERESINA'],
      'Sergipe': ['SE', 'ARACAJU'],
      'Mato Grosso': ['MT', 'CUIABA']
    };

    filteredTickets.forEach(t => {
      let region = 'Outros';
      const company = (t.company || '').toUpperCase();
      
      for (const [name, keywords] of Object.entries(REGIONS)) {
        if (keywords.some(k => company.includes(k))) {
          region = name;
          break;
        }
      }

      if (!regional[region]) regional[region] = { Athenas: 0, Degust: 0, Hardware: 0, total: 0 };
      
      const sector = (t.sector || '').toLowerCase();
      if (sector.includes('athenas')) regional[region].Athenas++;
      else if (sector.includes('degust')) regional[region].Degust++;
      else if (sector.includes('máquinas') || sector.includes('equipamentos') || sector.includes('totem') || sector.includes('impressora')) regional[region].Hardware++;
      
      regional[region].total++;
    });

    return Object.entries(regional)
      .map(([name, stats]) => {
        const coords = {
          'Ceará': [-3.71722, -38.54306],
          'Pará': [-1.45583, -48.50444],
          'São Paulo': [-23.55052, -46.63330],
          'Pernambuco': [-8.05224, -34.92861],
          'Bahia': [-12.9714, -38.5014],
          'RN': [-5.79448, -35.2110],
          'Piauí': [-5.08921, -42.8016],
          'Sergipe': [-10.9472, -37.0731],
          'Mato Grosso': [-15.6010, -56.0974],
          'Outros': [-15.7801, -47.9292] // Brasília as default
        };
        return { name, ...stats, coords: coords[name] || coords['Outros'] };
      })
  }, [filteredTickets]);

  // Heatmap Layer Component
  const HeatmapLayer = ({ data }) => {
    const map = useMap();
    useEffect(() => {
      if (!map || !data.length) return;
      const points = data.map(d => [...d.coords, Math.min(1, d.total / 100)]);
      const heat = L.heatLayer(points, {
        radius: 40,
        blur: 25,
        maxZoom: 8,
        gradient: {
          0.2: '#3b82f6', // Azul
          0.4: '#10b981', // Verde
          0.6: '#f59e0b', // Amarelo
          0.8: '#f97316', // Laranja
          1.0: '#ef4444'  // Vermelho
        }
      }).addTo(map);
      return () => {
        if (map && heat) map.removeLayer(heat);
      };
    }, [map, data]);
    return null;
  };

  if (loading) return null;

  if (fetchError && rawData.tickets.length === 0) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: 'white', gap: '1rem' }}>
        <AlertCircle size={48} color="var(--brand-red)" />
        <h2 style={{ fontWeight: 800 }}>ERRO DE CONEXÃO</h2>
        <p style={{ color: 'var(--text-dim)', textAlign: 'center' }}>Não foi possível conectar ao servidor backend.<br/>Por favor, <b>reinicie o terminal</b> e rode <b>npm run dev</b> novamente.</p>
        <button onClick={() => window.location.reload()} style={{ padding: '0.8rem 2rem', background: 'var(--brand-red)', border: 'none', borderRadius: '8px', color: 'white', fontWeight: 700, cursor: 'pointer' }}>TENTAR NOVAMENTE</button>
      </div>
    );
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon"><Ticket size={18} color="white" /></div>
          <div>
            <div style={{fontWeight: 700, fontSize: '0.85rem', color: 'white', letterSpacing: '0.05em'}}>DASHBOARD TI</div>
            <div style={{fontSize: '0.65rem', color: 'var(--text-dim)'}}>Gestão de Chamados</div>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Navegação</span>
          <div 
            className={`nav-item ${activeTab === 'performance' ? 'active' : ''}`} 
            onClick={() => setActiveTab('performance')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.5rem', transition: '0.2s', fontSize: '0.85rem' }}
          >
            <BarChart2 size={16} color={activeTab === 'performance' ? 'white' : 'var(--text-dim)'} />
            <span style={{ color: activeTab === 'performance' ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === 'performance' ? 600 : 400 }}>Visão Performance</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'map' ? 'active' : ''}`} 
            onClick={() => setActiveTab('map')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', fontSize: '0.85rem', marginBottom: '0.5rem' }}
          >
            <Zap size={16} color={activeTab === 'map' ? 'var(--brand-red)' : 'var(--text-dim)'} />
            <span style={{ color: activeTab === 'map' ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === 'map' ? 600 : 400 }}>Mapa de Criticidade</span>
          </div>
          <div 
            className={`nav-item ${activeTab === 'base' ? 'active' : ''}`} 
            onClick={() => setActiveTab('base')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', fontSize: '0.85rem' }}
          >
            <List size={16} color={activeTab === 'base' ? 'var(--brand-red)' : 'var(--text-dim)'} />
            <span style={{ color: activeTab === 'base' ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === 'base' ? 600 : 400 }}>Visualização de Base</span>
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-label">AÇÕES DE SISTEMA</div>
          <button 
            className={`sync-button ${isSyncing ? 'syncing' : ''}`}
            onClick={handleSync}
            disabled={isSyncing}
            style={{ 
              width: '100%',
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.8rem', 
              padding: '0.8rem', 
              borderRadius: '8px', 
              background: isSyncing ? 'rgba(239, 68, 68, 0.1)' : 'var(--brand-red)',
              color: 'white',
              border: 'none',
              cursor: isSyncing ? 'not-allowed' : 'pointer',
              transition: '0.3s all',
              marginTop: '0.5rem',
              fontWeight: 700,
              fontSize: '0.8rem',
              boxShadow: isSyncing ? 'none' : '0 4px 12px rgba(239, 68, 68, 0.2)'
            }}
          >
            <SyncIcon size={16} className={isSyncing ? 'spin' : ''} />
            <span>{isSyncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR AGORA'}</span>
          </button>
          {syncStatus && (
            <div style={{ fontSize: '0.7rem', color: syncStatus.includes('Erro') ? '#f87171' : 'var(--brand-red)', marginTop: '0.5rem', textAlign: 'center', fontWeight: 600 }}>
              {syncStatus}
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Tema do Sistema</span>
          <div className="card" style={{ padding: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                {theme === 'dark' ? <Monitor size={14} /> : <Users size={14} />}
                <span>{theme === 'dark' ? 'MODO ESCURO' : 'MODO CLARO'}</span>
             </div>
             <div className="switch">
                <input type="checkbox" checked={theme === 'light'} readOnly />
                <span className="slider"></span>
             </div>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Ações & Utilitários</span>
          <div className="card" style={{ padding: '0.75rem', marginBottom: '1rem', cursor: 'pointer', borderColor: isTvMode ? 'var(--brand-orange)' : 'var(--border-dim)' }} onClick={() => setIsTvMode(!isTvMode)}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem' }}>
                   <Monitor size={14} color={isTvMode ? 'var(--brand-orange)' : 'var(--text-dim)'} />
                   <span style={{ color: isTvMode ? 'white' : 'var(--text-secondary)' }}>MODO TV</span>
                </div>
                <label className="switch">
                  <input type="checkbox" checked={isTvMode} readOnly />
                  <span className="slider"></span>
                </label>
             </div>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Filtros Globais</span>
          <div className="filter-group">
            <div className="filter-label">Atendente</div>
            <select className="custom-select" value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
              <option value="Todos">Todos os Agentes</option>
              {rawData.agents.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <div className="filter-label">Setor / Serviço</div>
            <select className="custom-select" value={selectedSector} onChange={(e) => setSelectedSector(e.target.value)}>
              <option value="Todos">Todos os Setores</option>
              {rawData.sectors.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-group" style={{ marginTop: '0.5rem' }}>
            <div className="filter-label">Busca Rápida</div>
            <div style={{ position: 'relative' }}>
               <input 
                 type="text" 
                 placeholder="ID, Usuário..." 
                 className="custom-select" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 style={{ paddingLeft: '2.2rem' }}
               />
               <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            </div>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="header">
          <div className="header-title">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              CHAMADOS DE TI <Ticket size={24} color="var(--brand-red)" />
            </h1>
          </div>
          <div className="header-meta">
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textAlign: 'right' }}>
              Última Sincronização<br/>{rawData.last_updated}
            </div>
          </div>
        </header>

        {activeTab === 'performance' ? (
          <>
            {/* TOP CENTRAL FILTER BAR */}
            <div className="filter-bar animate-fade">
               <div className="filter-bar-group">
                  <Filter size={16} color="var(--brand-red)" />
                  <div className="filter-btn-group">
                     {['7D', '30D', 'Ano Atual', 'Tudo'].map(label => (
                        <button 
                          key={label} 
                          className={`filter-btn ${activeInterval === label ? 'active' : ''}`}
                          onClick={() => handleInterval(label)}
                        >
                           {label}
                        </button>
                     ))}
                  </div>
               </div>
               
               <div style={{ width: '1px', height: '20px', background: 'var(--border-dim)' }}></div>
               
               <div className="filter-bar-group">
                  <div className="date-input-group">
                     <span>DE</span>
                     <input 
                       type="date" 
                       className="date-picker" 
                       value={startDate} 
                       onChange={(e) => { setStartDate(e.target.value); setActiveInterval('Personalizado'); }} 
                     />
                  </div>
                  <div className="date-input-group">
                     <span>ATÉ</span>
                     <input 
                       type="date" 
                       className="date-picker" 
                       value={endDate} 
                       onChange={(e) => { setEndDate(e.target.value); setActiveInterval('Personalizado'); }} 
                     />
                  </div>
               </div>
            </div>

            {/* SECTION 1: KPIs */}
            <section id="basics" className="section-anchor">
              <div className="kpi-grid">
                <div className="card card-red animate-fade">
                  <div className="card-label">Total Chamados</div>
                  <div className="card-value value-red">{metrics.total.toLocaleString()}</div>
                </div>
                <div className="card card-orange animate-fade">
                  <div className="card-label">TMA (Resol.)</div>
                  <div className="card-value value-orange">{formatTime(metrics.avgTotal)}</div>
                </div>
                <div className="card animate-fade">
                  <div className="card-label">TMF (Espera)</div>
                  <div className="card-value">{formatTime(metrics.avgWait)}</div>
                </div>
                <div className="card card-green animate-fade">
                  <div className="card-label">CSAT</div>
                  <div className="card-value value-green">{metrics.csatScore.toFixed(1)}%</div>
                </div>
              </div>

              <div className="equal-col-grid">
                 <div className="card">
                    <div className="card-label">Chamados por Atendente</div>
                    <ResponsiveContainer width="100%" height={280}>
                       <BarChart data={agentPerf}>
                          <XAxis dataKey="name" stroke="#888" fontSize={10} hide={agentPerf.length > 5} />
                          <YAxis stroke="#888" fontSize={10} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', fontSize: '12px', borderRadius: '8px', color: 'var(--text-primary)' }} 
                            itemStyle={{ color: 'var(--text-primary)' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                          />
                          <Bar dataKey="count" name="Total" radius={[4, 4, 0, 0]}>
                             {agentPerf.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                 </div>
                  <div className="card">
                    <div className="card-label">Top Categorias</div>
                    <ResponsiveContainer width="100%" height={280}>
                       <BarChart data={topCategories} layout="vertical" margin={{ left: 20, right: 30 }}>
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" stroke="#888" fontSize={9} width={180} tickFormatter={(v) => v.length > 30 ? v.substring(0, 30) + '...' : v} />
                          <Tooltip 
                            contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', fontSize: '11px', borderRadius: '8px', color: 'var(--text-primary)' }} 
                            itemStyle={{ color: 'var(--text-primary)' }}
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                          />
                          <Bar dataKey="count" name="Total" radius={[0, 4, 4, 0]} barSize={12}>
                             {topCategories.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                       </BarChart>
                    </ResponsiveContainer>
                  </div>
              </div>
            </section>

            <section id="trends" className="section-anchor">
               <div className="two-col-grid">
                  <div className="card">
                     <div className="card-label">Fluxo Semanal</div>
                     <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={weekData}>
                           <XAxis dataKey="day" stroke="#999" fontSize={11} axisLine={false} tickLine={false} />
                           <YAxis stroke="#999" fontSize={10} />
                           <Tooltip 
                             contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px', color: 'var(--text-primary)' }} 
                             itemStyle={{ color: 'var(--text-primary)' }}
                             cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                           />
                           <Bar dataKey="count" name="Total" radius={[4, 4, 0, 0]} fill="var(--brand-red)" />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
                  <div className="card">
                     <div className="card-label">Heatmap (09h - 18h)</div>
                     <table className="heatmap-table">
                        <thead>
                           <tr>
                              <th></th>
                              {HOURS.map(h => <th key={h} style={{ fontSize: '0.6rem', color: '#555' }}>{h}h</th>)}
                           </tr>
                        </thead>
                        <tbody>
                           {heatmapMatrix.matrix.map((row, i) => (
                              <tr key={i}>
                                 <td style={{ fontSize: '0.6rem', color: '#666' }}>{row.day.substring(0,3)}</td>
                                 {row.hours.map((h, j) => (
                                    <td key={j}>
                                       <div className="heatmap-cell" style={{ background: getHeatColor(h.count, heatmapMatrix.max) }}>
                                          {h.count > 0 ? h.count : ''}
                                       </div>
                                    </td>
                                 ))}
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </section>

            <section id="raw" className="section-anchor">
               <div className="card" style={{ padding: 0 }}>
                  <div className="data-table-container">
                     <table className="data-table">
                        <thead>
                           <tr>
                              <th>ID</th>
                              <th>Atendente</th>
                              <th style={{ minWidth: '150px' }}>Contato</th>
                              <th>Tempo</th>
                           </tr>
                        </thead>
                        <tbody>
                           {filteredTickets.slice(0, 100).map((t, i) => (
                              <tr key={i}>
                                 <td style={{ color: 'var(--brand-red)', fontWeight: 700 }}>{t.id}</td>
                                 <td>{t.agent}</td>
                                 <td style={{ color: 'var(--text-primary)' }}>{t.user}</td>
                                 <td>{formatTime(t.total)}</td>
                              </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
            </section>
          </>
        ) : activeTab === 'map' ? (
          <div className="map-view-container animate-fade" style={{ padding: '1rem' }}>
            <div className="card" style={{ height: '750px', display: 'flex', flexDirection: 'column', gap: '2rem', background: 'radial-gradient(circle at top right, rgba(239, 68, 68, 0.05), transparent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                   <div>
                      <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                         MAPA DE <span style={{ color: 'var(--brand-red)' }}>CRITICIDADE</span>
                      </h2>
                      <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>Análise geográfica de densidade de chamados por regional e tecnologia</p>
                   </div>
                   <div style={{ display: 'flex', gap: '1.5rem', background: 'rgba(0,0,0,0.1)', padding: '0.8rem 1.2rem', borderRadius: '50px', border: '1px solid var(--border-dim)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                         <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-red)' }}></div> ATHENAS
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                         <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }}></div> DEGUST
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                         <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-orange)' }}></div> HARDWARE
                      </div>
                   </div>
                </div>

                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.1fr 340px', gap: '2rem', height: 'calc(100% - 100px)' }}>
                   <div style={{ position: 'relative', background: 'var(--bg-dark)', borderRadius: '16px', border: '1px solid var(--border-dim)', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}>
                         <MapContainer 
                            center={[-12.0, -50.0]} 
                            zoom={4} 
                            scrollWheelZoom={true} 
                            style={{ width: '100%', height: '100%', background: 'transparent' }}
                         >
                            <TileLayer
                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                              url={theme === 'dark' 
                                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                                : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                              }
                            />
                            <HeatmapLayer data={criticalityData} />
                         </MapContainer>
                      </div>
                   </div>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ranking por Regional</div>
                      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
                         {criticalityData.map((reg, i) => (
                           <div key={i} style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid var(--border-dim)', borderRadius: '12px', padding: '1rem', marginBottom: '1rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                                 <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>{reg.name}</span>
                                 <span style={{ fontSize: '0.8rem', color: 'var(--brand-red)', fontWeight: 900 }}>{reg.total} chamados</span>
                              </div>
                              <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
                                 <div style={{ width: `${(reg.Athenas/reg.total)*100}%`, background: 'var(--brand-red)' }}></div>
                                 <div style={{ width: `${(reg.Degust/reg.total)*100}%`, background: '#3b82f6' }}></div>
                                 <div style={{ width: `${(reg.Hardware/reg.total)*100}%`, background: 'var(--brand-orange)' }}></div>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
                                 <span>ATH: {reg.Athenas}</span>
                                 <span>DEG: {reg.Degust}</span>
                                 <span>HW: {reg.Hardware}</span>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="base-view-container animate-fade" style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-dim)' }}>
                   <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>VISUALIZAÇÃO DE BASE</h2>
                   <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Acesso espelhado aos dados brutos da planilha (Sem tratamento/filtros)</p>
                </div>
                <div style={{ flex: 1, overflow: 'auto' }}>
                   <table className="data-table">
                      <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                         <tr>
                            <th>ID</th>
                            <th>Data</th>
                            <th>Agente</th>
                            <th>Usuário</th>
                            <th style={{ minWidth: '200px' }}>Setor</th>
                            <th style={{ minWidth: '200px' }}>Empresa</th>
                            <th>Espera (s)</th>
                            <th>Total (s)</th>
                            <th>CSAT</th>
                         </tr>
                      </thead>
                      <tbody>
                         {rawData.tickets.map((t, i) => (
                           <tr key={i}>
                              <td style={{ color: 'var(--brand-red)', fontWeight: 700 }}>{t.id}</td>
                              <td>{t.date}</td>
                              <td>{t.agent}</td>
                              <td>{t.user}</td>
                              <td>{t.sector}</td>
                              <td>{t.company}</td>
                              <td>{t.wait}</td>
                              <td style={{ fontWeight: 600 }}>{t.total}</td>
                              <td style={{ fontSize: '0.7rem' }}>{t.csat}</td>
                           </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
            </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isTvMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="tv-mode">
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4rem' }}>
                <h1 style={{ color: 'white', fontSize: '3rem' }}>MODO <span style={{ color: 'var(--brand-red)' }}>TV</span></h1>
                <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--brand-red)' }}>{metrics.total}</div>
             </div>
             <button onClick={() => setIsTvMode(false)} style={{ position: 'absolute', bottom: '3rem', right: '3rem', background: '#ef4444', color: 'white', border: 'none', padding: '1rem 2rem', borderRadius: '8px', cursor: 'pointer' }}>
                FECHAR
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
