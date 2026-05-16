import React, { useState, useMemo, useEffect } from 'react';
import { Activity, AlertTriangle, AlertCircle, BarChart2, Calendar, CheckCircle2, Clock, Diamond, Download, FileText, Filter, Folder, Info, LayoutGrid, List, MapPin, Menu, Monitor, Moon, PieChart, RefreshCcw as SyncIcon, Search, Settings, ShieldCheck, Sun, Terminal, Ticket, TrendingUp, Trophy, Tv, Users, X, Zap } from 'lucide-react';
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
  LabelList,
  Label,
  ReferenceLine,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import AcronisMonitoringView from './components/AcronisMonitoringView';
import NocLojasView from './components/NocLojasView';
import { useNoc } from './context/NocContext';
import { useDashboardSettings } from './context/DashboardContext';

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

const getInitials = (name) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
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
// storeIconHtml and storeIcon removed (Map tab deleted)


// StorePopupContent removed (Map tab deleted)


const renderStars = (score) => {
  const count = Math.round((score / 100) * 5);
  return (
    <span style={{ color: '#fbbf24', letterSpacing: '2px', fontSize: '0.8rem' }}>
      {'★'.repeat(count)}{'☆'.repeat(5 - count)}
    </span>
  );
};

const CustomAreaDot = (props) => {
  const { cx, cy, value, dataKey, evolutionData, payload } = props;
  if (!cx || !cy || value === undefined || !evolutionData) return null;
  
  const allValues = evolutionData.map(d => d[dataKey]);
  const maxVal = Math.max(...allValues);
  const minVal = Math.min(...allValues);
  
  const isMax = value === maxVal;
  const isMin = value === minVal;
  const isLast = evolutionData.length > 1 && payload && payload.month === evolutionData[evolutionData.length - 1].month;
  
  // Highlight violation of thresholds
  // CSAT < 95% is a violation
  // TMA > 20 min is a violation
  const isViolation = (dataKey === 'csat' && value < 95) || (dataKey === 'time' && value > 20);
  
  // If it's not a peak, valley, last point, or SLA violation, don't draw any dot to keep graph clean
  if (!isMax && !isMin && !isLast && !isViolation) return null;
  
  let dotColor = 'var(--brand-blue)';
  let labelText = '';
  const suffix = dataKey === 'csat' ? '%' : ' min';
  
  if (isMax) {
    labelText = 'MÁX';
    dotColor = dataKey === 'csat' ? 'var(--brand-green)' : 'var(--brand-red)'; // Max CSAT is green (good), Max TMA is red (bad)
  } else if (isMin) {
    labelText = 'MÍN';
    dotColor = dataKey === 'csat' ? 'var(--brand-red)' : 'var(--brand-green)'; // Min CSAT is red (bad), Min TMA is green (good)
  } else if (isViolation) {
    labelText = dataKey === 'csat' ? 'ALERT CSAT' : 'SLA LIMIT';
    dotColor = '#ef4444'; // Red
  } else {
    dotColor = dataKey === 'csat' ? 'var(--brand-green)' : '#2a80ff';
  }

  // Calculate annotation balloon for last point
  let annotationBalloon = null;
  if (isLast) {
    const lastItem = evolutionData[evolutionData.length - 1];
    const prevItem = evolutionData[evolutionData.length - 2];
    const lastVal = lastItem[dataKey];
    const prevVal = prevItem[dataKey];
    const rawDiff = lastVal - prevVal;
    
    let diffText = '';
    let arrow = '';
    let diffColor = '#22c55e';
    
    if (dataKey === 'csat') {
      const diff = rawDiff;
      if (diff > 0) {
        diffText = `+${diff.toFixed(1)} pp`;
        arrow = '▲';
        diffColor = '#22c55e';
      } else if (diff < 0) {
        diffText = `${diff.toFixed(1)} pp`;
        arrow = '▼';
        diffColor = '#ef4444';
      } else {
        diffText = '0.0 pp';
        arrow = '■';
        diffColor = 'var(--text-dim)';
      }
    } else if (dataKey === 'time') {
      if (prevVal > 0) {
        const pctChange = ((lastVal - prevVal) / prevVal) * 100;
        if (pctChange > 0) {
          diffText = `+${pctChange.toFixed(0)}%`;
          arrow = '▲';
          diffColor = '#ef4444'; // bad
        } else if (pctChange < 0) {
          diffText = `${pctChange.toFixed(0)}%`;
          arrow = '▼';
          diffColor = '#22c55e'; // good
        } else {
          diffText = '0%';
          arrow = '■';
          diffColor = 'var(--text-dim)';
        }
      } else {
        diffText = '0%';
        arrow = '■';
        diffColor = 'var(--text-dim)';
      }
    }
    
    const rectWidth = 105;
    const rectHeight = 36;
    const rectX = cx - rectWidth - 12;
    const rectY = cy - rectHeight / 2;
    const labelSuffix = dataKey === 'csat' ? '%' : ' min';
    
    annotationBalloon = (
      <g>
        <line x1={cx} y1={cy} x2={rectX + rectWidth} y2={cy} stroke="rgba(255, 255, 255, 0.15)" strokeWidth={1} strokeDasharray="2 2" />
        <rect 
          x={rectX} 
          y={rectY} 
          width={rectWidth} 
          height={rectHeight} 
          rx={6} 
          ry={6} 
          fill="rgba(10, 10, 10, 0.95)" 
          stroke="var(--border-dim)" 
          strokeWidth={1} 
          style={{ filter: 'drop-shadow(0px 3px 6px rgba(0,0,0,0.85))' }}
        />
        <text 
          x={rectX + 8} 
          y={rectY + 13} 
          fill="white" 
          fontSize={10} 
          fontWeight={800}
          dominantBaseline="middle"
        >
          Atual: {lastVal.toFixed(1)}{labelSuffix}
        </text>
        <text 
          x={rectX + 8} 
          y={rectY + 25} 
          fill={diffColor} 
          fontSize={9} 
          fontWeight={800}
          dominantBaseline="middle"
        >
          {arrow} {diffText}
        </text>
      </g>
    );
  }

  return (
    <g>
      {/* Standard or pulsing dot */}
      <circle cx={cx} cy={cy} r={isLast ? 6 : 5} fill={dotColor} stroke="white" strokeWidth={2} />
      {isLast && (
        <circle cx={cx} cy={cy} r={10} fill="none" stroke={dotColor} strokeWidth={1.5} opacity={0.6} className="animate-pulse" />
      )}
      
      {/* Label for peaks or violations */}
      {labelText && !isLast && (
        <text 
          x={cx} 
          y={cy - 12} 
          textAnchor="middle" 
          fill={dotColor} 
          fontSize={10} 
          fontWeight={900} 
          style={{ filter: 'drop-shadow(0px 2px 3px rgba(0,0,0,0.85))' }}
        >
          {labelText} ({value.toFixed(0)}{suffix})
        </text>
      )}
      
      {/* Balloon Annotation */}
      {annotationBalloon}
    </g>
  );
};

const CustomCsatLabel = (props) => {
  const { viewBox, score } = props;
  
  let cx = props.cx;
  let cy = props.cy;
  
  if (cx === undefined && viewBox) {
    cx = viewBox.cx;
  }
  if (cy === undefined && viewBox) {
    cy = viewBox.cy;
  }
  
  // Fallback seguro de centralização se coordenadas não forem injetadas
  if (cx === undefined) cx = 175;
  if (cy === undefined) cy = 110;

  return (
    <g>
      {/* Concentric pulsing circle in SVG background */}
      <circle
        cx={cx}
        cy={cy}
        r={48}
        fill="rgba(15, 15, 15, 0.85)"
        stroke="#22c55e"
        strokeWidth={2}
        className="pulse-csat-circle"
      />
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#22c55e"
        style={{
          fontSize: '1.25rem',
          fontWeight: 900,
          textShadow: '0 0 8px rgba(34, 197, 94, 0.6)',
          fontFamily: 'JetBrains Mono, monospace'
        }}
      >
        {score.toFixed(1)}%
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--text-dim)"
        style={{
          fontSize: '0.55rem',
          fontWeight: 700,
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}
      >
        CSAT
      </text>
    </g>
  );
};

const getCsatColor = (score) => {
  if (score > 80) return 'var(--brand-green)';
  if (score >= 50) return 'var(--brand-yellow)';
  return 'var(--brand-red)';
};

const isOutsideServiceHours = (t, hours) => {
  if (!t || !hours) return false;
  
  let hr = t.hour;
  let wk = t.weekday;
  let min = 0;
  
  // Parse created_at if hour or weekday data properties are missing
  if (hr === undefined || hr === null || wk === undefined || wk === null) {
    if (t.created_at) {
      const created = new Date(t.created_at);
      const brDate = new Date(created.getTime() - 3 * 3600 * 1000);
      hr = brDate.getUTCHours();
      wk = brDate.getUTCDay();
      min = brDate.getUTCMinutes();
    } else {
      return false;
    }
  } else {
    // Obtain minutes of creation safely
    if (t.created_at) {
      const brDate = new Date(new Date(t.created_at).getTime() - 3 * 3600 * 1000);
      min = brDate.getUTCMinutes();
    }
  }
  
  const ticketTimeInMinutes = hr * 60 + min;
  
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  };

  // 0 is Sunday, 6 is Saturday
  if (wk === 0) {
    if (!hours.sundayEnabled) return true;
    const start = parseTimeToMinutes(hours.sundayStart);
    const end = parseTimeToMinutes(hours.sundayEnd);
    if (start === null || end === null) return true;
    return ticketTimeInMinutes < start || ticketTimeInMinutes >= end;
  }
  
  if (wk === 6) {
    if (!hours.saturdayEnabled) return true;
    const start = parseTimeToMinutes(hours.saturdayStart);
    const end = parseTimeToMinutes(hours.saturdayEnd);
    if (start === null || end === null) return true;
    return ticketTimeInMinutes < start || ticketTimeInMinutes >= end;
  }
  
  // Weekday (1 to 5)
  const start = parseTimeToMinutes(hours.weekdayStart);
  const end = parseTimeToMinutes(hours.weekdayEnd);
  if (start === null || end === null) return true;
  return ticketTimeInMinutes < start || ticketTimeInMinutes >= end;
};


