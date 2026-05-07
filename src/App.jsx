import React, { useState, useMemo, useEffect } from 'react';
import { AlertCircle, BarChart2, Calendar, CheckCircle2, Clock, Diamond, Download, Filter, Folder, Info, LayoutGrid, List, MapPin, Menu, Monitor, Moon, PieChart, RefreshCcw as SyncIcon, Search, Sun, Ticket, TrendingUp, Trophy, Tv, Users, X, Zap } from 'lucide-react';
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
  Pie,
  Legend,
  ComposedChart,
  Brush,
  LabelList
} from 'recharts';
import { MapContainer, TileLayer, useMap, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

const formatMonthKey = (key) => {
  if (!key || !key.includes('-')) return key;
  const [year, month] = key.split('-');
  return `${MONTH_NAMES[parseInt(month) - 1]} ${year}`;
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
};

const getElapsedTime = (isoString) => {
  if (!isoString) return '';
  try {
    const created = new Date(isoString);
    const now = new Date();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Aberto há ${diffMins}min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Aberto há ${diffHours}h ${diffMins % 60}min`;
    const diffDays = Math.floor(diffHours / 24);
    return `Aberto há ${diffDays} dias`;
  } catch (e) {
    return '';
  }
};

const GrowthBadge = ({ change, isNegativeGood = false }) => {
  if (!change || change.direction === 'none' || change.val === 0) return null;

  let isGood = change.direction === 'up';
  if (isNegativeGood) {
    isGood = change.direction === 'down';
  }

  const color = isGood ? 'var(--brand-green)' : (change.direction === 'up' ? 'var(--brand-red)' : 'var(--brand-orange)');
  const bg = isGood ? 'rgba(79, 112, 67, 0.12)' : (change.direction === 'up' ? 'rgba(218, 13, 23, 0.12)' : 'rgba(218, 85, 19, 0.12)');
  const border = isGood ? '1px solid rgba(79, 112, 67, 0.2)' : (change.direction === 'up' ? '1px solid rgba(218, 13, 23, 0.2)' : '1px solid rgba(218, 85, 19, 0.2)');

  const arrowSymbol = change.direction === 'up' ? '↑' : '↓';

  return (
    <div style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      gap: '2px', 
      padding: '2px 6px', 
      borderRadius: '4px', 
      fontSize: '0.65rem', 
      fontWeight: 800, 
      color, 
      background: bg,
      border,
      fontFamily: 'JetBrains Mono, monospace',
      whiteSpace: 'nowrap',
      height: 'fit-content'
    }} title="Comparado ao período/mês anterior">
      <span>{arrowSymbol} {change.str.replace('+', '').replace('-', '')}</span>
    </div>
  );
};

const SanPaoloLogo = ({ size = 28, color = 'var(--brand-red)' }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transition: 'all 0.3s' }}>
    <path d="M25 45C25 31.1929 36.1929 20 50 20C63.8071 20 75 31.1929 75 45H25Z" fill={color} opacity="0.15" />
    <path d="M35 45C35 36.7157 41.7157 30 50 30C58.2843 30 65 36.7157 65 45H35Z" fill={color} />
    <path d="M20 45C20 45 22 75 50 75C78 75 80 45 80 45H20Z" fill={color} opacity="0.85" />
    <path d="M15 45H85V50H15V45Z" fill={color} />
    <path d="M48 10L52 10V32H48V10Z" fill={color} opacity="0.7" />
  </svg>
);

const COLORS = ['var(--brand-red)', 'var(--brand-orange)', 'var(--brand-blue)', 'var(--brand-green)', 'var(--brand-pink)', 'var(--brand-brown)', 'var(--brand-beige)', 'var(--text-dim)'];

const CSAT_WEIGHTS = {
  'Muito Satisfeito': 100,
  'Satisfeito': 75,
  'Indiferente': 50,
  'Insatisfeito': 25
};
const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const HOURS = Array.from({ length: 10 }, (_, i) => i + 9); // 9h to 18h

// Custom Icon for Stores
const storeIconHtml = `
<div style="position: relative; display: flex; flex-direction: column; align-items: center; filter: drop-shadow(0px 3px 4px rgba(0,0,0,0.4));">
  <svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2C7.37258 2 2 7.37258 2 14C2 23 14 36 14 36C14 36 26 23 26 14C26 7.37258 20.6274 2 14 2Z" fill="var(--brand-green)" stroke="white" stroke-width="2"/>
    <circle cx="14" cy="14" r="6" fill="white"/>
    <circle cx="14" cy="14" r="3" fill="var(--brand-green)"/>
  </svg>
</div>
`;

const storeIcon = L.divIcon({
  className: 'custom-pin-icon',
  html: storeIconHtml,
  iconSize: [28, 38],
  iconAnchor: [14, 38],
  popupAnchor: [0, -38]
});

const StorePopupContent = ({ store, tickets }) => {
  const parts = store.name.split('-');
  const state = parts.length > 1 ? parts[0].trim() : '';
  const storeNameRaw = parts.length > 1 ? parts.slice(1).join('-').trim() : store.name;
  
  const storeTickets = tickets.filter(t => {
    if (!t.company) return false;
    const c1 = t.company.toUpperCase();
    const c2 = storeNameRaw.toUpperCase();
    return c1.includes(c2) || c2.includes(c1);
  });
  
  const hasTickets = storeTickets.length > 0;
  const avgWait = hasTickets ? storeTickets.reduce((sum, t) => sum + t.wait, 0) / storeTickets.length : 0;
  const avgTotal = hasTickets ? storeTickets.reduce((sum, t) => sum + t.total, 0) / storeTickets.length : 0;
  
  return (
    <div style={{ padding: '0.8rem', width: '260px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
        <h3 style={{ color: 'var(--brand-blue)', margin: 0, fontSize: '1.1rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{storeNameRaw}</h3>
        {state && <span style={{ background: '#1a0f0a', border: '1px solid #33221a', color: 'white', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>{state}</span>}
      </div>
      
      <div style={{ background: '#1a0f0a', borderRadius: '8px', padding: '1.5rem 1rem', textAlign: 'center', border: '1px dashed #33221a' }}>
        {!hasTickets ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
              <div style={{ border: '2px solid #f97316', borderRadius: '50%', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={18} color="#f97316" />
              </div>
            </div>
            <div style={{ color: '#f97316', fontSize: '0.85rem', fontWeight: 500 }}>Sistema operando normalmente</div>
          </>
        ) : (
          <>
             <div style={{ color: 'var(--brand-blue)', fontSize: '2rem', fontWeight: 900, marginBottom: '0.2rem', lineHeight: 1 }}>{storeTickets.length}</div>
             <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', marginBottom: '1.2rem' }}>chamados filtrados</div>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                   <span>Espera Média:</span>
                   <span style={{ color: 'white', fontWeight: 700, offset: 12 }}>{formatTime(avgWait)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
                   <span>Resolução Média:</span>
                   <span style={{ color: 'white', fontWeight: 700, offset: 12 }}>{formatTime(avgTotal)}</span>
                </div>
             </div>
          </>
        )}
      </div>
    </div>
  );
};

const getCsatColor = (score) => {
  if (score > 80) return 'var(--brand-green)';
  if (score >= 50) return 'var(--brand-yellow)';
  return 'var(--brand-red)';
};

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
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  
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
    // Auto-refresh data every 10 seconds for real-time dashboard updates
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
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

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setSelectedUser(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);
  
  // Modal State
  const [selectedUser, setSelectedUser] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [tvSlideIndex, setTvSlideIndex] = useState(0);
  const [tvScale, setTvScale] = useState(1);
  const [excludedAgents, setExcludedAgents] = useState([]);
  const [isAgentFilterOpen, setIsAgentFilterOpen] = useState(true);

  // Resolution-independent scaling for TV Presentation Mode (scales 1920x1080 design to fit any screen size natively)
  useEffect(() => {
    if (!isTvMode) return;
    
    const handleResize = () => {
      const designWidth = 1920;
      const designHeight = 1080;
      const scaleX = window.innerWidth / designWidth;
      const scaleY = window.innerHeight / designHeight;
      // Fit completely inside the screen (contain mode)
      const scale = Math.min(scaleX, scaleY);
      setTvScale(scale);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [isTvMode]);

  // Synchronize isTvMode with browser fullscreen state (e.g. if user exits with ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!document.fullscreenElement;
      if (!isCurrentlyFullscreen && isTvMode) {
        setIsTvMode(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isTvMode]);

  useEffect(() => {
    let interval;
    if (isTvMode) {
      // 1. Force performance tab to ensure slides are visible
      setActiveTab('performance');
      // 2. Collapse the sidebar immediately
      setIsSidebarOpen(false);
      // 3. Request fullscreen if not already in fullscreen
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
      }
      // 4. Start slideshow interval
      interval = setInterval(() => {
        setTvSlideIndex(prev => (prev + 1) % 4);
      }, 15000);
    } else {
      // 1. Exit fullscreen if currently in fullscreen
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log(err));
      }
      // 2. Reset slide index and restore the sidebar
      setTvSlideIndex(0);
      setIsSidebarOpen(true);
    }
    return () => clearInterval(interval);
  }, [isTvMode]);



  // Date Filtering State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeInterval, setActiveInterval] = useState('Tudo');



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

      const agentMatch = !excludedAgents.includes(t.agent);
      const sectorMatch = selectedSector === 'Todos' || t.sector === selectedSector;
      const searchMatch = !searchQuery || 
        t.user.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toString().includes(searchQuery);
      
      const dateVal = t.date;
      const dateMatch = (!startDate || dateVal >= startDate) && (!endDate || dateVal <= endDate);
      
      return agentMatch && sectorMatch && searchMatch && dateMatch;
    });
  }, [rawData, selectedAgent, selectedSector, searchQuery, startDate, endDate]);

  const selectedUserStats = useMemo(() => {
    if (!selectedUser) return null;
    
    const userTickets = filteredTickets.filter(t => t.user === selectedUser);
    if (userTickets.length === 0) return null;

    const total = userTickets.length;
    const avgWait = userTickets.reduce((acc, t) => acc + t.wait, 0) / (total || 1);
    const avgTotal = userTickets.reduce((acc, t) => acc + t.total, 0) / (total || 1);

    const csatWeights = { 'Muito Satisfeito': 100, 'Satisfeito': 75, 'Indiferente': 50, 'Insatisfeito': 25 };
    const rated = userTickets.filter(t => t.csat && csatWeights[t.csat] !== undefined);
    const totalScore = rated.reduce((sum, t) => sum + csatWeights[t.csat], 0);
    const csatScore = rated.length > 0 ? (totalScore / rated.length) : 0;

    // Áreas Mais Abertas
    const categoryCounts = userTickets.reduce((acc, t) => {
      const cat = t.category || t.main_category || 'Sem categoria';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    const topCategories = Object.entries(categoryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name: name.length > 40 ? name.substring(0, 40) + '...' : name, count }));

    // Histórico de Volume
    const monthCounts = userTickets.reduce((acc, t) => {
      if (!t.month) return acc;
      acc[t.month] = (acc[t.month] || 0) + 1;
      return acc;
    }, {});
    
    const history = Object.entries(monthCounts)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([month, count]) => ({ month, count }));

    const company = userTickets[0].company || 'N/A';

    return { total, avgWait, avgTotal, csatScore, topCategories, history, company };
  }, [selectedUser, filteredTickets]);

  const availableMonths = useMemo(() => {
    const months = new Set();
    rawData.tickets.forEach(t => {
      if (t.date && typeof t.date === 'string') {
        const [y, m] = t.date.split('-');
        months.add(`${y}-${m}`);
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [rawData.tickets]);

  const trendData = useMemo(() => {
    const weekdayCounts = { 
      0: { suporte: 0, cadastro: 0 }, 
      1: { suporte: 0, cadastro: 0 }, 
      2: { suporte: 0, cadastro: 0 }, 
      3: { suporte: 0, cadastro: 0 }, 
      4: { suporte: 0, cadastro: 0 }, 
      5: { suporte: 0, cadastro: 0 }, 
      6: { suporte: 0, cadastro: 0 } 
    };
    const weekdayOccurrences = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set(), 6: new Set() };

    filteredTickets.forEach(t => {
      if (!t.date || typeof t.date !== 'string') return;
      
      const dateObj = new Date(t.date + 'T12:00:00');
      const dayIndex = (dateObj.getDay() + 6) % 7;
      
      const sector = (t.sector || '').toUpperCase();
      const isSuporte = sector.includes('SUPORTE') || sector.includes('ATHENAS') || sector.includes('PDV');
      const isCadastro = sector.includes('CADASTRO');

      if (isSuporte) weekdayCounts[dayIndex].suporte++;
      if (isCadastro) weekdayCounts[dayIndex].cadastro++;
      
      weekdayOccurrences[dayIndex].add(t.date);
    });
    
    return WEEKDAYS.map((name, i) => {
      const stats = weekdayCounts[i];
      const days = weekdayOccurrences[i].size || 1;
      return { 
        label: name, 
        suporte: parseFloat((stats.suporte / days).toFixed(1)),
        cadastro: parseFloat((stats.cadastro / days).toFixed(1))
      };
    });
  }, [filteredTickets]);

  const monthlyData = useMemo(() => {
    const monthGroups = {};
    const monthDays = {};

    filteredTickets.forEach(t => {
      if (!t.date) return;
      const [year, month] = t.date.split('-');
      const key = `${year}-${month}`;
      
      if (!monthGroups[key]) {
        monthGroups[key] = { suporte: 0, cadastro: 0 };
        monthDays[key] = new Set();
      }
      
      const sector = (t.sector || '').toUpperCase();
      const isSuporte = sector.includes('SUPORTE') || sector.includes('ATHENAS') || sector.includes('PDV');
      const isCadastro = sector.includes('CADASTRO');

      if (isSuporte) monthGroups[key].suporte++;
      if (isCadastro) monthGroups[key].cadastro++;
      
      monthDays[key].add(t.date);
    });

    return Object.keys(monthGroups).sort().map(key => {
      const stats = monthGroups[key];
      const days = monthDays[key].size || 1;
      return {
        label: formatMonthKey(key),
        totalSuporte: stats.suporte,
        totalCadastro: stats.cadastro,
        avgSuporte: parseFloat((stats.suporte / days).toFixed(1)),
        avgCadastro: parseFloat((stats.cadastro / days).toFixed(1))
      };
    });
  }, [filteredTickets]);

  const dailyTrendData = useMemo(() => {
    if (!selectedMonth) return [];
    const monthlyTickets = rawData.tickets.filter(t => t.date && typeof t.date === 'string' && t.date.startsWith(selectedMonth));
    
    const grouped = monthlyTickets.reduce((acc, t) => {
      if (!acc[t.date]) acc[t.date] = { atendidos: 0, naoAtendidos: 0 };
      
      const isAtendido = !['Não Atribuído', 'Sistema'].includes(t.agent) && t.total > 0;
      if (isAtendido) acc[t.date].atendidos++;
      else acc[t.date].naoAtendidos++;
      
      return acc;
    }, {});

    const dates = Object.keys(grouped).sort();
    return dates.map(date => {
      const day = date.split('-')[2];
      const stats = grouped[date];
      return {
        label: `${day}/${date.split('-')[1]}`,
        atendidos: stats.atendidos,
        naoAtendidos: stats.naoAtendidos
      };
    });
  }, [rawData.tickets, selectedMonth]);

  // Auto-select latest month when data is loaded
  useEffect(() => {
    if (availableMonths.length > 0 && selectedMonth === '2026-03') {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths]);

  // KPIs
  const metrics = useMemo(() => {
    const total = filteredTickets.length;
    const avgWait = filteredTickets.reduce((acc, t) => acc + t.wait, 0) / (total || 1);
    const avgTotal = filteredTickets.reduce((acc, t) => acc + t.total, 0) / (total || 1);

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

    // User KPIs
    const users = Array.from(new Set(filteredTickets.map(t => t.user)));
    const uniqueUsers = users.length;
    const userCounts = filteredTickets.reduce((acc, t) => { acc[t.user] = (acc[t.user] || 0) + 1; return acc; }, {});
    const mostActiveUser = uniqueUsers > 0 ? Object.entries(userCounts).sort((a,b) => b[1] - a[1])[0] : ['-', 0];
    const avgTicketsPerUser = total / (uniqueUsers || 1);
    
    // Most Active Company
    const companyCounts = filteredTickets.reduce((acc, t) => { if(t.company && t.company !== 'N/A') acc[t.company] = (acc[t.company] || 0) + 1; return acc; }, {});
    const mostActiveCompany = Object.keys(companyCounts).length > 0 ? Object.entries(companyCounts).sort((a,b) => b[1] - a[1])[0] : ['-', 0];

    const ratedCount = rated.length;
    return { total, avgWait, avgTotal, uniqueUsers, csatScore, ratedCount, mostActiveUser, avgTicketsPerUser, mostActiveCompany };
  }, [filteredTickets]);

  const comparisonMetrics = useMemo(() => {
    let currentTickets = [];
    let previousTickets = [];

    const hasDateFilter = startDate || endDate;

    if (hasDateFilter) {
      const getTicketDates = () => {
        if (rawData.tickets.length === 0) return { min: new Date(), max: new Date() };
        const datesList = rawData.tickets.map(t => new Date(t.date));
        return { min: new Date(Math.min(...datesList)), max: new Date(Math.max(...datesList)) };
      };

      const minMax = getTicketDates();
      const start = startDate ? new Date(startDate) : minMax.min;
      const end = endDate ? new Date(endDate) : minMax.max;

      const durationMs = end.getTime() - start.getTime();
      
      const prevEnd = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      const prevStart = new Date(prevEnd.getTime() - durationMs);

      const prevStartStr = prevStart.toISOString().split('T')[0];
      const prevEndStr = prevEnd.toISOString().split('T')[0];

      currentTickets = filteredTickets;
      previousTickets = rawData.tickets.filter(t => {
        if (['Não Atribuído', 'Sistema'].includes(t.agent) || t.total === 0) return false;

        const agentMatch = !excludedAgents.includes(t.agent);
        const sectorMatch = selectedSector === 'Todos' || t.sector === selectedSector;
        const searchMatch = !searchQuery || 
          t.user.toLowerCase().includes(searchQuery.toLowerCase()) || 
          t.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.id.toString().includes(searchQuery);
        
        const dateVal = t.date;
        const dateMatch = dateVal >= prevStartStr && dateVal <= prevEndStr;
        
        return agentMatch && sectorMatch && searchMatch && dateMatch;
      });
    } else {
      if (filteredTickets.length === 0) {
        return {
          total: { val: 0, str: '0%', direction: 'none' },
          avgTotal: { val: 0, str: '0%', direction: 'none' },
          avgWait: { val: 0, str: '0%', direction: 'none' },
          csatScore: { val: 0, str: '0 pp', direction: 'none' }
        };
      }

      const months = Array.from(new Set(filteredTickets.map(t => t.month).filter(Boolean))).sort();
      if (months.length > 0) {
        const latestMonth = months[months.length - 1];
        const [y, m] = latestMonth.split('-').map(Number);
        const prevMonthDate = new Date(y, m - 2, 1);
        const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

        currentTickets = filteredTickets.filter(t => t.month === latestMonth);
        previousTickets = filteredTickets.filter(t => t.month === prevMonthStr);
      } else {
        currentTickets = filteredTickets;
        previousTickets = [];
      }
    }

    const calcMetrics = (ticketsList) => {
      const total = ticketsList.length;
      if (total === 0) return { total: 0, avgTotal: 0, avgWait: 0, csatScore: 0 };

      const sumTotal = ticketsList.reduce((acc, t) => acc + t.total, 0);
      const sumWait = ticketsList.reduce((acc, t) => acc + t.wait, 0);

      const csatWeights = { 'Muito Satisfeito': 100, 'Satisfeito': 75, 'Indiferente': 50, 'Insatisfeito': 25 };
      const rated = ticketsList.filter(t => t.csat && csatWeights[t.csat] !== undefined);
      const sumCsat = rated.reduce((acc, t) => acc + csatWeights[t.csat], 0);

      return {
        total,
        avgTotal: sumTotal / total,
        avgWait: sumWait / total,
        csatScore: rated.length > 0 ? sumCsat / rated.length : 0
      };
    };

    const curr = calcMetrics(currentTickets);
    const prev = calcMetrics(previousTickets);

    const getChange = (currVal, prevVal, isCsat = false) => {
      if (!prevVal || prevVal === 0) return { val: 0, str: '0%', direction: 'none' };
      
      if (isCsat) {
        const diff = currVal - prevVal;
        const strVal = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} pp`;
        return {
          val: diff,
          str: strVal,
          direction: diff > 0 ? 'up' : (diff < 0 ? 'down' : 'none')
        };
      } else {
        const pct = ((currVal - prevVal) / prevVal) * 100;
        const strVal = `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`;
        return {
          val: pct,
          str: strVal,
          direction: pct > 0 ? 'up' : (pct < 0 ? 'down' : 'none')
        };
      }
    };

    return {
      total: getChange(curr.total, prev.total),
      avgTotal: getChange(curr.avgTotal, prev.avgTotal),
      avgWait: getChange(curr.avgWait, prev.avgWait),
      csatScore: getChange(curr.csatScore, prev.csatScore, true)
    };
  }, [filteredTickets, rawData.tickets, startDate, endDate, selectedAgent, selectedSector, searchQuery]);

  const categoryDistribution = useMemo(() => {
    const counts = filteredTickets.reduce((acc, t) => {
      const cat = t.main_category || 'OUTROS';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
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
    const weekdayCounts = { 
      0: { suporte: 0, cadastro: 0 }, 
      1: { suporte: 0, cadastro: 0 }, 
      2: { suporte: 0, cadastro: 0 }, 
      3: { suporte: 0, cadastro: 0 }, 
      4: { suporte: 0, cadastro: 0 }, 
      5: { suporte: 0, cadastro: 0 }, 
      6: { suporte: 0, cadastro: 0 } 
    };
    const weekdayOccurrences = { 0: new Set(), 1: new Set(), 2: new Set(), 3: new Set(), 4: new Set(), 5: new Set(), 6: new Set() };

    filteredTickets.forEach(t => {
      if (t.weekday !== -1 && t.date) {
        const sector = (t.sector || '').toUpperCase();
        const isSuporte = sector.includes('SUPORTE') || sector.includes('ATHENAS') || sector.includes('PDV');
        const isCadastro = sector.includes('CADASTRO');

        if (isSuporte) weekdayCounts[t.weekday].suporte++;
        if (isCadastro) weekdayCounts[t.weekday].cadastro++;
        
        weekdayOccurrences[t.weekday].add(t.date);
      }
    });

    return WEEKDAYS.map((day, i) => {
      const occurrences = weekdayOccurrences[i].size || 1;
      return { 
        day: day.substring(0, 3), 
        suporte: parseFloat((weekdayCounts[i].suporte / occurrences).toFixed(1)),
        cadastro: parseFloat((weekdayCounts[i].cadastro / occurrences).toFixed(1))
      };
    });
  }, [filteredTickets]);

  const heatmapMatrix = useMemo(() => {
    const matrix = WEEKDAYS.map((day, dIdx) => ({
      day,
      hours: HOURS.map(h => ({ hour: h, count: 0 })),
      uniqueDates: new Set()
    }));

    filteredTickets.forEach(t => {
      if (t.weekday !== -1 && t.hour >= 9 && t.hour <= 18) {
        const hIdx = t.hour - 9;
        matrix[t.weekday].hours[hIdx].count++;
        if (t.date) matrix[t.weekday].uniqueDates.add(t.date);
      }
    });

    // Normalize by unique days to get average
    matrix.forEach(row => {
      const daysCount = row.uniqueDates.size || 1;
      row.hours.forEach(h => {
        h.count = parseFloat((h.count / daysCount).toFixed(1));
      });
    });

    let max = 0.1;
    matrix.forEach(d => d.hours.forEach(h => { if (h.count > max) max = h.count; }));
    return { matrix, max };
  }, [filteredTickets]);

  const getHeatColor = (count) => {
    if (count === 0) return 'rgba(255,255,255,0.02)';
    if (count >= 5) return 'rgba(218, 13, 23, 0.6)'; // Vermelho (>5)
    if (count >= 2) return 'rgba(218, 85, 19, 0.4)'; // Laranja (2-5)
    return 'rgba(79, 112, 67, 0.4)'; // Verde (<2)
  };

  // Section 3: SLA & Satisfação
  const csatData = useMemo(() => {
    const counts = filteredTickets.reduce((acc, t) => {
      acc[t.csat] = (acc[t.csat] || 0) + 1;
      return acc;
    }, {});
    return [
      { name: 'Insatisfeito', value: counts['Insatisfeito'] || 0, color: 'var(--brand-red)' },
      { name: 'Indiferente', value: counts['Indiferente'] || 0, color: '#f59e0b' },
      { name: 'Satisfeito', value: counts['Satisfeito'] || 0, color: 'var(--brand-blue)' },
      { name: 'Muito Satisfeito', value: counts['Muito Satisfeito'] || 0, color: 'var(--brand-green)' }
    ];
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
      if (!acc[t.month]) acc[t.month] = { count: 0, time: 0, csatSum: 0, csatRated: 0 };
      acc[t.month].count++;
      acc[t.month].time += t.total;
      
      const score = CSAT_WEIGHTS[t.csat];
      if (score !== undefined) {
        acc[t.month].csatSum += score;
        acc[t.month].csatRated++;
      }
      return acc;
    }, {});
    
    return Object.entries(dataByMonth)
      .sort((a,b) => a[0].localeCompare(b[0]))
      .map(([month, d]) => ({ 
        month: formatMonthKey(month), 
        volume: d.count, 
        time: Math.round((d.time / d.count) / 60),
        csat: d.csatRated > 0 ? parseFloat((d.csatSum / d.csatRated).toFixed(1)) : 0
      }));
  }, [filteredTickets]);

  // Section 5: Ranking Usuários & Comparativo
  const userRanking = useMemo(() => {
    const userGroups = filteredTickets.reduce((acc, t) => {
      if (!acc[t.user]) acc[t.user] = { count: 0, company: t.company };
      acc[t.user].count++;
      return acc;
    }, {});
    const sorted = Object.entries(userGroups).sort((a,b) => b[1].count - a[1].count).slice(0, 20);
    const max = sorted[0]?.[1].count || 1;
    return sorted.map(([name, d]) => ({ name, company: d.company, count: d.count, percent: (d.count / max) * 100 }));
  }, [filteredTickets]);

  const userTypeRanking = useMemo(() => {
    // Top users and their common main_category
    const userCategories = filteredTickets.reduce((acc, t) => {
      if (!acc[t.user]) acc[t.user] = {};
      const cat = t.main_category || 'OUTROS';
      acc[t.user][cat] = (acc[t.user][cat] || 0) + 1;
      return acc;
    }, {});

    const topUsers = Object.entries(filteredTickets.reduce((acc, t) => { acc[t.user] = (acc[t.user] || 0) + 1; return acc; }, {}))
      .sort((a,b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);

    return topUsers.map(user => {
      const cats = userCategories[user] || {};
      return {
        name: user.length > 15 ? user.substring(0, 15) + '...' : user,
        ATHENAS: cats['ATHENAS'] || 0,
        PDV: cats['PDV'] || 0,
        SISTEMAS: cats['SISTEMAS'] || 0,
        OUTROS: cats['OUTROS'] || 0
      };
    });
  }, [filteredTickets]);

  const openTickets = useMemo(() => {
    return rawData.tickets.filter(t => {
      const status = t.status || 'Finalizado';
      return status !== 'Finalizado';
    }).sort((a, b) => b.id - a.id);
  }, [rawData.tickets]);

  // Calculate real-time pending vs being-attended metrics from openTickets
  const { emAtendimento, naFila } = useMemo(() => {
    let emAtendimento = 0;
    let naFila = 0;
    openTickets.forEach(t => {
      const agentLower = (t.agent || '').toLowerCase();
      const isUnassigned = !t.agent || agentLower === 'não atribuído' || agentLower === 'sistema' || agentLower === '';
      if (isUnassigned) {
        naFila++;
      } else {
        emAtendimento++;
      }
    });
    return { emAtendimento, naFila };
  }, [openTickets]);

  // Operational Metrics: Calculate today's real-time productivity aggregates (Brasília/Fortaleza Time)
  const dailyAgentMetrics = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/').reverse().join('-');

    // 1. Unassigned tickets currently in queue (not assigned to an active agent)
    const pendingInQueue = rawData.tickets.filter(t => {
      const status = t.status || 'Finalizado';
      if (status === 'Finalizado') return false;
      const agentLower = (t.agent || '').toLowerCase();
      return !t.agent || agentLower === 'não atribuído' || agentLower === 'sistema' || agentLower === '';
    }).length;

    // 2. Active agent aggregates for today
    const agentsMap = {};
    
    rawData.tickets.forEach(t => {
      const agent = t.agent || '';
      const agentLower = agent.toLowerCase();
      
      // Skip system or unassigned
      if (!agent || agentLower === 'não atribuído' || agentLower === 'sistema' || agentLower === '') {
        return;
      }

      // Format ticket date to YYYY-MM-DD for check
      const ticketDate = (t.created_at || '').substring(0, 10);
      const isToday = ticketDate === todayStr;

      // Status check
      const status = t.status || 'Finalizado';
      const isInProgress = status !== 'Finalizado';

      // We track agents active today: they either have a ticket in progress, or they resolved a ticket today
      const resolvedToday = (isToday && status === 'Finalizado') ? 1 : 0;

      if (isInProgress || resolvedToday > 0) {
        if (!agentsMap[agent]) {
          agentsMap[agent] = { name: agent, inProgress: 0, resolvedToday: 0 };
        }
        if (isInProgress) {
          agentsMap[agent].inProgress += 1;
        }
        agentsMap[agent].resolvedToday += resolvedToday;
      }
    });

    const activeAgents = Object.values(agentsMap).sort((a, b) => b.resolvedToday - a.resolvedToday);

    return {
      pendingInQueue,
      agents: activeAgents
    };
  }, [rawData.tickets]);

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
          0.2: 'var(--brand-blue)',
          0.4: 'var(--brand-green)',
          0.6: 'var(--brand-pink)',
          0.8: 'var(--brand-orange)',
          1.0: 'var(--brand-red)'
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
      <aside className="sidebar" style={{ width: isSidebarOpen ? '280px' : '0px', minWidth: isSidebarOpen ? '280px' : '0px', padding: isSidebarOpen ? '2rem' : '0', opacity: isSidebarOpen ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflowX: 'hidden' }}>
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '2.5rem' }}>
          <div className="logo-icon" style={{ background: 'rgba(255,255,255,0.15)', padding: '6px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '38px', height: '38px' }}>
            <SanPaoloLogo size={24} color="white" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'white', letterSpacing: '0.06em', fontFamily: 'Outfit, sans-serif' }}>SAN PAOLO</div>
            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.12em', fontWeight: 600 }}>GELATO & CAFFÈ</div>
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
              background: isSyncing ? 'rgba(138, 180, 248, 0.1)' : 'var(--brand-red)',
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
          <button 
             className="card"
             onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
             style={{ width: '100%', padding: '0.75rem', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px', color: 'var(--text-primary)', transition: '0.2s' }}
          >
             {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Ações & Utilitários</span>
          <div className="card" style={{ padding: '0.75rem', marginBottom: '1rem', cursor: 'pointer', borderColor: isTvMode ? 'var(--brand-orange)' : 'var(--border-dim)' }} onClick={() => setIsTvMode(!isTvMode)}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem' }}>
                   <Monitor size={14} color={isTvMode ? 'var(--brand-orange)' : 'var(--text-dim)'} />
                   <span style={{ color: isTvMode ? 'white' : 'var(--text-secondary)' }}>MODO TV</span>
                </div>
                <div className="switch">
                  <input type="checkbox" checked={isTvMode} readOnly />
                  <span className="slider"></span>
                </div>
             </div>
          </div>
        </div>

        <div className="sidebar-section">
          <span className="sidebar-label">Filtros Globais</span>
          <div className="filter-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <div className="filter-label" style={{ margin: 0 }}>Atendentes Exibidos</div>
              <button 
                onClick={() => setIsAgentFilterOpen(!isAgentFilterOpen)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--brand-red)', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
              >
                {isAgentFilterOpen ? 'Recolher' : 'Expandir'}
              </button>
            </div>
            
            {isAgentFilterOpen && (
              <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '8px', border: '1px solid var(--border-dim)', padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <button 
                    onClick={() => setExcludedAgents([])} 
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', borderRadius: '4px', color: 'white', fontSize: '0.6rem', fontWeight: 700, padding: '3px 0', cursor: 'pointer' }}
                  >
                    Marcar Todos
                  </button>
                  <button 
                    onClick={() => setExcludedAgents(rawData.agents)} 
                    style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', borderRadius: '4px', color: 'white', fontSize: '0.6rem', fontWeight: 700, padding: '3px 0', cursor: 'pointer' }}
                  >
                    Limpar Todos
                  </button>
                </div>
                
                {rawData.agents.map(agent => {
                  const isChecked = !excludedAgents.includes(agent);
                  return (
                    <label key={agent} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: isChecked ? 'white' : 'var(--text-dim)', cursor: 'pointer', fontWeight: isChecked ? 600 : 400, userSelect: 'none' }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => {
                          if (isChecked) {
                            setExcludedAgents([...excludedAgents, agent]);
                          } else {
                            setExcludedAgents(excludedAgents.filter(a => a !== agent));
                          }
                        }} 
                        style={{ accentColor: 'var(--brand-red)', cursor: 'pointer' }}
                      />
                      {agent}
                    </label>
                  );
                })}
              </div>
            )}
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
          
          <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center', fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.4)', fontWeight: 600 }}>
            Desenvolvido por<br/><strong style={{ color: 'white' }}>Lucas Eduardo Moura Santos</strong>
          </div>
        </div>
      </aside>

      <main className={`main-content ${isTvMode ? 'is-tv-mode' : ''}`} style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <header className="header" style={{ display: isTvMode ? 'none' : 'flex' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
             <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'transparent', border: '1px solid var(--border-dim)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}>
                <Menu size={20} />
             </button>
             <div className="header-title">
               <h1>CHAMADOS DE TI</h1>
               <div className="header-subtitle">
                  <span>SLA</span> <span style={{ color: 'var(--brand-red)' }}>·</span>
                  <span>Produtividade</span> <span style={{ color: 'var(--brand-red)' }}>·</span>
                  <span>Satisfação</span> <span style={{ color: 'var(--brand-red)' }}>·</span>
                  <span>Usuários</span>
               </div>
             </div>
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
            <div className="filter-bar animate-fade" style={{ display: isTvMode ? 'none' : 'flex' }}>
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

                         {(!isTvMode || tvSlideIndex === 0) && (
<div className="tv-slide animate-fade" style={isTvMode ? { transform: `scale(${tvScale})` } : {}}>
{/* SECTION 0: VISÃO GERAL */}
             <div className="section-header">
                <div className="section-prefix">
                   <LayoutGrid size={14} />
                   <Diamond size={12} style={{ color: 'var(--brand-red)' }} />
                </div>
                <h2 className="section-title">KPIS PRINCIPAIS</h2>
                <div className="section-line"></div>
             </div>
             <section className="section-anchor">
                <div className="kpi-grid">
                  <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-red)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Ticket size={14} color="var(--brand-red)" /><div className="card-label" style={{ margin: 0 }}>Total de Chamados</div></div>
                        <GrowthBadge change={comparisonMetrics.total} />
                      </div>
                      <div className="card-value" style={{ color: 'var(--brand-red)' }}>{metrics.total.toLocaleString()}</div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>chamados resolvidos</div>
                  </div>
                  <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-green)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><CheckCircle2 size={14} color="var(--brand-green)" /><div className="card-label" style={{ margin: 0 }}>Tempo Médio Resolução</div></div>
                        <GrowthBadge change={comparisonMetrics.avgTotal} isNegativeGood={true} />
                      </div>
                      <div className="card-value" style={{ color: 'var(--brand-green)' }}>{formatTime(metrics.avgTotal)}</div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>por chamado</div>
                  </div>
                  <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-orange)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Clock size={14} color="var(--brand-orange)" /><div className="card-label" style={{ margin: 0 }}>Tempo Médio na Fila</div></div>
                        <GrowthBadge change={comparisonMetrics.avgWait} isNegativeGood={true} />
                      </div>
                      <div className="card-value" style={{ color: 'var(--brand-orange)' }}>{formatTime(metrics.avgWait)}</div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>aguardando atendimento</div>
                  </div>
                  <div className="card animate-fade" style={{ borderTop: `2px solid ${getCsatColor(metrics.csatScore)}`, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Trophy size={14} color={getCsatColor(metrics.csatScore)} /><div className="card-label" style={{ margin: 0 }}>CSAT Score</div></div>
                        <GrowthBadge change={comparisonMetrics.csatScore} />
                      </div>
                      <div className="card-value" style={{ color: getCsatColor(metrics.csatScore) }}>{metrics.csatScore.toFixed(1)}%</div>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>{metrics.ratedCount} avaliações</div>
                  </div>
                </div>
             </section>

             {/* SECTION 0.1: USUÁRIOS EM DESTAQUE */}
             <div className="section-header" style={{ marginTop: '2rem' }}>
                <div className="section-prefix">
                   <LayoutGrid size={14} />
                   <Diamond size={12} style={{ color: 'var(--brand-orange)' }} />
                </div>
                <h2 className="section-title">USUÁRIOS EM DESTAQUE</h2>
                <div className="section-line"></div>
             </div>
             <section className="section-anchor">
               <div className="kpi-grid">
                 <div className="card animate-fade">
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <div className="card-label">Total de Usuários</div>
                      <div style={{ fontSize: '0.6rem', padding: '2px 6px', border: '1px solid var(--border-dim)', borderRadius: '4px', color: 'var(--text-dim)', textTransform: 'uppercase' }}>Ver Todos</div>
                   </div>
                   <div className="card-value">{metrics.uniqueUsers.toLocaleString()}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>usuários únicos</div>
                 </div>
                 <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-orange)' }}>
                   <div className="card-label">Usuário Mais Ativo</div>
                   <div className="card-value" style={{ fontSize: '1.2rem', marginTop: '0.5rem', color: 'var(--brand-orange)' }}>{metrics.mostActiveUser[0]}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>{metrics.mostActiveUser[1]} chamados</div>
                 </div>
                 <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-red)' }}>
                   <div className="card-label">Média por Usuário</div>
                   <div className="card-value" style={{ color: 'var(--brand-red)' }}>{Math.round(metrics.avgTicketsPerUser)}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>chamados/usuário</div>
                 </div>
                 <div className="card animate-fade" style={{ borderTop: '2px solid var(--brand-green)' }}>
                   <div className="card-label">Empresa Mais Ativa</div>
                   <div className="card-value" style={{ fontSize: '0.9rem', marginTop: '0.5rem', color: 'var(--brand-green)', fontWeight: 800 }}>{metrics.mostActiveCompany[0]}</div>
                   <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.5rem' }}>{metrics.mostActiveCompany[1]} chamados</div>
                 </div>
               </div>
             </section>


             {/* SECTION 0.2: CHAMADOS EM ABERTO (TEMPO REAL) */}
             <div className="section-header" style={{ marginTop: '2.5rem' }}>
                <div className="section-prefix">
                   <Clock size={14} color="var(--brand-red)" />
                   <div style={{
                     width: '8px',
                     height: '8px',
                     background: 'var(--brand-red)',
                     borderRadius: '50%',
                     boxShadow: '0 0 8px var(--brand-red)',
                     animation: 'pulse 2s infinite'
                   }} />
                </div>
                <h2 className="section-title">ACOMPANHAMENTO DE CHAMADOS EM ABERTO</h2>
                <div style={{
                  background: 'rgba(218, 13, 23, 0.12)',
                  color: 'var(--brand-red)',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginLeft: '10px',
                  border: '1px solid rgba(218, 13, 23, 0.2)'
                }}>
                   <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-red)', display: 'inline-block' }} className="animate-pulse"></span>
                   {openTickets.length} EM ABERTO
                 </div>

                 {/* Sub-indicadores de Fila (Atendimento vs Pendente) */}
                 <div style={{
                   background: 'rgba(38, 93, 124, 0.12)',
                   color: 'var(--brand-blue)',
                   padding: '4px 10px',
                   borderRadius: '12px',
                   fontSize: '0.65rem',
                   fontWeight: 800,
                   display: 'flex',
                   alignItems: 'center',
                   gap: '6px',
                   marginLeft: '8px',
                   border: '1px solid rgba(38, 93, 124, 0.2)'
                 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-blue)', display: 'inline-block' }}></span>
                    {emAtendimento} EM ATENDIMENTO
                 </div>

                 <div style={{
                   background: naFila > 0 ? 'rgba(218, 85, 19, 0.15)' : 'rgba(79, 112, 67, 0.12)',
                   color: naFila > 0 ? 'var(--brand-orange)' : 'var(--brand-green)',
                   padding: '4px 10px',
                   borderRadius: '12px',
                   fontSize: '0.65rem',
                   fontWeight: 800,
                   display: 'flex',
                   alignItems: 'center',
                   gap: '6px',
                   marginLeft: '8px',
                   border: naFila > 0 ? '1px solid rgba(218, 85, 19, 0.3)' : '1px solid rgba(79, 112, 67, 0.2)',
                   boxShadow: naFila > 0 ? '0 0 8px rgba(218, 85, 19, 0.2)' : 'none'
                 }}>
                    <span style={{ 
                      width: 6, 
                      height: 6, 
                      borderRadius: '50%', 
                      background: naFila > 0 ? 'var(--brand-orange)' : 'var(--brand-green)', 
                      display: 'inline-block' 
                    }} className={naFila > 0 ? 'animate-pulse' : ''}></span>
                    {naFila} AGUARDANDO ATENDENTE (PENDENTE)
                 </div>
                <div className="section-line"></div>
             </div>

                           <section className="section-anchor">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                  gap: '1.5rem',
                  alignItems: 'stretch'
                }}>
                  {/* COLUNA ESQUERDA: ÚLTIMOS CHAMADOS EM ABERTO */}
                  <div className="card" style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    justifyContent: 'flex-start'
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <Clock size={12} color="var(--brand-red)" />
                      Últimos Chamados em Aberto
                    </div>

                    {openTickets.length === 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        padding: '2.5rem 1rem',
                        border: '1.5px dashed rgba(79, 112, 67, 0.3)',
                        borderRadius: '8px',
                        background: 'rgba(79, 112, 67, 0.02)',
                        flex: 1
                      }}>
                        <div style={{ background: 'rgba(79, 112, 67, 0.12)', padding: '10px', borderRadius: '50%' }}>
                          <CheckCircle2 size={24} color="var(--brand-green)" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'white' }}>NENHUM CHAMADO EM ABERTO</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>Fila limpa! Todos os atendimentos concluídos.</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.75rem', 
                        maxHeight: '235px',
                        overflowY: 'auto', 
                        paddingRight: '0.25rem',
                        scrollBehavior: 'smooth',
                        WebkitOverflowScrolling: 'touch',
                        flex: 1
                      }} className="custom-vertical-scrollbar">
                        {openTickets.map((ticket, i) => (
                          <div key={i} style={{
                            borderLeft: '4px solid var(--brand-red)',
                            padding: '0.75rem 0.85rem',
                            background: 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--border-dim)',
                            borderLeftWidth: '4px',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            width: '100%'
                          }}>
                            {/* Header row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{
                                  background: 'rgba(218, 13, 23, 0.1)',
                                  color: 'var(--brand-red)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  fontFamily: 'JetBrains Mono, monospace'
                                }}>
                                  #{ticket.id}
                                </span>
                                <span style={{
                                  background: 'rgba(218, 85, 19, 0.1)',
                                  color: 'var(--brand-orange)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.6rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase'
                                }}>
                                  {ticket.status}
                                </span>
                              </div>
                              <span style={{
                                fontSize: '0.65rem',
                                color: 'var(--brand-red)',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--brand-red)', display: 'inline-block' }} className="animate-pulse"></span>
                                {getElapsedTime(ticket.created_at)}
                              </span>
                            </div>

                            {/* Ticket Title & User */}
                            <div style={{ margin: '0.2rem 0' }}>
                              <div style={{ fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ticket.user}</div>
                              <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: '0.1rem', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {ticket.company} • {ticket.sector}
                              </div>
                            </div>

                            {/* Footer row */}
                            <div style={{
                              borderTop: '1px solid var(--border-dim)',
                              paddingTop: '0.5rem',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '0.7rem'
                            }}>
                              <span style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                                Atendente: <strong style={{ color: 'white' }}>{ticket.agent}</strong>
                              </span>
                              {ticket.wait > 0 && (
                                <span style={{ color: 'var(--brand-orange)', fontWeight: 700 }}>
                                  Fila: {formatTime(ticket.wait)}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* COLUNA DIREITA: RESUMO OPERACIONAL DIÁRIO */}
                  <div className="card" style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-dim)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    justifyContent: 'flex-start'
                  }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontWeight: 800,
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <LayoutGrid size={12} />
                      Resumo Operacional Diário (Brasília Time)
                    </div>

                    {/* Fila Fator Alert */}
                    <div style={{
                      background: dailyAgentMetrics.pendingInQueue > 0 ? 'rgba(218, 13, 23, 0.05)' : 'rgba(79, 112, 67, 0.05)',
                      border: dailyAgentMetrics.pendingInQueue > 0 ? '1px solid rgba(218, 13, 23, 0.15)' : '1px solid rgba(79, 112, 67, 0.15)',
                      borderRadius: '8px',
                      padding: '0.75rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '1rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: dailyAgentMetrics.pendingInQueue > 0 ? 'var(--brand-red)' : 'var(--brand-green)',
                          boxShadow: dailyAgentMetrics.pendingInQueue > 0 ? '0 0 8px var(--brand-red)' : '0 0 8px var(--brand-green)',
                          animation: dailyAgentMetrics.pendingInQueue > 0 ? 'pulse 2s infinite' : 'none'
                        }} />
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                          Chamados Sem Atendente na Fila:
                        </span>
                      </div>
                      <span style={{
                        fontSize: '1rem',
                        fontWeight: 900,
                        color: dailyAgentMetrics.pendingInQueue > 0 ? 'var(--brand-red)' : 'var(--brand-green)',
                        fontFamily: 'JetBrains Mono, monospace'
                      }}>
                        {dailyAgentMetrics.pendingInQueue}
                      </span>
                    </div>

                    {/* Atendentes Section */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1, justifyContent: 'flex-start' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={12} />
                        Produtividade dos Agentes ({dailyAgentMetrics.agents.length})
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '180px', paddingRight: '4px' }}>
                        {dailyAgentMetrics.agents.length === 0 ? (
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center', padding: '1.5rem 0', fontStyle: 'italic' }}>
                            Nenhum agente realizou atendimento hoje.
                          </div>
                        ) : (
                          dailyAgentMetrics.agents.map((agent, i) => (
                            <div key={i} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.5rem 0.6rem',
                              background: 'rgba(255, 255, 255, 0.01)',
                              border: '1px solid var(--border-dim)',
                              borderRadius: '6px',
                              fontSize: '0.75rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: '50%',
                                  background: agent.inProgress > 0 ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  color: agent.inProgress > 0 ? 'var(--brand-blue)' : 'var(--text-secondary)',
                                  border: agent.inProgress > 0 ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent'
                                }}>
                                  {agent.name.substring(0, 1).toUpperCase()}
                                </div>
                                <span style={{ fontWeight: 700, color: 'white' }}>{agent.name}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {/* Em Atendimento */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{
                                    width: 6,
                                    height: 6,
                                    borderRadius: '50%',
                                    background: agent.inProgress > 0 ? 'var(--brand-blue)' : 'rgba(255,255,255,0.1)',
                                    display: 'inline-block',
                                    animation: agent.inProgress > 0 ? 'pulse 2s infinite' : 'none'
                                  }} />
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: agent.inProgress > 0 ? 'var(--brand-blue)' : 'var(--text-dim)' }}>
                                    {agent.inProgress} ativo{agent.inProgress !== 1 ? 's' : ''}
                                  </span>
                                </div>

                                <div style={{ width: '1px', height: '12px', background: 'var(--border-dim)' }} />

                                {/* Resolvidos Hoje */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <CheckCircle2 size={10} color="var(--brand-green)" />
                                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: agent.resolvedToday > 0 ? 'var(--brand-green)' : 'var(--text-dim)' }}>
                                    {agent.resolvedToday} resolvido{agent.resolvedToday !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>


            </div>
)}
{(!isTvMode || tvSlideIndex === 1) && (
<div className="tv-slide animate-fade" style={isTvMode ? { transform: `scale(${tvScale})` } : {}}>
{/* SECTION 1: VOLUME POR CHAMADOS */}
            <div className="section-header" style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '2.5rem' }}>
               <div className="section-prefix">
                  <LayoutGrid size={14} />
                  <Diamond size={12} style={{ color: 'var(--brand-red)' }} />
               </div>
               <h2 className="section-title">VOLUME POR CHAMADOS</h2>
               <div className="section-line"></div>
            </div>
            
            <section className="section-anchor">
               <div className="equal-col-grid">
                  {/* Chamados por Atendente */}
                  <div className="card">
                     <div className="card-label">Chamados por Atendente</div>
                     <ResponsiveContainer width="100%" height={isTvMode ? 300 : 340}>
                        <BarChart data={agentPerf} layout="vertical" margin={{ left: 20, right: 30 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={10} width={100} />
                           <Tooltip 
                             contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px' }}
                             cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                           />
                           <Bar dataKey="count" name="Chamados" fill="var(--brand-red)" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 10, fill: 'var(--text-dim)', fontWeight: 700, offset: 12 }} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>

                  {/* Visão Mensal */}
                  <div className="card">
                     <div className="card-label">Visão Mensal (Total vs Média Diária)</div>
                     <ResponsiveContainer width="100%" height={isTvMode ? 300 : 340}>
                        <ComposedChart data={monthlyData} margin={{ top: 40, right: 20, left: -20, bottom: 20 }}>
                           <XAxis 
                             dataKey="label" 
                             stroke="var(--text-dim)" 
                             fontSize={9} 
                             axisLine={false} 
                             tickLine={false} 
                             interval={0}
                             tick={{ fontSize: 9, angle: -25, textAnchor: 'end' }}
                              height={60}
                           />
                           <YAxis yAxisId="left" hide />
                           <YAxis yAxisId="right" hide />
                           <Tooltip 
                             contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px' }}
                             cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                           />
                           <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
                           <Bar 
                             yAxisId="left" 
                             dataKey="totalSuporte" 
                             name="Total Suporte" 
                             fill="var(--brand-red)" 
                             radius={[4, 4, 0, 0]} 
                             label={{ position: 'insideTop', fill: '#fff', fontSize: 10, fontWeight: 700, offset: 10 }}
                           />
                           <Line 
                             yAxisId="right" 
                             type="monotone" 
                             dataKey="avgSuporte" 
                             name="Média Diária" 
                             stroke="var(--brand-blue)" 
                             strokeWidth={2} 
                             dot={{ r: 4, fill: 'var(--brand-blue)', strokeWidth: 2, stroke: 'var(--bg-card)' }}
                             label={{ position: 'top', fill: 'var(--brand-blue)', fontSize: 10, fontWeight: 700, offset: 15 }}
                           />
                           <Brush dataKey="label" height={15} stroke="rgba(255, 255, 255, 0.1)" fill="transparent" travellerWidth={4} />
                        </ComposedChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               <div className="equal-col-grid" style={{ marginTop: '1.5rem' }}>
                  {/* Visão Semanal */}
                  <div className="card">
                     <div className="card-label">Visão Semanal (Média Diária)</div>
                     <ResponsiveContainer width="100%" height={isTvMode ? 240 : 260}>
                        <BarChart data={trendData}>
                           <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={10} axisLine={false} tickLine={false} />
                           <YAxis hide />
                           <Tooltip 
                             contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px' }}
                             cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                           />
                           <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
                           <Bar dataKey="suporte" name="Suporte" fill="var(--brand-red)" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9, fill: 'var(--text-dim)' }} />
                           <Bar dataKey="cadastro" name="Cadastro" fill="var(--brand-orange)" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9, fill: 'var(--text-dim)' }} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>

                  {/* Heatmap */}
                  <div className="card">
                     <div className="card-label">Heatmap de Abertura (Média por Hora)</div>
                     <table className="heatmap-table">
                        <thead>
                           <tr>
                              <th></th>
                              {HOURS.map(h => <th key={h} style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{h}h</th>)}
                           </tr>
                        </thead>
                        <tbody>
                           {heatmapMatrix.matrix.map((row, i) => (
                              <tr key={i}>
                                 <td style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 700, offset: 12 }}>{row.day.substring(0,3)}</td>
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

            </div>
)}
{(!isTvMode || tvSlideIndex === 2) && (
<div className="tv-slide animate-fade" style={isTvMode ? { transform: `scale(${tvScale})` } : {}}>
{/* SECTION 2: SATISFAÇÃO & SLA */}
            <div className="section-header" style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '2.5rem' }}>
               <div className="section-prefix">
                  <LayoutGrid size={14} />
                  <Diamond size={12} style={{ color: 'var(--brand-green)' }} />
               </div>
               <h2 className="section-title">SATISFAÇÃO & SLA</h2>
               <div className="section-line"></div>
            </div>

            <section className="section-anchor">
               <div className="equal-col-grid">
                  {/* Distribuição CSAT */}
                  <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                     <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', textTransform: 'none' }}>
                        <div style={{ padding: '4px', background: 'rgba(218, 13, 23, 0.1)', borderRadius: '4px', display: 'flex' }}>
                           <PieChart size={14} color="var(--brand-red)" />
                        </div>
                        <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>Distribuição CSAT</span> 
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>— CSAT {metrics.csatScore.toFixed(1)}%</span>
                     </div>
                     <ResponsiveContainer width="100%" height={isTvMode ? 280 : 280}>
                         <RePieChart>
                            <Pie
                               data={csatData}
                               cx="50%"
                               cy="50%"
                               innerRadius={60}
                               outerRadius={80}
                               paddingAngle={5}
                               dataKey="value"
                            >
                               {csatData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                               ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "10px", textTransform: "uppercase" }} />
                         </RePieChart>
                     </ResponsiveContainer>
                  </div>

                  {/* TMA por Atendente */}
                  <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                     <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', textTransform: 'none' }}>
                        <div style={{ padding: '4px', background: 'rgba(218, 85, 19, 0.1)', borderRadius: '4px', display: 'flex' }}>
                           <Clock size={14} color="var(--brand-orange)" />
                        </div>
                        <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>TMA por Atendente</span> 
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>— Média em Minutos</span>
                     </div>
                     <ResponsiveContainer width="100%" height={isTvMode ? 280 : 280}>
                        <BarChart data={avgTimeByAgent} layout="vertical" margin={{ left: 20 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={10} width={100} />
                           <Tooltip 
                             contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px' }}
                             formatter={(value) => [`${Math.round(value / 60)} min`, 'TMA']}
                           />
                           <Bar dataKey="avg" name="TMA" fill="var(--brand-orange)" radius={[0, 4, 4, 0]}>
                              {avgTimeByAgent.map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={entry.avg / 60 > 60 ? 'var(--brand-red)' : 'var(--brand-green)'} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Evolução Mensal */}
               <div className="section-header" style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '2.5rem', marginTop: '2rem' }}>
                  <div className="section-prefix">
                     <TrendingUp size={14} />
                     <Diamond size={12} style={{ color: 'var(--brand-blue)' }} />
                  </div>
                  <h2 className="section-title">EVOLUÇÃO MENSAL</h2>
                  <div className="section-line"></div>
               </div>

               <div className="equal-col-grid" style={{ marginTop: '1.5rem' }}>
                  {/* Satisfação Mensal (CSAT) */}
                  <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                     <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '4px', background: 'rgba(0, 150, 57, 0.1)', borderRadius: '4px' }}>
                           <CheckCircle2 size={14} color="var(--brand-green)" />
                        </div>
                        Média de Satisfação (CSAT %)
                     </div>
                     <ResponsiveContainer width="100%" height={isTvMode ? 240 : 260}>
                        <AreaChart data={evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                           <defs>
                              <linearGradient id="colorCsat" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="var(--brand-green)" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="var(--brand-green)" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} />
                           <YAxis stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} width={40} domain={[0, 100]} />
                           <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px', fontSize: '11px' }} formatter={(val) => [`${val}%`, 'CSAT']} />
                           <Area type="monotone" dataKey="csat" stroke="var(--brand-green)" strokeWidth={3} fillOpacity={1} fill="url(#colorCsat)" dot={{ r: 4, fill: 'var(--brand-green)', strokeWidth: 2, stroke: 'var(--bg-card)' }} />
                           <Brush dataKey="month" height={12} stroke="rgba(255, 255, 255, 0.1)" fill="transparent" travellerWidth={4} />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>

                  {/* Tempo Médio Mensal (TMA) */}
                  <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                     <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ padding: '4px', background: 'rgba(42, 128, 255, 0.1)', borderRadius: '4px' }}>
                           <Clock size={14} color="#2a80ff" />
                        </div>
                        Tempo Médio Mensal (TMA min)
                     </div>
                     <ResponsiveContainer width="100%" height={isTvMode ? 240 : 260}>
                        <AreaChart data={evolution} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                           <defs>
                              <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#2a80ff" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#2a80ff" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} />
                           <YAxis stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} width={40} />
                           <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px', fontSize: '11px' }} formatter={(val) => [`${val} min`, 'TMA']} />
                           <Area type="monotone" dataKey="time" stroke="#2a80ff" strokeWidth={3} fillOpacity={1} fill="url(#colorTime)" dot={{ r: 4, fill: '#2a80ff', strokeWidth: 2, stroke: 'var(--bg-card)' }} />
                           <Brush dataKey="month" height={12} stroke="rgba(255, 255, 255, 0.1)" fill="transparent" travellerWidth={4} />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </section>

                        </div>
)}
{(!isTvMode || tvSlideIndex === 3) && (
<div className="tv-slide animate-fade" style={isTvMode ? { transform: `scale(${tvScale})` } : {}}>
{/* SECTION 3: CHAMADOS POR USUÁRIO */}
            <div className="section-header" style={{ borderTop: '1px solid var(--border-dim)', paddingTop: '2.5rem' }}>
               <div className="section-prefix">
                  <LayoutGrid size={14} />
                  <Diamond size={12} style={{ color: 'var(--brand-orange)' }} />
               </div>
               <h2 className="section-title">CHAMADOS POR USUÁRIO</h2>
               <div className="section-line"></div>
            </div>
            <section className="section-anchor">
               <div className="equal-col-grid">
                  <div className="card" style={{ padding: '1.5rem', maxHeight: '500px', overflowY: 'auto' }}>
                     <div className="card-label" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Trophy size={14} color="var(--brand-orange)" /> 
                        <span style={{ fontWeight: 700, textTransform: 'none' }}>Top 20 Usuários</span>
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400, textTransform: 'none' }}>— {metrics.uniqueUsers} usuários</span>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                        {userRanking.map((user, i) => (
                           <div key={i} onClick={() => setSelectedUser(user.name)} style={{ cursor: 'pointer', padding: '0.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}>
                              <div style={{ fontSize: '1rem', fontWeight: 800, color: i < 3 ? 'var(--brand-orange)' : 'var(--text-dim)', width: '20px', textAlign: 'center' }}>
                                 {i + 1}
                              </div>
                              <div style={{ flex: 1 }}>
                                 <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{user.name}</div>
                                 <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem', marginTop: '0.2rem', textTransform: 'uppercase' }}>{user.company}</div>
                              </div>
                              <div style={{ width: '80px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                                   <div style={{ height: '100%', width: `${user.percent}%`, background: 'var(--brand-red)', borderRadius: '10px' }}></div>
                                </div>
                                <span style={{ color: 'var(--brand-red)', fontWeight: 800, fontSize: '0.85rem' }}>{user.count}</span>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
                  <div className="card" style={{ padding: '1.5rem' }}>
                     <div className="card-label" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart2 size={14} color="var(--brand-blue)" /> 
                        <span style={{ fontWeight: 700, textTransform: 'none' }}>Top 10 Usuários</span>
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400, textTransform: 'none' }}>(volume)</span>
                     </div>
                     <ResponsiveContainer width="100%" height={isTvMode ? 400 : 400}>
                        <BarChart data={userRanking.slice(0, 10)} layout="vertical" margin={{ left: 20 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={10} width={100} />
                           <Tooltip 
                             contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px' }}
                             cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                           />
                           <Bar dataKey="count" fill="var(--brand-red)" radius={[0, 4, 4, 0]} onClick={(data) => setSelectedUser(data.name)} style={{ cursor: 'pointer' }}>
                              {userRanking.slice(0, 10).map((entry, index) => {
                                 const colors = ['#DA0D17', '#DA5513', '#4F7043', '#265D7C', '#F29C94', '#56331B', '#b45309', '#15803d', '#1e3a8a'];
                                 return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                              })}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </section>
          </div>
          )}
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
                         <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--brand-red)' }}></div> DEGUST
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
                              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                            />
                            <HeatmapLayer data={criticalityData} />
                            
                            {/* Store Markers */}
                            {rawData.stores && rawData.stores.map((store, idx) => (
                              <Marker key={idx} position={store.coords} icon={storeIcon}>
                                <Popup className="custom-popup" closeButton={false}>
                                  <StorePopupContent store={store} tickets={filteredTickets} />
                                </Popup>
                              </Marker>
                            ))}
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
                                 <div style={{ width: `${(reg.Degust/reg.total)*100}%`, background: 'var(--brand-red)' }}></div>
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
                               <td>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-red)', fontWeight: 700 }}>
                                   <Info size={12} /> {t.id}
                                 </span>
                               </td>
                               <td>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                                   <Calendar size={12} style={{ opacity: 0.7 }} /> {t.date}
                                 </span>
                               </td>
                               <td>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                                   <Users size={12} style={{ opacity: 0.7, color: 'var(--brand-blue)' }} /> {t.agent}
                                 </span>
                               </td>
                               <td>
                                 <span 
                                   style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)', cursor: 'pointer' }} 
                                   onClick={() => { setSelectedUser(t.user); setSelectedUserStats(calculateUserStats(t.user)); }}
                                 >
                                   <Users size={12} style={{ opacity: 0.7, color: 'var(--brand-orange)' }} /> {t.user}
                                 </span>
                               </td>
                               <td>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                                   <Folder size={12} style={{ opacity: 0.7, color: 'var(--brand-green)' }} /> {t.sector}
                                 </span>
                               </td>
                               <td>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
                                   <Diamond size={10} style={{ color: 'var(--brand-pink)' }} /> {t.company}
                                 </span>
                               </td>
                               <td>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-orange)', fontWeight: 600 }}>
                                   <Clock size={12} /> {formatTime(t.wait)}
                                 </span>
                               </td>
                               <td>
                                 <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--brand-green)', fontWeight: 600 }}>
                                   <CheckCircle2 size={12} /> {formatTime(t.total)}
                                 </span>
                               </td>
                               <td>
                                 {(() => {
                                   if (!t.csat) return null;
                                   const isGood = ['Muito Satisfeito', 'Satisfeito'].includes(t.csat);
                                   const color = isGood ? 'var(--brand-green)' : (t.csat === 'Indiferente' ? 'var(--brand-orange)' : 'var(--brand-red)');
                                   const bg = isGood ? 'rgba(79, 112, 67, 0.12)' : (t.csat === 'Indiferente' ? 'rgba(218, 85, 19, 0.12)' : 'rgba(218, 13, 23, 0.12)');
                                   const border = isGood ? '1px solid rgba(79, 112, 67, 0.2)' : (t.csat === 'Indiferente' ? '1px solid rgba(218, 85, 19, 0.2)' : '1px solid rgba(218, 13, 23, 0.2)');
                                   return (
                                     <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 700, color, background: bg, border }}>
                                       <Trophy size={10} /> {t.csat}
                                     </span>
                                   );
                                 })()}
                               </td>
                            </tr>
                          ))}
                      </tbody>
                   </table>
                </div>
            </div>
          </div>
        )}
        {!isTvMode && (
          <footer style={{ marginTop: '4rem', padding: '1.5rem 0 0 0', borderTop: '1px solid var(--border-dim)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
            Desenvolvido por <strong style={{ color: 'var(--text-primary)' }}>Lucas Eduardo Moura Santos</strong>
          </footer>
        )}
      </main>


      {/* Modal Usuário */}
      {selectedUser && selectedUserStats && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
          <div style={{ background: 'var(--bg-card)', width: '100%', maxWidth: '1000px', maxHeight: '90vh', borderRadius: '16px', border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Modal Header */}
            <div style={{ padding: '2rem', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Users size={24} color="var(--brand-blue)" />
                  </div>
                  <div>
                     <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-red)' }}>{selectedUser}</h2>
                     <div style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{selectedUserStats.company}</div>
                  </div>
               </div>
               <button onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: '1px solid var(--border-dim)', color: 'var(--text-dim)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  [ FECHAR ESC ]
               </button>
            </div>
            
            {/* Modal Content */}
            <div style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: 'var(--bg-dark)' }}>
               {/* KPIs */}
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.5rem' }}>Total Chamados</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedUserStats.total}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.5rem' }}>Resolução Média</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-green)' }}>{formatTime(selectedUserStats.avgTotal)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.5rem' }}>Fila Média</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-orange)' }}>{formatTime(selectedUserStats.avgWait)}</div>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700, marginBottom: '0.5rem' }}>Satisfação Média</div>
                     <div style={{ fontSize: '1.5rem', fontWeight: 800, color: selectedUserStats.csatScore > 0 ? getCsatColor(selectedUserStats.csatScore) : 'var(--text-dim)' }}>{selectedUserStats.csatScore > 0 ? selectedUserStats.csatScore.toFixed(1) + '%' : 'N/A'}</div>
                  </div>
               </div>

               {/* Charts */}
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Folder size={14} color="var(--brand-orange)" /> Áreas Mais Abertas
                     </div>
                     <ResponsiveContainer width="100%" height={isTvMode ? 240 : 260}>
                        <BarChart data={selectedUserStats.topCategories} layout="vertical" margin={{ left: 20 }}>
                           <XAxis type="number" hide />
                           <YAxis dataKey="name" type="category" stroke="var(--text-dim)" fontSize={9} width={120} />
                           <Tooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-dim)', borderRadius: '8px' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                           <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]} />
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-dim)' }}>
                     <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <TrendingUp size={14} color="var(--brand-blue)" /> Histórico de Volume
                     </div>
                     <ResponsiveContainer width="100%" height={isTvMode ? 240 : 260}>
                        <AreaChart data={selectedUserStats.history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                           <defs>
                              <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} />
                           <YAxis stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} />
                           <Tooltip contentStyle={{ background: 'var(--bg-sidebar)', border: '1px solid var(--border-dim)', borderRadius: '8px' }} />
                           <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorHistory)" dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: 'var(--bg-card)' }} />
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      
      {isTvMode && (
        <div className="tv-dots-container" style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '1rem', zIndex: 50 }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ width: '12px', height: '12px', borderRadius: '50%', background: tvSlideIndex === i ? 'var(--brand-red)' : 'rgba(255,255,255,0.2)', transition: '0.3s' }}></div>
          ))}
        </div>
      )}
      {isTvMode && (
        <button className="tv-exit-button" onClick={() => setIsTvMode(false)} style={{ position: 'fixed', top: '2rem', right: '2rem', background: 'var(--brand-red)', border: 'none', color: 'white', padding: '0.8rem 1.5rem', borderRadius: '8px', cursor: 'pointer', zIndex: 50, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 12px rgba(218,13,23,0.3)' }}>
          <X size={16} /> SAIR DO MODO TV
        </button>
      )}
      {isTvMode && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '2.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.05em', zIndex: 50 }}>
          Desenvolvido por <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Lucas Eduardo Moura Santos</strong>
        </div>
      )}
    </>
  );
}