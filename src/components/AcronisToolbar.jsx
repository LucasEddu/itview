import React, { useState, useRef, useEffect } from 'react';
import { Search, RotateCcw, ShieldAlert, MapPin, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDashboardSettings } from '../context/DashboardContext';

const AcronisToolbar = ({ 
  regions, 
  selectedRegion, 
  onRegionChange, 
  onlyCritical, 
  onCriticalChange, 
  searchQuery, 
  onSearchChange,
  totalResults,
  onReset 
}) => {
  const { isTvMode } = useDashboardSettings();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isTvMode) return null;

  // --- Styles (all inline for guaranteed rendering) ---
  const containerStyle = {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: '16px',
    padding: '8px 20px',
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '12px',
    border: isFocused 
      ? '1px solid rgba(220, 38, 38, 0.3)' 
      : '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: isFocused 
      ? '0 0 20px rgba(220, 38, 38, 0.08)' 
      : '0 4px 20px rgba(0, 0, 0, 0.3)',
    marginBottom: '2rem',
    transition: 'border 0.3s ease, box-shadow 0.3s ease',
    flexWrap: 'wrap',
  };

  const regionBtnStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    padding: '8px 4px',
    minWidth: '140px',
    fontSize: '0.85rem',
    fontWeight: 700,
    transition: 'color 0.2s',
  };

  const chipBaseStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '10px',
    fontWeight: 900,
    letterSpacing: '0.1em',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: onlyCritical 
      ? '1px solid rgba(220, 38, 38, 0.6)' 
      : '1px solid rgba(255, 255, 255, 0.1)',
    background: onlyCritical 
      ? 'rgba(220, 38, 38, 0.2)' 
      : 'transparent',
    color: onlyCritical 
      ? '#ef4444' 
      : 'rgba(255, 255, 255, 0.3)',
    whiteSpace: 'nowrap',
  };

  const searchWrapperStyle = {
    position: 'relative',
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    minWidth: '150px',
  };

  const searchIconStyle = {
    position: 'absolute',
    left: '12px',
    color: isFocused ? '#dc2626' : 'rgba(255, 255, 255, 0.2)',
    pointerEvents: 'none',
    transition: 'color 0.3s',
  };

  const searchInputStyle = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    color: 'white',
    paddingLeft: '40px',
    paddingRight: '16px',
    paddingTop: '8px',
    paddingBottom: '8px',
    fontSize: '0.85rem',
    fontWeight: 600,
    outline: 'none',
  };

  const resetBtnStyle = {
    marginLeft: 'auto',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: 'transparent',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.2)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    flexShrink: 0,
  };

  const dropdownMenuStyle = {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '8px',
    width: '220px',
    background: '#1a1210',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 16px 48px rgba(0, 0, 0, 0.9), 0 0 0 1px rgba(0,0,0,0.5)',
    zIndex: 200,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  };

  const dropdownItemStyle = (isActive) => ({
    padding: '10px 16px',
    fontSize: '0.75rem',
    fontWeight: 800,
    color: isActive ? '#ef4444' : 'rgba(255, 255, 255, 0.4)',
    background: isActive ? 'rgba(220, 38, 38, 0.05)' : 'transparent',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  });

  const counterStyle = {
    fontSize: '9px',
    fontWeight: 900,
    color: 'rgba(255, 255, 255, 0.1)',
    textTransform: 'uppercase',
    letterSpacing: '0.15em',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  };

  return (
    <div style={containerStyle}>
      
      {/* 1. Seletor de Regiões */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        <button 
          style={regionBtnStyle}
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
        >
          <MapPin size={16} color="#dc2626" />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedRegion === 'Todas' ? 'Regiões' : selectedRegion}
          </span>
          <ChevronDown 
            size={14} 
            style={{ 
              transition: 'transform 0.3s', 
              transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' 
            }} 
          />
        </button>

        <AnimatePresence>
          {isDropdownOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              style={dropdownMenuStyle}
            >
              <div style={{ maxHeight: '250px', overflowY: 'auto' }} className="custom-vertical-scrollbar">
                <div 
                  style={dropdownItemStyle(selectedRegion === 'Todas')}
                  onClick={() => { onRegionChange('Todas'); setIsDropdownOpen(false); }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = selectedRegion === 'Todas' ? 'rgba(220,38,38,0.05)' : 'transparent'; }}
                >
                  Todas as Regiões
                </div>
                {regions.map(r => (
                  <div 
                    key={r}
                    style={dropdownItemStyle(selectedRegion === r)}
                    onClick={() => { onRegionChange(r); setIsDropdownOpen(false); }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = selectedRegion === r ? 'rgba(220,38,38,0.05)' : 'transparent'; }}
                  >
                    {r}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Action Chip de Incidentes */}
      <button 
        style={chipBaseStyle}
        onClick={() => onCriticalChange(!onlyCritical)}
        onMouseEnter={(e) => { if (!onlyCritical) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}}
        onMouseLeave={(e) => { if (!onlyCritical) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}}
      >
        <ShieldAlert size={12} />
        INCIDENTES
      </button>

      {/* 3. Campo de Pesquisa */}
      <div style={searchWrapperStyle}>
        <Search size={16} style={searchIconStyle} />
        <input 
          type="text" 
          placeholder="Pesquisar PDV..." 
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={searchInputStyle}
        />
      </div>

      {/* Contador de Resultados */}
      {totalResults !== undefined && (
        <span style={counterStyle}>{totalResults} PDVs</span>
      )}

      {/* 4. Botão de Reset */}
      <button 
        style={resetBtnStyle}
        onClick={onReset}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)'; e.currentTarget.style.background = 'transparent'; }}
        title="Resetar filtros"
      >
        <RotateCcw size={16} />
      </button>

    </div>
  );
};

export default AcronisToolbar;