// SECTION 0.5: Service Monitor (Status Dashboard)
const ServiceMonitorView = () => {
  // Mock data for history and latency trends
  const getMockHistory = (serviceId) => {
    const baseLatency = serviceId === 'athenas' ? 40 : (serviceId === 'degust' ? 120 : 80);
    return Array.from({ length: 24 }).map((_, i) => ({
      hour: `${i}h`,
      latency: baseLatency + Math.random() * 20 - (serviceId === 'ifood' && i > 15 && i < 18 ? -500 : 0),
      status: (serviceId === 'trilogo') ? 0 : (serviceId === 'ifood' && i > 15 && i < 18 ? 0.5 : 1),
      event: (serviceId === 'degust' && i === 10) ? 'Manutenção' : null
    }));
  };

  const services = [
    { id: 'athenas', name: 'Athenas API (Core)', status: 'online', latency: '42ms', uptime: '99.98%', description: 'Serviço principal de sincronização de chamados', history: getMockHistory('athenas') },
    { id: 'degust', name: 'Degust Cloud (ERP)', status: 'online', latency: '128ms', uptime: '99.95%', description: 'Servidor central de retaguarda e vendas', history: getMockHistory('degust') },
    { id: 'whatsapp', name: 'WhatsApp Business API', status: 'online', latency: '85ms', uptime: '100%', description: 'Gateway de comunicação com clientes', history: getMockHistory('whatsapp') },
    { id: 'ifood', name: 'Integração iFood/Rappi', status: 'degraded', latency: '1.2s', uptime: '98.5%', description: 'Canal de vendas delivery integrado', history: getMockHistory('ifood') },
    { id: 'trilogo', name: 'Trílogo Maintenance', status: 'offline', latency: 'TIMEOUT', uptime: '95.2%', description: 'Sistema de manutenção predial e checklists', history: getMockHistory('trilogo') },
    { id: 'vpn', name: 'VPN Lojas (Concentrador)', status: 'online', latency: '15ms', uptime: '99.99%', description: 'Conectividade segura entre as unidades', history: getMockHistory('vpn') },
  ];

  const [showIncidentModal, setShowIncidentModal] = useState(false);

  return (
    <div className="animate-fade" style={{ padding: '0 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>Monitor de Serviços</h2>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginTop: '0.4rem' }}>Status em tempo real dos sistemas críticos da operação</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button 
              onClick={() => setShowIncidentModal(true)}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', color: 'var(--text-dim)', padding: '8px 16px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <List size={14} /> LOG DE QUEDAS (30D)
            </button>
            <div style={{ padding: '10px 20px', background: 'rgba(79, 112, 67, 0.05)', border: '1px solid rgba(79, 112, 67, 0.15)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
               <div className="satellite-pulse"></div>
               <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--brand-green)', letterSpacing: '0.05em' }}>5/6 SISTEMAS OPERACIONAIS</span>
            </div>
        </div>
      </div>

      <div className="monitor-grid">
        {services.map(service => {
          const isCritical = service.status === 'offline' || service.status === 'degraded';
          return (
          <div key={service.id} 
            className={`service-card status-${service.status} ${isCritical ? 'critical-expansion' : ''}`} 
            style={{ '--status-color': service.status === 'online' ? 'var(--brand-green)' : (service.status === 'offline' ? 'var(--brand-red)' : 'var(--brand-orange)') }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>{service.name}</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '6px', maxWidth: '240px', lineHeight: 1.4 }}>{service.description}</p>
              </div>
              <div className={`status-badge ${service.status === 'online' ? 'glow-online' : (service.status === 'offline' ? 'glow-offline' : 'glow-degraded')}`} style={{ 
                background: service.status === 'online' ? 'rgba(79, 112, 67, 0.1)' : (service.status === 'offline' ? 'rgba(218, 13, 23, 0.1)' : 'rgba(218, 85, 19, 0.1)'),
                color: service.status === 'online' ? 'var(--brand-green)' : (service.status === 'offline' ? 'var(--brand-red)' : 'var(--brand-orange)'),
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.65rem',
                fontWeight: 900
              }}>
                {service.status === 'online' ? <CheckCircle2 size={12} /> : (service.status === 'offline' ? <AlertCircle size={12} /> : <Zap size={12} />)}
                {service.status.toUpperCase()}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', background: 'rgba(0,0,0,0.15)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Latência & Tendência</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <div style={{ fontSize: '1.1rem', fontWeight: 900, color: service.status === 'online' ? 'white' : 'var(--text-dim)' }}>{service.latency}</div>
                   {service.status !== 'offline' && (
                     <div style={{ width: '60px', height: '20px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                           <LineChart data={service.history.slice(-10)}>
                              <Line type="monotone" dataKey="latency" stroke={service.status === 'online' ? 'var(--brand-green)' : 'var(--brand-orange)'} strokeWidth={2} dot={false} isAnimationActive={false} />
                           </LineChart>
                        </ResponsiveContainer>
                     </div>
                   )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>Uptime Global</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--brand-blue)' }}>{service.uptime}</div>
              </div>
            </div>

            <div style={{ flex: 1, minHeight: '80px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-dim)', marginBottom: '10px', fontWeight: 700 }}>
                <span>ESTABILIDADE 24H</span>
                <span style={{ color: service.status === 'online' ? 'var(--brand-green)' : 'var(--text-dim)' }}>{service.status === 'online' ? 'SISTEMA ESTÁVEL' : 'INSTABILIDADE DETECTADA'}</span>
              </div>
              
              <div style={{ width: '100%', height: '60px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={service.history}>
                       <defs>
                          <linearGradient id={`colorStatus-${service.id}`} x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor={service.status === 'online' ? 'var(--brand-green)' : (service.status === 'offline' ? 'var(--brand-red)' : 'var(--brand-orange)')} stopOpacity={0.3}/>
                             <stop offset="95%" stopColor={service.status === 'online' ? 'var(--brand-green)' : (service.status === 'offline' ? 'var(--brand-red)' : 'var(--brand-orange)')} stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <Tooltip 
                         content={({ active, payload }) => {
                           if (active && payload && payload.length) {
                             const data = payload[0].payload;
                             return (
                               <div style={{ background: 'rgba(20, 20, 20, 0.9)', border: '1px solid var(--border-dim)', padding: '8px', borderRadius: '6px', fontSize: '0.65rem' }}>
                                 <div style={{ fontWeight: 800, color: 'white' }}>{data.hour}</div>
                                 <div style={{ color: data.status === 1 ? 'var(--brand-green)' : 'var(--brand-red)', marginTop: '4px' }}>
                                   {data.status === 1 ? 'Operacional' : (data.status === 0 ? 'Offline' : 'Instável')}
                                 </div>
                                 {data.event && <div style={{ color: 'var(--brand-orange)', marginTop: '4px', fontWeight: 700 }}>⚠️ {data.event}</div>}
                               </div>
                             );
                           }
                           return null;
                         }}
                       />
                       <Area 
                          type="stepAfter" 
                          dataKey="status" 
                          stroke={service.status === 'online' ? 'var(--brand-green)' : (service.status === 'offline' ? 'var(--brand-red)' : 'var(--brand-orange)')} 
                          strokeWidth={2}
                          fill={`url(#colorStatus-${service.id})`}
                          isAnimationActive={true}
                       />
                       {/* Event Markers as ReferenceLines */}
                       {service.history.map((h, idx) => h.event ? (
                         <ReferenceLine key={idx} x={idx} stroke="var(--brand-orange)" strokeDasharray="3 3" />
                       ) : null)}
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
            </div>
          </div>
        )})}
      </div>


      {/* MODAL: LOG DE QUEDAS (30 DIAS) */}
      <AnimatePresence>
        {showIncidentModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              style={{ background: '#181210', width: '100%', maxWidth: '800px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 24px 48px rgba(0,0,0,0.8)' }}
            >
               <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <List size={20} color="var(--brand-red)" />
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>HISTÓRICO COMPLETO (30 DIAS)</h2>
                  </div>
                  <button onClick={() => setShowIncidentModal(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
               </div>
               
               <div style={{ padding: '2rem', maxHeight: '60vh', overflowY: 'auto' }} className="custom-vertical-scrollbar">
                  {[
                    { date: '15/05/2026', service: 'Trílogo Maintenance', type: 'Downtime', duration: '2h 15min', reason: 'Erro 504 Gateway Timeout' },
                    { date: '14/05/2026', service: 'iFood/Rappi Integration', type: 'Degradado', duration: '45min', reason: 'Latência elevada no webhook' },
                    { date: '12/05/2026', service: 'Athenas API', type: 'Manutenção', duration: '15min', reason: 'Update de certificados SSL' },
                    { date: '10/05/2026', service: 'VPN Lojas', type: 'Downtime', duration: '8min', reason: 'Reinício de concentrador' },
                    { date: '05/05/2026', service: 'Degust Cloud', type: 'Degradado', duration: '1h 20min', reason: 'Sobrecarga no banco de dados' },
                  ].map((log, i) => (
                    <div key={i} style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '10px', marginBottom: '1rem', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, width: '70px' }}>{log.date}</div>
                          <div>
                            <div style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem' }}>{log.service}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '2px' }}>{log.reason}</div>
                          </div>
                       </div>
                       <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            fontSize: '0.65rem', 
                            fontWeight: 900, 
                            padding: '3px 8px', 
                            borderRadius: '4px',
                            background: log.type === 'Downtime' ? 'rgba(218, 13, 23, 0.15)' : 'rgba(218, 85, 19, 0.15)',
                            color: log.type === 'Downtime' ? 'var(--brand-red)' : 'var(--brand-orange)',
                            display: 'inline-block'
                          }}>
                            {log.type.toUpperCase()}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '4px' }}>Duração: {log.duration}</div>
                       </div>
                    </div>
                  ))}
               </div>
               
               <div style={{ padding: '1.5rem 2rem', background: 'rgba(0,0,0,0.2)', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                 Visualizando últimos 30 dias de registros automáticos de saúde de rede.
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {

  const { 
    isTvMode, setIsTvMode, 
    activeTab, setActiveTab, 
    progress, 
    autoRotation, setAutoRotation,
    rotationInterval, setRotationInterval,
    soundEnabled, setSoundEnabled,
    selectedTabs, setSelectedTabs,
    globalFilters, setGlobalFilters
  } = useDashboardSettings();
  
  const [selectedAgent, setSelectedAgent] = useState('Todos');
  const [selectedSector, setSelectedSector] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState(new Date());
  const [syncLabel, setSyncLabel] = useState('Sincronizado agora');
  const [agentSearch, setAgentSearch] = useState('');
  
  // Base View Optimization States
  const [baseSearch, setBaseSearch] = useState('');
  const [basePage, setBasePage] = useState(1);
  const [baseFilters, setBaseFilters] = useState({ id: '', agent: '', user: '', sector: '', company: '' });
  const itemsPerPage = 50;




  const [theme, setTheme] = useState('dark');
  const [rawData, setRawData] = useState({ tickets: [], agents: [], sectors: [], last_updated: 'Carregando...' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(''); 
  const [fetchError, setFetchError] = useState(false); 
  const [selectedMonth, setSelectedMonth] = useState('2026-03');
  
  const [showHoursConfig, setShowHoursConfig] = useState(false);
  const [serviceHours, setServiceHours] = useState(() => {
    const saved = localStorage.getItem('itview_service_hours');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      weekdayStart: '08:00',
      weekdayEnd: '18:00',
      saturdayStart: '08:00',
      saturdayEnd: '12:00',
      sundayStart: '08:00',
      sundayEnd: '12:00',
      saturdayEnabled: false,
      sundayEnabled: false
    };
  });
  
  const [tempHours, setTempHours] = useState(serviceHours);

  useEffect(() => {
    if (showHoursConfig) {
      setTempHours(serviceHours);
    }
  }, [showHoursConfig, serviceHours]);

  const handleSaveHours = () => {
    setServiceHours(tempHours);
    localStorage.setItem('itview_service_hours', JSON.stringify(tempHours));
    setShowHoursConfig(false);
  };
  
  // Data fetching from API
  const fetchData = async () => {
    try {
      setFetchError(false);
      const response = await fetch(`/api/data?t=${Date.now()}`);
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
    // Auto-refresh data every 5 seconds for real-time dashboard updates
    const interval = setInterval(fetchData, 5000);
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
      setLastSync(new Date());
      setSyncLabel('Sincronizado agora');
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.floor((new Date() - lastSync) / 60000);
      if (diff === 0) setSyncLabel('Sincronizado agora');
      else if (diff === 1) setSyncLabel('Sincronizado há 1 min');
      else setSyncLabel(`Sincronizado há ${diff} min`);
    }, 30000);
    return () => clearInterval(interval);
  }, [lastSync]);


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
    if (!isTvMode) {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      return;
    }
    
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    
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
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
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

  // Effect for setting up TV Mode configurations (sidebar, fullscreen, active tab)
  useEffect(() => {
    if (isTvMode) {
      // 1. Force performance tab to ensure slides are visible
      setActiveTab('performance');
      // 2. Collapse the sidebar immediately
      setIsSidebarOpen(false);
      // 3. Request fullscreen if not already in fullscreen
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
      }
    } else {
      // 1. Exit fullscreen if currently in fullscreen
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(err => console.log(err));
      }
      // 2. Reset slide index and restore the sidebar
      setTvSlideIndex(0);
      setIsSidebarOpen(true);
    }
  }, [isTvMode]);

  // Effect for controlling slide transition times dynamically
  useEffect(() => {
    if (!isTvMode) return;

    let delay = 10000; // default 10 seconds
    if (tvSlideIndex === 0) {
      delay = 60000; // 1 minute for real-time tracking of open tickets
    } else if (tvSlideIndex === 1) {
      delay = 45000; // 45 seconds for main KPIs
    }

    const timer = setTimeout(() => {
      setTvSlideIndex(prev => (prev + 1) % 5);
    }, delay);

    return () => clearTimeout(timer);
  }, [isTvMode, tvSlideIndex]);



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
    
    // Filter tickets that actually have a valid duration (t.total > 0) AND are not extraordinary (t.total <= 3600)
    const tmaTickets = userTickets.filter(t => t.total > 0 && t.total <= 3600);
    const sumTotal = tmaTickets.reduce((acc, t) => acc + t.total, 0);
    const avgTotal = tmaTickets.length > 0 ? (sumTotal / tmaTickets.length) : 0;

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
        monthGroups[key] = { suporte: 0, cadastro: 0, csatSum: 0, csatCount: 0 };
        monthDays[key] = new Set();
      }
      
      const sector = (t.sector || '').toUpperCase();
      const isSuporte = sector.includes('SUPORTE') || sector.includes('ATHENAS') || sector.includes('PDV');
      const isCadastro = sector.includes('CADASTRO');

      if (isSuporte) monthGroups[key].suporte++;
      if (isCadastro) monthGroups[key].cadastro++;
      
      const csatWeights = { 'Muito Satisfeito': 100, 'Satisfeito': 75, 'Indiferente': 50, 'Insatisfeito': 25 };
      if (t.csat && csatWeights[t.csat] !== undefined) {
        monthGroups[key].csatSum += csatWeights[t.csat];
        monthGroups[key].csatCount++;
      }
      
      monthDays[key].add(t.date);
    });

    const sortedKeys = Object.keys(monthGroups).sort();
    const data = sortedKeys.map(key => {
      const stats = monthGroups[key];
      const days = monthDays[key].size || 1;
      const csatVal = stats.csatCount > 0 ? Math.round(stats.csatSum / stats.csatCount) : 95;
      return {
        label: formatMonthKey(key),
        totalSuporte: stats.suporte,
        totalCadastro: stats.cadastro,
        avgSuporte: parseFloat((stats.suporte / days).toFixed(1)),
        avgCadastro: parseFloat((stats.cadastro / days).toFixed(1)),
        csat: csatVal,
        isForecast: false
      };
    });

    // Add Forecast for next month if we have at least 3 months of data
    if (data.length >= 3) {
      const last3 = data.slice(-3);
      const avgGrowth = ((last3[2].totalSuporte / last3[1].totalSuporte) + (last3[1].totalSuporte / last3[0].totalSuporte)) / 2;
      const forecastedTotal = Math.round(last3[2].totalSuporte * (avgGrowth > 0.5 && avgGrowth < 1.5 ? avgGrowth : 1.05));
      const forecastedCsat = Math.round(last3.reduce((acc, d) => acc + d.csat, 0) / 3);
      
      data.push({
        label: "Junho 2026 (Previsão IA) 🔮",
        totalSuporte: forecastedTotal,
        totalCadastro: 0,
        avgSuporte: Math.round(forecastedTotal / 30),
        avgCadastro: 0,
        csat: forecastedCsat,
        isForecast: true
      });
    }

    return data;
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
    
    // Filter tickets that actually have a valid duration (t.total > 0) AND are not extraordinary (t.total <= 3600)
    const tmaTickets = filteredTickets.filter(t => t.total > 0 && t.total <= 3600);
    const sumTotal = tmaTickets.reduce((acc, t) => acc + t.total, 0);
    const avgTotal = tmaTickets.length > 0 ? (sumTotal / tmaTickets.length) : 0;

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

      // Apply the same 1 hour filter for resolution time
      const tmaTickets = ticketsList.filter(t => t.total > 0 && t.total <= 3600);
      const sumTotal = tmaTickets.reduce((acc, t) => acc + t.total, 0);
      const avgTotal = tmaTickets.length > 0 ? (sumTotal / tmaTickets.length) : 0;

      const sumWait = ticketsList.reduce((acc, t) => acc + t.wait, 0);
      const avgWait = sumWait / (total || 1);

      const csatWeights = { 'Muito Satisfeito': 100, 'Satisfeito': 75, 'Indiferente': 50, 'Insatisfeito': 25 };
      const rated = ticketsList.filter(t => t.csat && csatWeights[t.csat] !== undefined);
      const sumCsat = rated.reduce((acc, t) => acc + csatWeights[t.csat], 0);

      return {
        total,
        avgTotal,
        avgWait,
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

  const getHeatColor = (count, max) => {
    if (count === 0) return 'rgba(255,255,255,0.02)';
    const ratio = count / max;
    if (ratio > 0.8) return 'rgba(218, 13, 23, 0.9)'; // Critical Red
    if (ratio > 0.6) return 'rgba(218, 13, 23, 0.6)'; // High Red
    if (ratio > 0.4) return 'rgba(218, 85, 19, 0.6)'; // Orange
    if (ratio > 0.2) return 'rgba(234, 179, 8, 0.4)'; // Yellow
    return 'rgba(79, 112, 67, 0.4)'; // Green
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
      // Exclude tickets where total is 0 (open) or > 3600 (extraordinary)
      if (t.total === 0 || t.total > 3600) return acc;
      
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

  const avgCsatByAgent = useMemo(() => {
    const stats = filteredTickets.reduce((acc, t) => {
      const score = CSAT_WEIGHTS[t.csat];
      if (score !== undefined) {
        if (!acc[t.agent]) acc[t.agent] = { sum: 0, count: 0 };
        acc[t.agent].sum += score;
        acc[t.agent].count++;
      }
      return acc;
    }, {});
    return Object.entries(stats)
      .map(([name, data]) => ({ name, avg: parseFloat((data.sum / data.count).toFixed(1)) }))
      .sort((a,b) => b.avg - a.avg)
      .slice(0, 8);
  }, [filteredTickets]);

  // Section 4: Evolução Mensal
  const evolution = useMemo(() => {
    const dataByMonth = filteredTickets.reduce((acc, t) => {
      if (!t.month) return acc;
      if (!acc[t.month]) acc[t.month] = { count: 0, tmaCount: 0, tmaTime: 0, csatSum: 0, csatRated: 0 };
      acc[t.month].count++;
      
      // Only include valid, non-extraordinary tickets in TMA calculations
      if (t.total > 0 && t.total <= 3600) {
        acc[t.month].tmaCount++;
        acc[t.month].tmaTime += t.total;
      }
      
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
        time: d.tmaCount > 0 ? Math.round((d.tmaTime / d.tmaCount) / 60) : 0,
        csat: d.csatRated > 0 ? parseFloat((d.csatSum / d.csatRated).toFixed(1)) : 0
      }));
  }, [filteredTickets]);

  // Section 5: Ranking Usuários & Comparativo
  const userRanking = useMemo(() => {
    const userGroups = filteredTickets.reduce((acc, t) => {
      if (!acc[t.user]) acc[t.user] = { count: 0, company: t.company, totalTime: 0, tmaCount: 0 };
      acc[t.user].count++;
      if (t.total > 0 && t.total <= 3600) {
        acc[t.user].totalTime += t.total;
        acc[t.user].tmaCount++;
      }
      return acc;
    }, {});
    
    const sorted = Object.entries(userGroups).sort((a,b) => b[1].count - a[1].count).slice(0, 20);
    const max = sorted[0]?.[1].count || 1;
    
    return sorted.map(([name, d]) => {
      const avgTime = d.tmaCount > 0 ? Math.round((d.totalTime / d.tmaCount) / 60) : 0;
      return { 
        name, 
        company: d.company, 
        count: d.count, 
        percent: (d.count / max) * 100,
        avgTime: avgTime || 10
      };
    });
  }, [filteredTickets]);

  const topDepartments = useMemo(() => {
    const deptGroups = filteredTickets.reduce((acc, t) => {
      const dept = t.company || 'Geral';
      if (!acc[dept]) acc[dept] = 0;
      acc[dept]++;
      return acc;
    }, {});
    return Object.entries(deptGroups)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredTickets]);

  const latestTicket = useMemo(() => {
    if (!rawData || !rawData.tickets || rawData.tickets.length === 0) return null;
    return [...rawData.tickets].sort((a, b) => b.id - a.id)[0];
  }, [rawData]);

  const getSparklinePoints = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const p1 = 12 + (hash % 4);
    const p2 = 8 + ((hash >> 1) % 6);
    const p3 = 10 + ((hash >> 2) % 5);
    const p4 = 4 + ((hash >> 3) % 8);
    return [p1, p2, p3, p4];
  };

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
  const { emAtendimento, naFila, foraDoHorario } = useMemo(() => {
    let emAtendimento = 0;
    let naFila = 0;
    let foraDoHorario = 0;
    openTickets.forEach(t => {
      const agentLower = (t.agent || '').toLowerCase();
      const isUnassigned = !t.agent || agentLower === 'não atribuído' || agentLower === 'sistema' || agentLower === '';
      if (isUnassigned) {
        if (isOutsideServiceHours(t, serviceHours)) {
          foraDoHorario++;
        } else {
          naFila++;
        }
      } else {
        emAtendimento++;
      }
    });
    return { emAtendimento, naFila, foraDoHorario };
  }, [openTickets, serviceHours]);

  // Split openTickets into Suporte, Cadastro, and Fora de Fila (off-hours)
  const { suporteTickets, cadastroTickets, foraDeFilaTickets } = useMemo(() => {
    const suporteTickets = [];
    const cadastroTickets = [];
    const foraDeFilaTickets = [];
    openTickets.forEach(t => {
      const agentLower = (t.agent || '').toLowerCase();
      const isUnassigned = !t.agent || agentLower === 'não atribuído' || agentLower === 'sistema' || agentLower === '';
      const isOutside = isOutsideServiceHours(t, serviceHours);
      
      if (isUnassigned && isOutside) {
        foraDeFilaTickets.push(t);
      } else {
        const pCode = t.parent_code || '';
        if (pCode === '2') {
          cadastroTickets.push(t);
        } else if (pCode === '1') {
          suporteTickets.push(t);
        }

      }
    });

    return { suporteTickets, cadastroTickets, foraDeFilaTickets };
  }, [openTickets, serviceHours]);

  // Operational Metrics: Calculate today's real-time productivity aggregates (Brasília/Fortaleza Time)
  const dailyAgentMetrics = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('pt-BR', {
      timeZone: 'America/Fortaleza',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).split('/').reverse().join('-');

    // 1. Unassigned tickets currently in queue (not assigned to an active agent and within service hours)
    const pendingInQueue = rawData.tickets.filter(t => {
      const status = t.status || 'Finalizado';
      if (status === 'Finalizado') return false;
      const agentLower = (t.agent || '').toLowerCase();
      const isUnassigned = !t.agent || agentLower === 'não atribuído' || agentLower === 'sistema' || agentLower === '';
      if (!isUnassigned) return false;
      return !isOutsideServiceHours(t, serviceHours);
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
  }, [rawData.tickets, serviceHours]);

  const scatterStats = useMemo(() => {
    if (!userRanking.length) return { avgCount: 0, avgTime: 0 };
    const avgCount = userRanking.reduce((sum, u) => sum + u.count, 0) / userRanking.length;
    const avgTime = userRanking.reduce((sum, u) => sum + u.avgTime, 0) / userRanking.length;
    return { avgCount, avgTime };
  }, [userRanking]);

  // Section 7: AI Demand Forecasting Logic
  const forecastStats = useMemo(() => {
    if (!rawData.tickets.length) return { weeklyTrend: [], tomorrowHeat: [], insights: {} };

    // 1. Group historical data by weekday
    const dayAverages = {}; // {0..6: {total: 0, count: 0}}
    const hourAverages = Array(24).fill(0).map(() => ({ total: 0, count: 0 }));
    
    const ticketDays = {}; // Track unique dates to divide totals
    
    rawData.tickets.forEach(t => {
      const date = new Date(t.created_at);
      const day = date.getDay();
      const hour = date.getHours();
      const dateStr = t.created_at.substring(0, 10);

      if (!dayAverages[day]) dayAverages[day] = { total: 0 };
      dayAverages[day].total++;
      
      if (!ticketDays[day]) ticketDays[day] = new Set();
      ticketDays[day].add(dateStr);

      hourAverages[hour].total++;
    });

    // Calculate averages
    const avgByDay = {};
    Object.keys(dayAverages).forEach(d => {
      avgByDay[d] = dayAverages[d].total / ticketDays[d].size;
    });

    const totalDaysProcessed = new Set(rawData.tickets.map(t => t.created_at.substring(0, 10))).size;
    const avgByHour = hourAverages.map(h => h.total / totalDaysProcessed);

    // 2. Generate Weekly Trend (Last 7 + Next 7)
    const weeklyTrend = [];
    const today = new Date();
    
    // Past 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dStr = d.toISOString().substring(0, 10);
      const count = rawData.tickets.filter(t => t.created_at.substring(0, 10) === dStr).length;
      weeklyTrend.push({
        date: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        real: count,
        forecast: null
      });
    }

    // Future 7 days
    for (let i = 1; i <= 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const day = d.getDay();
      
      // Basic seasonality logic
      let multiplier = 1.0;
      if (day === 1) multiplier = 1.25; // Monday peak
      if (day === 0 || day === 6) multiplier = 0.5; // Weekend drop
      
      const forecast = Math.round((avgByDay[day] || 15) * multiplier);
      
      // Connect last real point to first forecast point
      if (i === 1) {
        weeklyTrend[6].forecast = weeklyTrend[6].real;
      }

      weeklyTrend.push({
        date: d.toLocaleDateString('pt-BR', { weekday: 'short' }),
        real: null,
        forecast: forecast
      });
    }

    // 3. Tomorrow's Heatmap Prediction
    const tomorrowHeat = avgByHour.map((avg, hour) => ({
      hour: `${hour}h`,
      count: Math.round(avg * 1.1) // Slightly aggressive for tomorrow
    }));

    // 4. Insights
    const peakHour = avgByHour.indexOf(Math.max(...avgByHour));
    const tomorrowAvg = avgByDay[(today.getDay() + 1) % 7] || 20;
    const recommendedStaff = Math.max(1, Math.ceil(tomorrowAvg / 8)); // Rough estimate

    const insights = {
      peakWindow: `${peakHour}h - ${peakHour + 2}h`,
      demandLevel: tomorrowAvg > 25 ? 'Alta' : 'Moderada',
      staffNeeded: recommendedStaff,
      criticalSector: 'Módulo Fiscal' // Hardcoded based on request but could be dynamic
    };

    return { weeklyTrend, tomorrowHeat, insights };
  }, [rawData.tickets]);



// Section 6: Regional Criticality Data removed (Map tab deleted)


// Heatmap Layer Component removed (Map tab deleted)


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
      <style>{`
        @keyframes pulseCSATGlow {
          0% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.45); }
          70% { transform: translate(-50%, -50%) scale(1.05); box-shadow: 0 0 0 12px rgba(34, 197, 94, 0); }
          100% { transform: translate(-50%, -50%) scale(1); box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
        }
        .pulse-csat-badge {
          animation: pulseCSATGlow 2.5s infinite ease-in-out;
        }
        @keyframes pulseCSATSvg {
          0% {
            stroke-width: 2px;
            opacity: 0.85;
          }
          50% {
            stroke-width: 3.5px;
            opacity: 1;
          }
          100% {
            stroke-width: 2px;
            opacity: 0.85;
          }
        }
        .pulse-csat-circle {
          animation: pulseCSATSvg 2.5s infinite ease-in-out;
        }
      `}</style>
      <aside className="sidebar" style={{ width: (isSidebarOpen && !isTvMode) ? '280px' : '0px', minWidth: (isSidebarOpen && !isTvMode) ? '280px' : '0px', padding: (isSidebarOpen && !isTvMode) ? '2rem' : '0', opacity: (isSidebarOpen && !isTvMode) ? 1 : 0, transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', overflowX: 'hidden', display: isTvMode ? 'none' : 'block' }}>
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
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', fontSize: '0.85rem', marginBottom: '0.5rem' }}
          >
            <BarChart2 size={16} color={activeTab === 'performance' ? 'white' : 'var(--text-dim)'} />
            <span style={{ color: activeTab === 'performance' ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === 'performance' ? 600 : 400 }}>Visão Performance</span>
          </div>

          <div 
            className={`nav-item ${activeTab === 'forecast' ? 'active' : ''}`} 
            onClick={() => setActiveTab('forecast')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', fontSize: '0.85rem', marginBottom: '0.5rem' }}
          >
            <TrendingUp size={16} color={activeTab === 'forecast' ? 'var(--brand-orange)' : 'var(--text-dim)'} />
            <span style={{ color: activeTab === 'forecast' ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === 'forecast' ? 600 : 400 }}>Previsão Futura</span>
          </div>

          <button 
            className={`nav-item ${activeTab === 'monitor' ? 'active' : ''}`} 
            onClick={() => setActiveTab('monitor')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', fontSize: '0.85rem', marginBottom: '0.5rem', background: 'transparent', border: 'none', width: '100%' }}
          >
            <Activity size={16} color={activeTab === 'monitor' ? 'var(--brand-green)' : 'var(--text-dim)'} />
            <span style={{ color: activeTab === 'monitor' ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === 'monitor' ? 600 : 400 }}>Monitor de Serviços</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'acronis' ? 'active' : ''}`} 
            onClick={() => setActiveTab('acronis')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', fontSize: '0.85rem', marginBottom: '0.5rem', background: 'transparent', border: 'none', width: '100%' }}
          >
            <ShieldCheck size={16} color={activeTab === 'acronis' ? '#dc2626' : 'var(--text-dim)'} />
            <span style={{ color: activeTab === 'acronis' ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === 'acronis' ? 600 : 400 }}>Monitoramento Acronis</span>
          </button>

          <button 
            className={`nav-item ${activeTab === 'noc' ? 'active' : ''}`} 
            onClick={() => setActiveTab('noc')}
            style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', padding: '0.8rem', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', fontSize: '0.85rem', marginBottom: '0.5rem', background: 'transparent', border: 'none', width: '100%' }}
          >
            <Activity size={16} color={activeTab === 'noc' ? '#22c55e' : 'var(--text-dim)'} />
            <span style={{ color: activeTab === 'noc' ? 'white' : 'var(--text-secondary)', fontWeight: activeTab === 'noc' ? 600 : 400 }}>NOC Lojas</span>
          </button>

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
          <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '0.4rem', fontStyle: 'italic' }}>
            {syncLabel}
          </div>

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
                   <Tv size={14} color={isTvMode ? 'var(--brand-orange)' : 'var(--text-dim)'} />
                   <span style={{ color: isTvMode ? 'white' : 'var(--text-secondary)' }}>INICIAR MODO TV</span>
                </div>
                <div className="switch">
                  <input type="checkbox" checked={isTvMode} readOnly />
                  <span className="slider"></span>
                </div>
             </div>
          </div>

          <div style={{ padding: '1rem', background: 'var(--bg-card)', borderRadius: '8px', border: '1px solid var(--border-dim)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Settings size={14} /> Configurações do Modo TV
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Auto-Rotação</span>
              <div className="switch">
                <input type="checkbox" checked={autoRotation} onChange={(e) => setAutoRotation(e.target.checked)} />
                <span className="slider"></span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Alerta Sonoro (NOC)</span>
              <div className="switch">
                <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} />
                <span className="slider"></span>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>Intervalo de Rotação</span>
              <select 
                value={rotationInterval} 
                onChange={(e) => setRotationInterval(parseInt(e.target.value))}
                className="custom-select"
              >
                <option value={10}>10 Segundos</option>
                <option value={15}>15 Segundos</option>
                <option value={30}>30 Segundos</option>
              </select>
            </div>

            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Abas na Rotação</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { id: 'performance', label: 'Visão Performance' },
                { id: 'noc', label: 'NOC Lojas' },
                { id: 'acronis', label: 'Monitor Acronis' },
                { id: 'monitor', label: 'Monitor de Serviços' }
              ].map(tab => (
                <label key={tab.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedTabs.includes(tab.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTabs([...selectedTabs, tab.id]);
                      } else {
                        setSelectedTabs(selectedTabs.filter(t => t !== tab.id));
                      }
                    }}
                    style={{ accentColor: 'var(--brand-red)' }}
                  />
                  {tab.label}
                </label>
              ))}
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
              <div style={{ marginBottom: '0.6rem' }}>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    placeholder="Buscar atendente..." 
                    value={agentSearch}
                    onChange={(e) => setAgentSearch(e.target.value)}
                    style={{ 
                      width: '100%', 
                      background: 'rgba(255,255,255,0.05)', 
                      border: '1px solid var(--border-dim)', 
                      borderRadius: '6px', 
                      padding: '0.4rem 0.6rem 0.4rem 1.8rem', 
                      fontSize: '0.7rem', 
                      color: 'white', 
                      outline: 'none' 
                    }}
                  />
                  <Search size={12} color="var(--text-dim)" style={{ position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)' }} />
                </div>
              </div>
            )}

            
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
                
                {rawData.agents
                  .filter(agent => agent.toLowerCase().includes(agentSearch.toLowerCase()))
                  .map(agent => {

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

      <main 
        className={`main-content ${isTvMode ? 'is-tv-mode' : ''}`} 
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', cursor: isTvMode ? 'pointer' : 'default', padding: isTvMode ? '0' : undefined, position: 'relative' }}
      >
        {isTvMode && autoRotation && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.1)', zIndex: 9999 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: 'var(--brand-red)', transition: 'width 0.1s linear' }} />
          </div>
        )}
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
<div className="tv-slide animate-fade" style={isTvMode ? { transform: `translate(-50%, -50%) scale(${tvScale})` } : {}}>
             {/* SECTION 0.2: CHAMADOS EM ABERTO (TEMPO REAL) */}
             <div className="section-header">
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
                
                {/* Visual Feedback of Sync in TV Mode */}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                   <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                      <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-green)' }}></span>
                      LIVE SYNC
                   </div>
                   <div style={{ padding: '4px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-dim)', borderRadius: '6px', fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                      {rawData.last_updated}
                   </div>
                </div>
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

                  {/* Sub-indicador Fora do Horário */}
                  <div style={{
                    background: foraDoHorario > 0 ? 'rgba(140, 125, 117, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: foraDoHorario > 0 ? 'var(--text-secondary)' : 'var(--text-dim)',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginLeft: '8px',
                    border: foraDoHorario > 0 ? '1px solid rgba(140, 125, 117, 0.3)' : '1px solid var(--border-dim)'
                  }}>
                     <span style={{ 
                       width: 6, 
                       height: 6, 
                       borderRadius: '50%', 
                       background: foraDoHorario > 0 ? 'var(--text-secondary)' : 'var(--text-dim)', 
                       display: 'inline-block' 
                     }}></span>
                     {foraDoHorario} FORA DO HORÁRIO
                  </div>

                  {/* Configuração de Horários URA (Interativo e Dinâmico) */}
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', zIndex: 110 }}>
                    <button 
                      onClick={() => setShowHoursConfig(!showHoursConfig)}
                      style={{
                        background: showHoursConfig ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid var(--border-dim)',
                        borderRadius: '8px',
                        padding: '4px 10px',
                        color: 'white',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginLeft: '8px',
                        transition: 'all 0.2s ease',
                      }}
                      title="Configurar Horários da URA"
                    >
                      <Settings size={12} style={{ color: 'var(--brand-blue)' }} />
                      Horários URA
                    </button>
                    
                    {showHoursConfig && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '8px',
                        background: 'rgba(20, 24, 33, 0.96)',
                        backdropFilter: 'blur(16px)',
                        border: '1px solid var(--border-dim)',
                        borderRadius: '12px',
                        padding: '1rem',
                        width: '320px',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.7), 0 10px 10px -5px rgba(0, 0, 0, 0.7)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.75rem',
                        textAlign: 'left'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-dim)', paddingBottom: '0.5rem' }}>
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'white', letterSpacing: '0.05em' }}>⚙️ HORÁRIOS DE ATENDIMENTO</span>
                          <button 
                            onClick={() => setShowHoursConfig(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: 0 }}
                          >
                            <X size={14} />
                          </button>
                        </div>
       
                        {/* Seg - Sex */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Segunda a Sexta</span>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <input 
                              type="time" 
                              value={tempHours.weekdayStart}
                              onChange={(e) => setTempHours({...tempHours, weekdayStart: e.target.value})}
                              style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-dim)',
                                borderRadius: '6px',
                                color: 'white',
                                padding: '4px 6px',
                                fontSize: '0.7rem',
                                flex: 1,
                                outline: 'none'
                              }}
                            />
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>até</span>
                            <input 
                              type="time" 
                              value={tempHours.weekdayEnd}
                              onChange={(e) => setTempHours({...tempHours, weekdayEnd: e.target.value})}
                              style={{
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid var(--border-dim)',
                                borderRadius: '6px',
                                color: 'white',
                                padding: '4px 6px',
                                fontSize: '0.7rem',
                                flex: 1,
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>

                        {/* Sábado */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Sábado</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                              <input 
                                type="checkbox" 
                                checked={tempHours.saturdayEnabled}
                                onChange={(e) => setTempHours({...tempHours, saturdayEnabled: e.target.checked})}
                                style={{ accentColor: 'var(--brand-blue)' }}
                              />
                              Ativo
                            </label>
                          </div>
                          {tempHours.saturdayEnabled && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                              <input 
                                type="time" 
                                value={tempHours.saturdayStart}
                                onChange={(e) => setTempHours({...tempHours, saturdayStart: e.target.value})}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid var(--border-dim)',
                                  borderRadius: '6px',
                                  color: 'white',
                                  padding: '4px 6px',
                                  fontSize: '0.7rem',
                                  flex: 1,
                                  outline: 'none'
                                }}
                              />
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>até</span>
                              <input 
                                type="time" 
                                value={tempHours.saturdayEnd}
                                onChange={(e) => setTempHours({...tempHours, saturdayEnd: e.target.value})}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid var(--border-dim)',
                                  borderRadius: '6px',
                                  color: 'white',
                                  padding: '4px 6px',
                                  fontSize: '0.7rem',
                                  flex: 1,
                                  outline: 'none'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Domingo */}
                        <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Domingo</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                              <input 
                                type="checkbox" 
                                checked={tempHours.sundayEnabled}
                                onChange={(e) => setTempHours({...tempHours, sundayEnabled: e.target.checked})}
                                style={{ accentColor: 'var(--brand-blue)' }}
                              />
                              Ativo
                            </label>
                          </div>
                          {tempHours.sundayEnabled && (
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.25rem' }}>
                              <input 
                                type="time" 
                                value={tempHours.sundayStart}
                                onChange={(e) => setTempHours({...tempHours, sundayStart: e.target.value})}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid var(--border-dim)',
                                  borderRadius: '6px',
                                  color: 'white',
                                  padding: '4px 6px',
                                  fontSize: '0.7rem',
                                  flex: 1,
                                  outline: 'none'
                                }}
                              />
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>até</span>
                              <input 
                                type="time" 
                                value={tempHours.sundayEnd}
                                onChange={(e) => setTempHours({...tempHours, sundayEnd: e.target.value})}
                                style={{
                                  background: 'rgba(255, 255, 255, 0.03)',
                                  border: '1px solid var(--border-dim)',
                                  borderRadius: '6px',
                                  color: 'white',
                                  padding: '4px 6px',
                                  fontSize: '0.7rem',
                                  flex: 1,
                                  outline: 'none'
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Botão Salvar */}
                        <button 
                          onClick={handleSaveHours}
                          style={{
                            background: 'var(--brand-blue)',
                            border: 'none',
                            borderRadius: '6px',
                            color: 'white',
                            padding: '8px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            cursor: 'pointer',
                            marginTop: '0.25rem',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          Salvar Configuração
                        </button>
                      </div>
                    )}
                 </div>
                <div className="section-line"></div>
             </div>

                           <section className="section-anchor">
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isTvMode ? '1fr 1fr 1fr 1.2fr' : 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '1.5rem',
                  alignItems: 'stretch',
                  minHeight: isTvMode ? '720px' : 'auto'
                }}>
                  {/* COLUNA ESQUERDA 1: CHAMADOS SUPORTE */}
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
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Terminal size={14} color="var(--brand-red)" />
                        💻 Chamados Suporte
                      </div>
                      <span style={{
                        background: 'rgba(218, 13, 23, 0.15)',
                        color: 'var(--brand-red)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.65rem',
                        fontWeight: 800
                      }}>{suporteTickets.length}</span>
                    </div>

                    {suporteTickets.length === 0 ? (
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
                          <CheckCircle2 size={20} color="var(--brand-green)" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'white' }}>SEM SUPORTE EM ABERTO</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.75rem', 
                        maxHeight: isTvMode ? '620px' : '235px',
                        overflowY: 'auto', 
                        paddingRight: '0.25rem',
                        scrollBehavior: 'smooth',
                        WebkitOverflowScrolling: 'touch',
                        flex: 1
                      }} className="custom-vertical-scrollbar">
                        {suporteTickets.map((ticket, i) => {
                          const agentLower = (ticket.agent || '').toLowerCase();
                          const isUnassigned = !ticket.agent || agentLower === 'não atribuído' || agentLower === 'sistema' || agentLower === '';
                          const isOutside = isOutsideServiceHours(ticket, serviceHours);
                          const isCritical = ticket.status === 'Novo' || ticket.wait > 20;
                          return (
                          <div key={i} 
                            className={isCritical ? 'animate-pulse' : ''}
                            style={{
                            borderLeft: isCritical ? '4px solid var(--brand-red)' : '4px solid var(--brand-blue)',
                            padding: '0.75rem 0.85rem',
                            background: isCritical ? 'rgba(218, 13, 23, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--border-dim)',
                            borderLeftWidth: '4px',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            width: '100%',
                            transition: 'all 0.3s ease'
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
                                  {isUnassigned && isOutside ? (
                                    <span style={{
                                      background: 'rgba(140, 125, 117, 0.15)',
                                      color: 'var(--text-secondary)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.6rem',
                                      fontWeight: 800,
                                      textTransform: 'uppercase'
                                    }}>
                                      Fora de Horário
                                    </span>
                                  ) : (
                                    <span style={{
                                      background: ticket.status === 'Em atendimento' ? 'rgba(38, 93, 124, 0.15)' : 'rgba(218, 85, 19, 0.15)',
                                      color: ticket.status === 'Em atendimento' ? 'var(--brand-blue)' : 'var(--brand-orange)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.6rem',
                                      fontWeight: 800,
                                      textTransform: 'uppercase'
                                    }}>
                                      {ticket.status}
                                    </span>
                                  )}
                              </div>
                              <span style={{
                                fontSize: '0.65rem',
                                color: isUnassigned && isOutside ? 'var(--text-dim)' : 'var(--brand-red)',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{ 
                                  width: 4, 
                                  height: 4, 
                                  borderRadius: '50%', 
                                  background: isUnassigned && isOutside ? 'var(--text-dim)' : 'var(--brand-red)', 
                                  display: 'inline-block' 
                                }} className={isUnassigned && isOutside ? '' : 'animate-pulse'}></span>
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
                        )})}
                      </div>
                    )}
                  </div>

                  {/* COLUNA ESQUERDA 2: CHAMADOS CADASTRO */}
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
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={14} color="var(--brand-orange)" />
                        📝 Chamados Cadastro
                      </div>
                      <span style={{
                        background: 'rgba(218, 85, 19, 0.15)',
                        color: 'var(--brand-orange)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.65rem',
                        fontWeight: 800
                      }}>{cadastroTickets.length}</span>
                    </div>

                    {cadastroTickets.length === 0 ? (
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
                          <CheckCircle2 size={20} color="var(--brand-green)" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'white' }}>SEM CADASTRO EM ABERTO</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.75rem', 
                        maxHeight: isTvMode ? '620px' : '235px',
                        overflowY: 'auto', 
                        paddingRight: '0.25rem',
                        scrollBehavior: 'smooth',
                        WebkitOverflowScrolling: 'touch',
                        flex: 1
                      }} className="custom-vertical-scrollbar">
                        {cadastroTickets.map((ticket, i) => {
                          const agentLower = (ticket.agent || '').toLowerCase();
                          const isUnassigned = !ticket.agent || agentLower === 'não atribuído' || agentLower === 'sistema' || agentLower === '';
                          const isOutside = isOutsideServiceHours(ticket, serviceHours);
                          const isCritical = ticket.status === 'Novo' || ticket.wait > 20;
                          return (
                          <div key={i} 
                            className={isCritical ? 'animate-pulse' : ''}
                            style={{
                            borderLeft: isCritical ? '4px solid var(--brand-red)' : '4px solid var(--brand-orange)',
                            padding: '0.75rem 0.85rem',
                            background: isCritical ? 'rgba(218, 13, 23, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--border-dim)',
                            borderLeftWidth: '4px',
                            borderRadius: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            width: '100%',
                            transition: 'all 0.3s ease'
                          }}>
                            {/* Header row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                <span style={{
                                  background: 'rgba(218, 85, 19, 0.1)',
                                  color: 'var(--brand-orange)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  fontFamily: 'JetBrains Mono, monospace'
                                }}>
                                  #{ticket.id}
                                </span>
                                  {isUnassigned && isOutside ? (
                                    <span style={{
                                      background: 'rgba(140, 125, 117, 0.15)',
                                      color: 'var(--text-secondary)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.6rem',
                                      fontWeight: 800,
                                      textTransform: 'uppercase'
                                    }}>
                                      Fora de Horário
                                    </span>
                                  ) : (
                                    <span style={{
                                      background: ticket.status === 'Em atendimento' ? 'rgba(38, 93, 124, 0.15)' : 'rgba(218, 85, 19, 0.15)',
                                      color: ticket.status === 'Em atendimento' ? 'var(--brand-blue)' : 'var(--brand-orange)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.6rem',
                                      fontWeight: 800,
                                      textTransform: 'uppercase'
                                    }}>
                                      {ticket.status}
                                    </span>
                                  )}
                              </div>
                              <span style={{
                                fontSize: '0.65rem',
                                color: isUnassigned && isOutside ? 'var(--text-dim)' : 'var(--brand-orange)',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{ 
                                  width: 4, 
                                  height: 4, 
                                  borderRadius: '50%', 
                                  background: isUnassigned && isOutside ? 'var(--text-dim)' : 'var(--brand-orange)', 
                                  display: 'inline-block' 
                                }} className={isUnassigned && isOutside ? '' : 'animate-pulse'}></span>
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
                        )})}
                      </div>
                    )}
                  </div>

                  {/* COLUNA: CHAMADOS FORA DE FILA */}
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
                      justifyContent: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Moon size={14} color="var(--text-secondary)" />
                        🕒 Chamados Fora de Fila
                      </div>
                      <span style={{
                        background: 'rgba(140, 125, 117, 0.15)',
                        color: 'var(--text-secondary)',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '0.65rem',
                        fontWeight: 800
                      }}>{foraDeFilaTickets.length}</span>
                    </div>

                    {foraDeFilaTickets.length === 0 ? (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.75rem',
                        padding: '2.5rem 1rem',
                        border: '1.5px dashed rgba(140, 125, 117, 0.3)',
                        borderRadius: '8px',
                        background: 'rgba(140, 125, 117, 0.02)',
                        flex: 1
                      }}>
                        <div style={{ background: 'rgba(140, 125, 117, 0.12)', padding: '10px', borderRadius: '50%' }}>
                          <CheckCircle2 size={20} color="var(--text-dim)" />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontWeight: 800, fontSize: '0.8rem', color: 'white' }}>NENHUM CHAMADO FORA DE FILA</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '0.75rem', 
                        maxHeight: isTvMode ? '620px' : '235px',
                        overflowY: 'auto', 
                        paddingRight: '0.25rem',
                        scrollBehavior: 'smooth',
                        WebkitOverflowScrolling: 'touch',
                        flex: 1
                      }} className="custom-vertical-scrollbar">
                        {foraDeFilaTickets.map((ticket, i) => {
                          const agentLower = (ticket.agent || '').toLowerCase();
                          const isUnassigned = !ticket.agent || agentLower === 'não atribuído' || agentLower === 'sistema' || agentLower === '';
                          return (
                          <div key={i} style={{
                            borderLeft: '4px solid var(--text-secondary)',
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
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  color: 'var(--text-secondary)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 800,
                                  fontFamily: 'JetBrains Mono, monospace'
                                }}>
                                  #{ticket.id}
                                </span>
                                <span style={{
                                  background: 'rgba(140, 125, 117, 0.15)',
                                  color: 'var(--text-secondary)',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  fontSize: '0.6rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase'
                                }}>
                                  Fora de Horário
                                </span>
                              </div>
                              <span style={{
                                fontSize: '0.65rem',
                                color: 'var(--text-dim)',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <span style={{ 
                                  width: 4, 
                                  height: 4, 
                                  borderRadius: '50%', 
                                  background: 'var(--text-dim)', 
                                  display: 'inline-block' 
                                }}></span>
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
                                Atendente: <strong style={{ color: 'white' }}>{ticket.agent || 'Sem Atendente'}</strong>
                              </span>
                            </div>
                          </div>
                        )})}
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

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: isTvMode ? '500px' : '180px', paddingRight: '4px' }}>
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
 <div className="tv-slide animate-fade" style={isTvMode ? { transform: `translate(-50%, -50%) scale(${tvScale})` } : {}}>

            {/* SECTION 0: VISÃO GERAL */}
             <div className="section-header" style={{ marginTop: '2.5rem' }}>
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


</div>
)}
{(!isTvMode || tvSlideIndex === 2) && (
<div className="tv-slide animate-fade" style={isTvMode ? { transform: `translate(-50%, -50%) scale(${tvScale})` } : {}}>
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
                   <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                      <div className="card-label" style={{ marginBottom: '1.25rem' }}>🏆 Ranking de Performance</div>
                      <div style={{
                         display: 'flex',
                         flexDirection: 'column',
                         gap: '0.65rem',
                         height: isTvMode ? '300px' : '340px',
                         overflowY: 'auto',
                         paddingRight: '4px'
                      }} className="custom-vertical-scrollbar">
                         {agentPerf.map((agent, i) => {
                            const maxCount = agentPerf[0]?.count || 1;
                            const percent = (agent.count / maxCount) * 100;
                            const initials = getInitials(agent.name);
                            
                            // Determine Rank Styles
                            const isFirst = i === 0;
                            const isSecond = i === 1;
                            const isThird = i === 2;
                            
                            let rankIcon = <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', width: '20px', textAlign: 'center' }}>{i + 1}</span>;
                            let avatarBg = 'var(--bg-dark)';
                            let avatarColor = 'var(--text-secondary)';
                            let avatarBorder = '1px solid var(--border-dim)';
                            let avatarGlow = 'none';
                            
                            let barBg = 'linear-gradient(90deg, var(--brand-red), var(--brand-orange))';
                            let barGlow = 'none';
                            let nameColor = 'white';
                            
                            if (isFirst) {
                               rankIcon = <span style={{ fontSize: '1.1rem', width: '20px', textAlign: 'center', filter: 'drop-shadow(0 2px 4px rgba(234, 179, 8, 0.4))' }}>👑</span>;
                               avatarBg = 'linear-gradient(135deg, #fef08a, #eab308)';
                               avatarColor = '#1e1b4b';
                               avatarBorder = '1px solid #facc15';
                               avatarGlow = '0 0 10px rgba(234, 179, 8, 0.6)';
                               barBg = 'linear-gradient(90deg, #f59e0b, #eab308, #ca8a04)';
                               barGlow = '0 0 12px rgba(234, 179, 8, 0.5)';
                               nameColor = '#fef08a';
                            } else if (isSecond) {
                               rankIcon = <span style={{ fontSize: '1.1rem', width: '20px', textAlign: 'center' }}>🥈</span>;
                               avatarBg = 'linear-gradient(135deg, #f1f5f9, #94a3b8)';
                               avatarColor = '#0f172a';
                               avatarBorder = '1px solid #cbd5e1';
                               avatarGlow = '0 0 8px rgba(148, 163, 184, 0.3)';
                               barBg = 'linear-gradient(90deg, #3b82f6, #1d4ed8)';
                            } else if (isThird) {
                               rankIcon = <span style={{ fontSize: '1.1rem', width: '20px', textAlign: 'center' }}>🥉</span>;
                               avatarBg = 'linear-gradient(135deg, #ffedd5, #b45309)';
                               avatarColor = '#451a03';
                               avatarBorder = '1px solid #f97316';
                               avatarGlow = '0 0 8px rgba(180, 83, 9, 0.3)';
                               barBg = 'linear-gradient(90deg, #f97316, #c2410c)';
                            }

                            return (
                               <div key={i} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  padding: '0.45rem 0.6rem',
                                  background: isFirst ? 'rgba(234, 179, 8, 0.03)' : 'rgba(255, 255, 255, 0.01)',
                                  border: isFirst ? '1px solid rgba(234, 179, 8, 0.15)' : '1px solid var(--border-dim)',
                                  borderRadius: '8px',
                                  boxShadow: isFirst ? '0 4px 12px rgba(234, 179, 8, 0.05)' : 'none',
                                  transition: 'all 0.2s ease',
                               }}>
                                  {/* Rank Icon */}
                                  {rankIcon}

                                  {/* Avatar Circle */}
                                  <div style={{
                                     width: '32px',
                                     height: '32px',
                                     borderRadius: '50%',
                                     background: avatarBg,
                                     color: avatarColor,
                                     border: avatarBorder,
                                     boxShadow: avatarGlow,
                                     display: 'flex',
                                     alignItems: 'center',
                                     justifyContent: 'center',
                                     fontSize: '0.75rem',
                                     fontWeight: 800,
                                     letterSpacing: '0.05em',
                                     flexShrink: 0
                                  }}>
                                     {initials}
                                  </div>

                                  {/* Details Area */}
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{
                                           fontSize: '0.75rem',
                                           fontWeight: isFirst ? 800 : 700,
                                           color: nameColor,
                                           whiteSpace: 'nowrap',
                                           overflow: 'hidden',
                                           textOverflow: 'ellipsis',
                                           maxWidth: isTvMode ? '220px' : '150px'
                                        }}>
                                           {agent.name}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                           {agent['CSAT (%)'] > 0 && (
                                              <span style={{
                                                 fontSize: '0.65rem',
                                                 fontWeight: 800,
                                                 background: getCsatColor(agent['CSAT (%)']) + '20',
                                                 color: getCsatColor(agent['CSAT (%)']),
                                                 padding: '1px 5px',
                                                 borderRadius: '4px',
                                                 border: `1px solid ${getCsatColor(agent['CSAT (%)'])}40`
                                              }}>
                                                 {agent['CSAT (%)'].toFixed(0)}% CSAT
                                              </span>
                                           )}
                                           <span style={{
                                              fontSize: '0.75rem',
                                              fontWeight: 800,
                                              color: isFirst ? '#facc15' : 'var(--text-secondary)',
                                              fontFamily: 'JetBrains Mono, monospace'
                                           }}>
                                              {agent.count} chamados
                                           </span>
                                        </div>
                                     </div>

                                     {/* Proportional Progress Bar */}
                                     <div style={{
                                        width: '100%',
                                        height: '6px',
                                        background: 'rgba(255, 255, 255, 0.03)',
                                        borderRadius: '3px',
                                        overflow: 'hidden'
                                     }}>
                                        <div style={{
                                           width: `${percent}%`,
                                           height: '100%',
                                           background: barBg,
                                           borderRadius: '3px',
                                           boxShadow: barGlow,
                                           transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                                        }} />
                                     </div>
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                   </div>

                  {/* Visão Mensal */}
                   <div className="card animate-fade">
                      <div className="card-label">Visão Mensal (Total Suporte vs Satisfação CSAT %)</div>
                      <ResponsiveContainer width="100%" height={isTvMode ? 320 : 340}>
                         <ComposedChart data={monthlyData} margin={{ top: isTvMode ? 65 : 45, right: 20, left: 10, bottom: 20 }}>
                            <XAxis 
                              dataKey="label" 
                              stroke="var(--text-dim)" 
                              fontSize={9} 
                              axisLine={false} 
                              tickLine={false} 
                              interval={0}
                              tick={{ fontSize: isTvMode ? 7.5 : 9, angle: -45, textAnchor: 'end' }}
                              height={60}
                            />
                            {/* Dual Y-Axes with headroom for labels */}
                            <YAxis yAxisId="left" domain={[0, isTvMode ? 'dataMax + 250' : 'dataMax + 100']} hide />
                            <YAxis yAxisId="right" domain={[0, isTvMode ? 135 : 105]} hide />
                            
                            <Tooltip 
                              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px', fontSize: '11px' }}
                              cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                              formatter={(val, name) => {
                                if (name === 'Total Suporte') return [val, 'Volume Total'];
                                if (name === 'Satisfação (CSAT %)') return [`${val}%`, 'CSAT'];
                                return [val, name];
                              }}
                            />
                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
                            
                            {/* Destaque de Sazonalidade - Atualização do Sistema Athenas */}
                            <ReferenceLine 
                              yAxisId="left"
                              x="Março 2026" 
                              stroke="rgba(250, 204, 21, 0.4)" 
                              strokeDasharray="3 3" 
                              label={{ value: 'Atualização Athenas 🚀', fill: '#facc15', fontSize: 9, fontWeight: 800, position: 'insideTopLeft', offset: 5 }} 
                            />
                            
                            <Bar 
                              yAxisId="left" 
                              dataKey="totalSuporte" 
                              name="Total Suporte" 
                              radius={[4, 4, 0, 0]} 
                              label={{ position: 'insideTop', fill: '#fff', fontSize: 10, fontWeight: 700, offset: 10 }}
                            >
                              {monthlyData.map((entry, idx) => {
                                 if (entry.isForecast) {
                                    return (
                                       <Cell 
                                          key={`cell-${idx}`} 
                                          fill="rgba(42, 128, 255, 0.12)" 
                                          stroke="#2a80ff" 
                                          strokeDasharray="4 4" 
                                          strokeWidth={2}
                                       />
                                    );
                                 }
                                 return <Cell key={`cell-${idx}`} fill="var(--brand-red)" />;
                              })}
                            </Bar>
                            
                            <Line 
                              yAxisId="right" 
                              type="monotone" 
                              dataKey="csat" 
                              name="Satisfação (CSAT %)" 
                              stroke="var(--brand-green)" 
                              strokeWidth={3} 
                              dot={{ r: 4, fill: 'var(--brand-green)', strokeWidth: 2, stroke: 'var(--bg-card)' }}
                              label={{ position: 'top', fill: 'var(--brand-green)', fontSize: 10, fontWeight: 700, offset: 15, formatter: (val) => `${val}%` }}
                            />
                            {!isTvMode && <Brush dataKey="label" height={15} stroke="rgba(255, 255, 255, 0.1)" fill="transparent" travellerWidth={4} />}
                         </ComposedChart>
                      </ResponsiveContainer>
                   </div>

                  {/* Visão Semanal */}
                  <div className="card animate-fade">
                     <div className="card-label">Visão Semanal (Carga Acumulada — Cadastro vs Suporte)</div>
                     <ResponsiveContainer width="100%" height={isTvMode ? 240 : 260}>
                        <BarChart data={trendData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                           <XAxis dataKey="label" stroke="var(--text-dim)" fontSize={10} axisLine={false} tickLine={false} />
                           <YAxis domain={[0, 'dataMax + 40']} hide />
                           <Tooltip 
                             contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px', fontSize: '11px' }}
                             cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                           />
                           <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase' }} />
                           
                           {/* Linha de Capacidade Operacional de Atendimento */}
                           <ReferenceLine 
                             y={120} 
                             stroke="rgba(239, 68, 68, 0.4)" 
                             strokeDasharray="3 3" 
                             label={{ value: 'Capacidade Limite: 120 chamados/dia ⚠️', fill: '#ef4444', fontSize: 9, fontWeight: 700, position: 'insideTopLeft', offset: 8 }} 
                           />
                           
                           {/* Stacked Bars with Opacity Filter for Saturday/Sunday */}
                           <Bar dataKey="suporte" name="Suporte" fill="var(--brand-red)" stackId="a" radius={[0, 0, 0, 0]}>
                             {trendData.map((entry, idx) => {
                                const isWeekend = entry.label === 'Sábado' || entry.label === 'Domingo';
                                return <Cell key={`cell-sup-${idx}`} fill="var(--brand-red)" fillOpacity={isWeekend ? 0.22 : 0.85} />;
                             })}
                             <LabelList dataKey="suporte" position="insideTop" fill="#fff" fontSize={9} fontWeight={700} formatter={(v) => v > 0 ? v : ''} />
                           </Bar>
                           <Bar dataKey="cadastro" name="Cadastro" fill="var(--brand-orange)" stackId="a" radius={[4, 4, 0, 0]}>
                             {trendData.map((entry, idx) => {
                                const isWeekend = entry.label === 'Sábado' || entry.label === 'Domingo';
                                return <Cell key={`cell-cad-${idx}`} fill="var(--brand-orange)" fillOpacity={isWeekend ? 0.22 : 0.85} />;
                             })}
                             <LabelList dataKey="cadastro" position="top" fill="var(--text-dim)" fontSize={9} fontWeight={700} formatter={(v) => v > 0 ? v : ''} />
                           </Bar>
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
{(!isTvMode || tvSlideIndex === 3) && (
<div className="tv-slide animate-fade" style={isTvMode ? { transform: `translate(-50%, -50%) scale(${tvScale})` } : {}}>
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
                   {/* Média de Satisfação por Atendente */}
                   <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                      <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', textTransform: 'none' }}>
                         <div style={{ padding: '4px', background: 'rgba(0, 150, 57, 0.1)', borderRadius: '4px', display: 'flex' }}>
                            <Trophy size={14} color="var(--brand-green)" />
                         </div>
                         <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>Top Performers (Satisfação)</span> 
                         <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>— Média em CSAT (%)</span>
                      </div>
                      <div style={{
                         display: 'flex',
                         flexDirection: 'column',
                         gap: '0.65rem',
                         height: isTvMode ? '280px' : '280px',
                         overflowY: 'auto',
                         paddingRight: '4px'
                      }} className="custom-vertical-scrollbar">
                         {[...avgCsatByAgent].sort((a,b) => b.avg - a.avg).map((agent, i) => {
                            const initials = getInitials(agent.name);
                            const score = agent.avg;
                            
                            // Color scheme based on score
                            let badgeColor = 'var(--text-dim)';
                            let badgeBg = 'rgba(255, 255, 255, 0.02)';
                            let badgeBorder = '1px solid var(--border-dim)';
                            let textGlow = 'none';
                            let avatarBg = 'var(--bg-dark)';
                            
                            if (score >= 95) {
                               badgeColor = '#22c55e'; // Green Brilliant
                               badgeBg = 'rgba(34, 197, 94, 0.12)';
                               badgeBorder = '1px solid rgba(34, 197, 94, 0.3)';
                               textGlow = '0 0 10px rgba(34, 197, 94, 0.6)';
                               avatarBg = 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.4))';
                            } else if (score >= 80) {
                               badgeColor = 'var(--brand-blue)'; // Blue
                               badgeBg = 'rgba(59, 130, 246, 0.12)';
                               badgeBorder = '1px solid rgba(59, 130, 246, 0.3)';
                               avatarBg = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.4))';
                            } else if (score >= 50) {
                               badgeColor = '#f59e0b'; // Yellow
                               badgeBg = 'rgba(245, 158, 11, 0.12)';
                               badgeBorder = '1px solid rgba(245, 158, 11, 0.3)';
                               avatarBg = 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.4))';
                            } else {
                               badgeColor = 'var(--brand-red)'; // Red
                               badgeBg = 'rgba(239, 68, 68, 0.12)';
                               badgeBorder = '1px solid rgba(239, 68, 68, 0.3)';
                               avatarBg = 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(239, 68, 68, 0.4))';
                            }

                            return (
                               <div key={i} style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '0.75rem',
                                  padding: '0.5rem 0.65rem',
                                  background: 'rgba(255, 255, 255, 0.01)',
                                  border: '1px solid var(--border-dim)',
                                  borderRadius: '8px',
                                  transition: 'all 0.2s ease'
                               }}>
                                  {/* Rank Indicator */}
                                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', width: '18px', textAlign: 'center' }}>
                                     {i + 1}
                                  </span>

                                  {/* Avatar with Initials */}
                                  <div style={{
                                     width: '32px',
                                     height: '32px',
                                     borderRadius: '50%',
                                     background: avatarBg,
                                     color: 'white',
                                     border: '1px solid rgba(255, 255, 255, 0.08)',
                                     display: 'flex',
                                     alignItems: 'center',
                                     justifyContent: 'center',
                                     fontSize: '0.75rem',
                                     fontWeight: 800,
                                     flexShrink: 0
                                  }}>
                                     {initials}
                                  </div>

                                  {/* Info and Stars */}
                                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                     <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: isTvMode ? '200px' : '150px' }}>
                                        {agent.name}
                                     </span>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        {renderStars(score)}
                                     </div>
                                  </div>

                                  {/* Glowing CSAT Badge */}
                                  <div style={{
                                     padding: '4px 8px',
                                     background: badgeBg,
                                     color: badgeColor,
                                     border: badgeBorder,
                                     borderRadius: '6px',
                                     fontSize: '0.75rem',
                                     fontWeight: 900,
                                     textShadow: textGlow,
                                     fontFamily: 'JetBrains Mono, monospace'
                                  }}>
                                     {score.toFixed(1)}%
                                  </div>
                               </div>
                            );
                         })}
                      </div>
                   </div>

                  {/* Distribuição CSAT */}
                  <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                     <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', textTransform: 'none' }}>
                        <div style={{ padding: '4px', background: 'rgba(218, 13, 23, 0.1)', borderRadius: '4px', display: 'flex' }}>
                           <PieChart size={14} color="var(--brand-red)" />
                        </div>
                        <span style={{ fontWeight: 700, textTransform: 'uppercase' }}>Distribuição CSAT</span> 
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>— CSAT {metrics.csatScore.toFixed(1)}%</span>
                     </div>
                     <div style={{ width: '100%', height: isTvMode ? '280px' : '280px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                           <RePieChart>
                               <Pie
                                 data={csatData}
                                 cx="50%"
                                 cy="43%"
                                 innerRadius={60}
                                 outerRadius={80}
                                 paddingAngle={5}
                                 dataKey="value"
                                 label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                              >
                                 {csatData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                 ))}
                                 <Label content={(labelProps) => <CustomCsatLabel {...labelProps} score={metrics.csatScore} />} position="center" />
                              </Pie>
                              <Tooltip />
                              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "10px", textTransform: "uppercase" }} />
                           </RePieChart>
                        </ResponsiveContainer>
                     </div>
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
                           
                           {/* Reference Benchmark Line at 95% CSAT */}
                           <ReferenceLine y={95} stroke="rgba(34, 197, 94, 0.4)" strokeDasharray="3 3" label={{ value: 'Meta: 95%', fill: '#22c55e', fontSize: 9, fontWeight: 700, position: 'insideTopLeft', offset: 8 }} />
                           
                           <Area type="monotone" dataKey="csat" stroke="var(--brand-green)" strokeWidth={3} fillOpacity={1} fill="url(#colorCsat)" dot={<CustomAreaDot evolutionData={evolution} />}>
                              <LabelList dataKey="csat" position="top" fill="var(--brand-green)" fontSize={9} fontWeight={700} formatter={(v) => `${v}%`} />
                           </Area>
                           {!isTvMode && <Brush dataKey="month" height={12} stroke="rgba(255, 255, 255, 0.1)" fill="transparent" travellerWidth={4} />}
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
                        <ComposedChart data={evolution} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                           <defs>
                              <linearGradient id="colorTime" x1="0" y1="0" x2="0" y2="1">
                                 <stop offset="5%" stopColor="#2a80ff" stopOpacity={0.3}/>
                                 <stop offset="95%" stopColor="#2a80ff" stopOpacity={0}/>
                              </linearGradient>
                           </defs>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                           <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} />
                           <YAxis yAxisId="left" stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} width={30} />
                           <YAxis yAxisId="right" orientation="right" stroke="transparent" fontSize={9} axisLine={false} tickLine={false} width={0} />
                           
                           <Tooltip 
                              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px', fontSize: '11px' }} 
                              formatter={(val, name) => {
                                 if (name === 'time') return [`${val} min`, 'TMA'];
                                 if (name === 'volume') return [`${val} chamados`, 'Volume'];
                                 return [val, name];
                              }}
                           />
                           
                           {/* Volume Bars in the background (semi-transparent) */}
                           <Bar yAxisId="right" dataKey="volume" fill="rgba(42, 128, 255, 0.08)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                           
                           {/* SLA Benchmark reference line at 20 min */}
                           <ReferenceLine yAxisId="left" y={20} stroke="rgba(239, 68, 68, 0.4)" strokeDasharray="3 3" label={{ value: 'Meta: 20 min', fill: '#ef4444', fontSize: 9, fontWeight: 700, position: 'insideTopLeft', offset: 8 }} />
                           
                           <Area yAxisId="left" type="monotone" dataKey="time" stroke="#2a80ff" strokeWidth={3} fillOpacity={1} fill="url(#colorTime)" dot={<CustomAreaDot evolutionData={evolution} />}>
                              <LabelList dataKey="time" position="top" fill="#2a80ff" fontSize={9} fontWeight={700} formatter={(v) => `${v}m`} />
                           </Area>
                           {!isTvMode && <Brush dataKey="month" height={12} stroke="rgba(255, 255, 255, 0.1)" fill="transparent" travellerWidth={4} />}
                        </ComposedChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </section>

                        </div>
)}
{(!isTvMode || tvSlideIndex === 4) && (
<div className="tv-slide animate-fade" style={isTvMode ? { transform: `translate(-50%, -50%) scale(${tvScale})` } : {}}>
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
               <div className="equal-col-grid" style={{ minHeight: '500px' }}>
                  <div className="card animate-fade" style={{ padding: '1.5rem', maxHeight: '500px', overflowY: 'auto', flex: 1 }}>
                     <div className="card-label" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Trophy size={14} color="var(--brand-orange)" /> 
                        <span style={{ fontWeight: 700, textTransform: 'none' }}>Top 20 Usuários</span>
                        <span style={{ color: 'var(--text-dim)', fontWeight: 400, textTransform: 'none' }}>— {metrics.uniqueUsers} usuários</span>
                     </div>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                        {userRanking.map((user, i) => {
                           const sparkPoints = getSparklinePoints(user.name);
                           const points = sparkPoints.map((py, idx) => ({ x: idx * 10 + 2, y: py }));
                           const pathD = `M ${points.map(p => `${p.x} ${p.y}`).join(' L ')}`;
                           const isUp = points[3].y < points[0].y;
                           const sparkColor = isUp ? 'var(--brand-green)' : 'var(--brand-red)';

                           return (
                              <div key={i} onClick={() => setSelectedUser(user.name)} style={{ cursor: 'pointer', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '1rem', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.015)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.03)'; }}>
                                 {/* Medal Badges */}
                                 {i === 0 ? (
                                    <div style={{ 
                                       width: '24px', 
                                       height: '24px', 
                                       borderRadius: '50%', 
                                       background: 'radial-gradient(circle, #ffd700 0%, #b8860b 100%)', 
                                       color: 'black', 
                                       display: 'flex', 
                                       alignItems: 'center', 
                                       justifyContent: 'center', 
                                       fontSize: '0.75rem', 
                                       fontWeight: 900,
                                       boxShadow: '0 0 8px rgba(255,215,0,0.4)',
                                       border: '1px solid #fff',
                                       flexShrink: 0
                                    }}>🥇</div>
                                 ) : i === 1 ? (
                                    <div style={{ 
                                       width: '24px', 
                                       height: '24px', 
                                       borderRadius: '50%', 
                                       background: 'radial-gradient(circle, #e6e6e6 0%, #808080 100%)', 
                                       color: 'black', 
                                       display: 'flex', 
                                       alignItems: 'center', 
                                       justifyContent: 'center', 
                                       fontSize: '0.75rem', 
                                       fontWeight: 900,
                                       boxShadow: '0 0 8px rgba(230,230,230,0.3)',
                                       border: '1px solid #fff',
                                       flexShrink: 0
                                    }}>🥈</div>
                                 ) : i === 2 ? (
                                    <div style={{ 
                                       width: '24px', 
                                       height: '24px', 
                                       borderRadius: '50%', 
                                       background: 'radial-gradient(circle, #cd7f32 0%, #8b4513 100%)', 
                                       color: 'black', 
                                       display: 'flex', 
                                       alignItems: 'center', 
                                       justifyContent: 'center', 
                                       fontSize: '0.75rem', 
                                       fontWeight: 900,
                                       boxShadow: '0 0 8px rgba(205,127,50,0.3)',
                                       border: '1px solid #fff',
                                       flexShrink: 0
                                    }}>🥉</div>
                                 ) : (
                                    <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-dim)', width: '24px', textAlign: 'center', flexShrink: 0 }}>
                                       {i + 1}
                                    </div>
                                 )}

                                 <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.name}</div>
                                    <div style={{ color: 'var(--text-dim)', fontSize: '0.65rem', marginTop: '0.2rem', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.company}</div>
                                 </div>

                                 {/* Progress Bar & Sparkline & Count */}
                                 <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexShrink: 0 }}>
                                    {/* Sparkline */}
                                    <svg width={36} height={14} style={{ overflow: 'visible', opacity: 0.8, display: isTvMode ? 'none' : 'block' }}>
                                       <path d={pathD} fill="none" stroke={sparkColor} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                       <circle cx={points[3].x} cy={points[3].y} r={2} fill={sparkColor} />
                                    </svg>
                                    
                                    <div style={{ width: '40px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', display: isTvMode ? 'none' : 'block' }}>
                                       <div style={{ height: '100%', width: `${user.percent}%`, background: 'var(--brand-red)', borderRadius: '10px' }}></div>
                                    </div>
                                    
                                    <span style={{ color: 'var(--brand-red)', fontWeight: 800, fontSize: '0.85rem', width: '28px', textAlign: 'right' }}>{user.count}</span>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>

                  <div className="card animate-fade" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', maxHeight: '500px', flex: 1 }}>
                     <div>
                        <div className="card-label" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                           <BarChart2 size={14} color="var(--brand-blue)" /> 
                           <span style={{ fontWeight: 700, textTransform: 'none' }}>Matriz de Dispersão — Volume vs Complexidade (TMA)</span>
                        </div>
                        <ResponsiveContainer width="100%" height={230}>
                           <ScatterChart margin={{ top: 15, right: 15, bottom: 5, left: -10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                              <XAxis type="number" dataKey="count" name="Volume" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} label={{ value: 'Volume (Chamados)', position: 'insideBottom', offset: -2, fill: 'var(--text-dim)', fontSize: 9, fontWeight: 700 }} />
                              <YAxis type="number" dataKey="avgTime" name="TMA" stroke="var(--text-dim)" fontSize={9} tickLine={false} axisLine={false} label={{ value: 'TMA (min)', angle: -90, position: 'insideLeft', offset: 0, fill: 'var(--text-dim)', fontSize: 9, fontWeight: 700 }} />
                              <ZAxis type="number" dataKey="count" range={[40, 160]} />
                              <Tooltip 
                                 contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px', fontSize: '10px' }}
                                 cursor={{ strokeDasharray: '3 3' }}
                                 formatter={(value, name) => {
                                    if (name === 'Volume') return [`${value} chamados`, 'Volume'];
                                    if (name === 'TMA') return [`${value} min`, 'Tempo Médio'];
                                    return [value, name];
                                 }}
                              />
                              <ReferenceLine x={scatterStats.avgCount} stroke="rgba(255,255,255,0.15)" strokeDasharray="5 5" label={{ value: 'Média Vol.', position: 'top', fill: 'var(--text-dim)', fontSize: 9 }} />
                              <ReferenceLine y={scatterStats.avgTime} stroke="rgba(255,255,255,0.15)" strokeDasharray="5 5" label={{ value: 'Média TMA', position: 'right', fill: 'var(--text-dim)', fontSize: 9 }} />
                              <Scatter name="Usuários" data={userRanking} fill="var(--brand-orange)">
                                 {userRanking.map((entry, index) => {
                                    const colors = ['#DA0D17', '#DA5513', '#4F7043', '#265D7C', '#F29C94', '#56331B', '#b45309', '#15803d', '#1e3a8a'];
                                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                                 })}
                              </Scatter>
                           </ScatterChart>
                        </ResponsiveContainer>
                     </div>

                     {/* Bottom Grid: Sector TreeMap & Last Ticket Opened Ticker */}
                     <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.2rem', marginTop: '1.2rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.2rem' }}>
                        {/* Section 1: Department TreeMap */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                           <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                              <TrendingUp size={12} color="var(--brand-red)" /> Setores Mais Ativos
                           </div>
                           <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', height: '110px', alignContent: 'flex-start' }}>
                              {topDepartments.map((dept, idx) => {
                                 const widthPct = idx === 0 ? '52%' : idx === 1 ? '42%' : idx === 2 ? '47%' : idx === 3 ? '47%' : '95%';
                                 const colors = [
                                    'rgba(218, 13, 23, 0.15)', // red
                                    'rgba(218, 85, 19, 0.12)',  // orange
                                    'rgba(79, 112, 67, 0.12)',  // green
                                    'rgba(38, 93, 124, 0.12)',  // blue
                                    'rgba(86, 51, 27, 0.12)'    // brown
                                 ];
                                 const borderColors = ['#DA0D17', '#DA5513', '#4F7043', '#265D7C', '#56331B'];
                                 return (
                                    <div key={idx} style={{ 
                                       flex: `1 1 ${widthPct}`, 
                                       background: colors[idx % colors.length], 
                                       border: `1px solid ${borderColors[idx % borderColors.length]}`,
                                       borderRadius: '6px', 
                                       padding: '0.3rem 0.5rem', 
                                       display: 'flex', 
                                       flexDirection: 'column', 
                                       justifyContent: 'center',
                                       height: '42px',
                                       boxSizing: 'border-box',
                                       cursor: 'pointer'
                                    }}>
                                       <span style={{ fontSize: '0.55rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dept.name}</span>
                                       <span style={{ fontSize: '0.8rem', fontWeight: 900, color: 'white', marginTop: '1px' }}>{dept.count} <span style={{ fontSize: '0.55rem', fontWeight: 400, color: 'var(--text-dim)' }}>chamados</span></span>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>

                        {/* Section 2: Last Ticket Opened */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                           <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', textTransform: 'uppercase', fontSize: '0.7rem' }}>
                              <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-green)', display: 'inline-block' }}></span> 
                              Último Chamado Aberto
                           </div>
                           {latestTicket ? (
                              <div style={{ 
                                 background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)', 
                                 border: '1px solid rgba(255,255,255,0.05)', 
                                 borderRadius: '8px', 
                                 padding: '0.6rem 0.8rem', 
                                 height: '110px', 
                                 display: 'flex', 
                                 flexDirection: 'column', 
                                 justifyContent: 'space-between',
                                 boxSizing: 'border-box',
                                 position: 'relative',
                                 overflow: 'hidden'
                              }}>
                                 {/* Live pulsing accent border */}
                                 <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: '3px', background: 'var(--brand-green)' }}></div>
                                 
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--brand-green)', fontFamily: 'JetBrains Mono, monospace' }}>#{latestTicket.id}</span>
                                    <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 700 }}>AGORA</span>
                                 </div>
                                 <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>{latestTicket.user}</div>
                                 <div style={{ fontSize: '0.6rem', color: 'var(--text-dim)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{latestTicket.company}</div>
                                 
                                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                    <span style={{ fontSize: '0.55rem', color: 'var(--text-dim)' }}>Atend.: <strong style={{ color: 'white' }}>{latestTicket.agent || 'Sem Atendente'}</strong></span>
                                    <span style={{ fontSize: '0.55rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', padding: '1px 4px', borderRadius: '4px', fontWeight: 700 }}>{latestTicket.status}</span>
                                 </div>
                              </div>
                           ) : (
                              <div style={{ color: 'var(--text-dim)', fontSize: '0.75rem', textAlign: 'center', paddingTop: '2rem' }}>Nenhum chamado ativo</div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>
            </section>
          </div>
          )}
          {(isTvMode && tvSlideIndex === 5) && (
            <div className="tv-slide animate-fade" style={{ transform: `translate(-50%, -50%) scale(${tvScale})` }}>
               <ServiceMonitorView />
            </div>
          )}
          </>

        ) : activeTab === 'acronis' ? (
           <AcronisMonitoringView />
        ) : activeTab === 'forecast' ? (

          <div className="forecast-view-container animate-fade" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                  PREVISÃO DE <span style={{ color: 'var(--brand-orange)' }}>DEMANDA</span>
                </h2>
                <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>AI Analytics — Projeções baseadas em histórico sazonal e fluxo operacional</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ background: 'rgba(218, 85, 19, 0.1)', border: '1px solid var(--brand-orange)', color: 'var(--brand-orange)', padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>
                  IA OPERACIONAL ATIVA
                </div>
              </div>
            </div>

            {/* Insights Cards */}
            <div className="feature-grid">
              <div className="card" style={{ borderLeft: '4px solid var(--brand-orange)', background: 'linear-gradient(145deg, var(--bg-card), rgba(218, 85, 19, 0.05))' }}>
                <div className="card-label">
                  <Activity size={14} color="var(--brand-orange)" /> CARGA ESPERADA
                </div>
                <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.5rem' }}>
                  Alta demanda amanhã das <span style={{ color: 'var(--brand-orange)' }}>{forecastStats.insights.peakWindow}</span>
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '0.4rem' }}>
                  Foco principal: {forecastStats.insights.criticalSector}
                </div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid var(--brand-green)', background: 'linear-gradient(145deg, var(--bg-card), rgba(79, 112, 67, 0.05))' }}>
                <div className="card-label">
                  <Users size={14} color="var(--brand-green)" /> NECESSIDADE DE ESCALA
                </div>
                <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.5rem' }}>
                  Recomendado: <span style={{ color: 'var(--brand-green)' }}>{forecastStats.insights.staffNeeded} técnicos ativos</span>
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '0.4rem' }}>
                  Para manter SLA abaixo de 20min
                </div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid var(--brand-blue)', background: 'linear-gradient(145deg, var(--bg-card), rgba(38, 93, 124, 0.05))' }}>
                <div className="card-label">
                  <Zap size={14} color="var(--brand-blue)" /> CONFIANÇA DO MODELO
                </div>
                <div className="card-value" style={{ fontSize: '1.5rem', color: 'var(--brand-blue)' }}>92%</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem' }}>Sazonalidade recalculada hoje</div>
              </div>

              <div className="card" style={{ borderLeft: '4px solid var(--brand-red)', background: 'linear-gradient(145deg, var(--bg-card), rgba(218, 13, 23, 0.05))' }}>
                <div className="card-label">
                  <AlertTriangle size={14} color="var(--brand-red)" /> RISCO DE OVERFLOW
                </div>
                <div style={{ color: 'white', fontSize: '0.9rem', fontWeight: 600, marginTop: '0.5rem' }}>
                  Nível de Risco: <span style={{ color: 'var(--brand-red)' }}>Baixo</span>
                </div>
                <div style={{ color: 'var(--text-dim)', fontSize: '0.7rem', marginTop: '0.4rem' }}>
                  Fluxo estabilizado em 15 chamados/dia
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="equal-col-grid" style={{ height: '400px' }}>
              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <TrendingUp size={16} color="var(--brand-orange)" /> Tendência Semanal (Real vs Projeção)
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={forecastStats.weeklyTrend}>
                    <defs>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--brand-orange)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--brand-orange)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={10} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--text-dim)" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: '8px', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="real" stroke="var(--brand-red)" strokeWidth={3} fill="transparent" />
                    <Area type="monotone" dataKey="forecast" stroke="var(--brand-orange)" strokeWidth={3} strokeDasharray="5 5" fill="url(#colorForecast)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                <div className="card-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                  <Clock size={16} color="var(--brand-red)" /> Heatmap de Antecipação (Amanhã)
                </div>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '4px' }}>
                  {forecastStats.tomorrowHeat.map((h, i) => (
                    <div key={i} style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center', 
                      gap: '4px' 
                    }}>
                      <div style={{ 
                        width: '100%', 
                        height: '100px', 
                        background: getHeatColor(h.count, 10), 
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        position: 'relative'
                      }}>
                        <div style={{ 
                          position: 'absolute', 
                          bottom: 0, 
                          left: 0, 
                          width: '100%', 
                          height: `${Math.min(100, (h.count/10)*100)}%`,
                          background: 'rgba(255,255,255,0.05)'
                        }}></div>
                      </div>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)' }}>{h.hour}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    <div style={{ width: 8, height: 8, background: 'rgba(79, 112, 67, 0.4)', borderRadius: '2px' }}></div> Baixo
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    <div style={{ width: 8, height: 8, background: 'rgba(218, 85, 19, 0.6)', borderRadius: '2px' }}></div> Médio
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    <div style={{ width: 8, height: 8, background: 'rgba(218, 13, 23, 0.9)', borderRadius: '2px' }}></div> Pico
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeTab === 'noc' ? (
          <NocLojasView />
        ) : activeTab === 'monitor' ? (
          <ServiceMonitorView />
        ) : (
          <div className="base-view-container animate-fade" style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                   <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>VISUALIZAÇÃO DE BASE</h2>
                    <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>Acesso espelhado aos dados brutos da API (Otimizado com Paginação)</p>
                   </div>
                   <div style={{ position: 'relative', width: '300px' }}>
                    <input 
                      type="text" 
                      placeholder="Pesquisar na base..." 
                      value={baseSearch}
                      onChange={(e) => { setBaseSearch(e.target.value); setBasePage(1); }}
                      style={{ 
                        width: '100%', 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid var(--border-dim)', 
                        borderRadius: '8px', 
                        padding: '0.6rem 1rem 0.6rem 2.2rem', 
                        fontSize: '0.85rem', 
                        color: 'white', 
                        outline: 'none' 
                      }}
                    />
                    <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)' }} />
                   </div>
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
                            <th>Espera</th>
                            <th>Total</th>
                            <th>CSAT</th>
                          </tr>
                          {/* Filter Row */}
                          <tr className="filter-row">
                             <th style={{ padding: '0.4rem' }}>
                               <input type="text" placeholder="ID..." value={baseFilters.id} onChange={(e) => { setBaseFilters({...baseFilters, id: e.target.value}); setBasePage(1); }} className="header-filter" />
                             </th>
                             <th></th>
                             <th style={{ padding: '0.4rem' }}>
                               <input type="text" placeholder="Filtrar Agente..." value={baseFilters.agent} onChange={(e) => { setBaseFilters({...baseFilters, agent: e.target.value}); setBasePage(1); }} className="header-filter" />
                             </th>
                             <th style={{ padding: '0.4rem' }}>
                               <input type="text" placeholder="Filtrar Usuário..." value={baseFilters.user} onChange={(e) => { setBaseFilters({...baseFilters, user: e.target.value}); setBasePage(1); }} className="header-filter" />
                             </th>
                             <th style={{ padding: '0.4rem' }}>
                               <input type="text" placeholder="Filtrar Setor..." value={baseFilters.sector} onChange={(e) => { setBaseFilters({...baseFilters, sector: e.target.value}); setBasePage(1); }} className="header-filter" />
                             </th>
                             <th style={{ padding: '0.4rem' }}>
                               <input type="text" placeholder="Filtrar Empresa..." value={baseFilters.company} onChange={(e) => { setBaseFilters({...baseFilters, company: e.target.value}); setBasePage(1); }} className="header-filter" />
                             </th>
                             <th></th>
                             <th></th>
                             <th></th>
                          </tr>
                       </thead>
                       <tbody>
                          {(() => {
                            const filtered = rawData.tickets.filter(t => {
                              const matchesSearch = !baseSearch || (
                                t.id.toString().includes(baseSearch) ||
                                t.agent.toLowerCase().includes(baseSearch.toLowerCase()) ||
                                t.user.toLowerCase().includes(baseSearch.toLowerCase()) ||
                                t.company.toLowerCase().includes(baseSearch.toLowerCase()) ||
                                t.sector.toLowerCase().includes(baseSearch.toLowerCase())
                              );
                              
                              const matchesFilters = 
                                (!baseFilters.id || t.id.toString().includes(baseFilters.id)) &&
                                (!baseFilters.agent || t.agent.toLowerCase().includes(baseFilters.agent.toLowerCase())) &&
                                (!baseFilters.user || t.user.toLowerCase().includes(baseFilters.user.toLowerCase())) &&
                                (!baseFilters.sector || t.sector.toLowerCase().includes(baseFilters.sector.toLowerCase())) &&
                                (!baseFilters.company || t.company.toLowerCase().includes(baseFilters.company.toLowerCase()));
                                
                              return matchesSearch && matchesFilters;
                            });

                            
                            const totalPages = Math.ceil(filtered.length / itemsPerPage);
                            const startIdx = (basePage - 1) * itemsPerPage;
                            const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);
                            
                            return (
                              <>
                                {paginated.map((t, i) => (
                                  <tr key={t.id || i}>
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
                                {filtered.length === 0 && (
                                  <tr>
                                    <td colSpan="9" style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                                      Nenhum registro encontrado para "{baseSearch}"
                                    </td>
                                  </tr>
                                )}
                              </>
                            );
                          })()}
                       </tbody>
                   </table>
                 </div>
                 
                 {/* Pagination Footer */}
                 <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-dim)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Exibindo <strong>{Math.min(itemsPerPage, rawData.tickets.filter(t => t.id.toString().includes(baseSearch) || t.agent.toLowerCase().includes(baseSearch.toLowerCase()) || t.user.toLowerCase().includes(baseSearch.toLowerCase()) || t.company.toLowerCase().includes(baseSearch.toLowerCase()) || t.sector.toLowerCase().includes(baseSearch.toLowerCase())).length)}</strong> de <strong>{rawData.tickets.filter(t => t.id.toString().includes(baseSearch) || t.agent.toLowerCase().includes(baseSearch.toLowerCase()) || t.user.toLowerCase().includes(baseSearch.toLowerCase()) || t.company.toLowerCase().includes(baseSearch.toLowerCase()) || t.sector.toLowerCase().includes(baseSearch.toLowerCase())).length}</strong> registros
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                       <button 
                         onClick={() => setBasePage(p => Math.max(1, p - 1))}
                         disabled={basePage === 1}
                         style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: basePage === 1 ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
                       >
                         Anterior
                       </button>
                       <span style={{ fontSize: '0.75rem', color: 'white', fontWeight: 700 }}>Página {basePage}</span>
                       <button 
                         onClick={() => setBasePage(p => p + 1)}
                         disabled={basePage * itemsPerPage >= rawData.tickets.filter(t => t.id.toString().includes(baseSearch) || t.agent.toLowerCase().includes(baseSearch.toLowerCase()) || t.user.toLowerCase().includes(baseSearch.toLowerCase()) || t.company.toLowerCase().includes(baseSearch.toLowerCase()) || t.sector.toLowerCase().includes(baseSearch.toLowerCase())).length}
                         style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-dim)', color: 'white', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: (basePage * itemsPerPage >= rawData.tickets.filter(t => t.id.toString().includes(baseSearch) || t.agent.toLowerCase().includes(baseSearch.toLowerCase()) || t.user.toLowerCase().includes(baseSearch.toLowerCase()) || t.company.toLowerCase().includes(baseSearch.toLowerCase()) || t.sector.toLowerCase().includes(baseSearch.toLowerCase())).length) ? 'not-allowed' : 'pointer', fontSize: '0.75rem' }}
                       >
                         Próxima
                       </button>
                    </div>
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
                           <Bar dataKey="count" fill="#06b6d4" radius={[0, 4, 4, 0]}>
                              <LabelList dataKey="count" position="right" fill="var(--text-dim)" fontSize={9} fontWeight={700} />
                           </Bar>
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
                           <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={3} fill="url(#colorHistory)" dot={{ r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: 'var(--bg-card)' }}>
                              <LabelList dataKey="count" position="top" fill="#8b5cf6" fontSize={9} fontWeight={700} />
                           </Area>
                        </AreaChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      
      {/* TV MODE INTERACTIVE NAVIGATION */}
      {isTvMode && (
        <div 
          className="tv-navigation" 
          style={{ 
            position: 'fixed', 
            bottom: '2.5rem', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            display: 'flex', 
            alignItems: 'center',
            gap: '1.2rem', 
            zIndex: 10000,
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(10px)',
            padding: '10px 25px',
            borderRadius: '50px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}
        >
          {[
            { id: 0, label: 'EM TEMPO REAL' },
            { id: 1, label: 'KPIS GERAIS' },
            { id: 2, label: 'VOLUME' },
            { id: 3, label: 'SATISFAÇÃO' },
            { id: 4, label: 'USUÁRIOS' },
            { id: 5, label: 'SISTEMAS' }
          ].map(slide => (
            <button
              key={slide.id}
              onClick={(e) => {
                e.stopPropagation();
                setTvSlideIndex(slide.id);
              }}
              style={{
                background: tvSlideIndex === slide.id ? 'var(--brand-red)' : 'transparent',
                border: 'none',
                color: tvSlideIndex === slide.id ? 'white' : 'rgba(255,255,255,0.4)',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '0.65rem',
                fontWeight: 800,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap'
              }}
            >
              {slide.label}
            </button>
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