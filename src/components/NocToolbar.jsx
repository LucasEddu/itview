import React from 'react';
import { Filter, Search } from 'lucide-react';
import { useNoc } from '../context/NocContext';
import { useDashboardSettings } from '../context/DashboardContext';

const NocToolbar = ({ regions }) => {
  const { filters, setFilters } = useNoc();
  const { isTvMode } = useDashboardSettings();

  if (isTvMode) return null; // Esconde a toolbar no Modo TV

  return (
    <div className="noc-toolbar relative flex items-center gap-4 bg-white/5 border border-white/10 p-3 rounded-xl mb-8 flex-wrap">
      <div className="flex items-center gap-2">
        <Filter size={16} color="var(--text-dim)" />
        <select 
          value={filters.region} 
          onChange={(e) => setFilters({...filters, region: e.target.value})}
          className="bg-black/40 border border-white/10 text-white px-3 py-2 rounded-lg text-sm outline-none"
        >
          {regions.map(r => <option key={r} value={r} className="bg-[var(--bg-dark)]">{r}</option>)}
        </select>
      </div>
      
      <label className="flex items-center gap-2 cursor-pointer text-white text-sm font-semibold">
        <input 
          type="checkbox" 
          checked={filters.onlyCritical} 
          onChange={(e) => setFilters({...filters, onlyCritical: e.target.checked})}
          className="accent-[var(--brand-red)] w-4 h-4"
        />
        Apenas Críticos
      </label>

      <div className="relative w-[250px] ml-auto">
        <input 
          type="text" 
          placeholder="Buscar loja ou PDV..." 
          value={filters.search}
          onChange={(e) => setFilters({...filters, search: e.target.value})}
          className="w-full bg-black/40 border border-white/10 text-white px-3 py-2 pl-9 rounded-lg text-sm outline-none"
        />
        <Search size={14} color="var(--text-dim)" className="absolute left-3 top-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
};

export default NocToolbar;
