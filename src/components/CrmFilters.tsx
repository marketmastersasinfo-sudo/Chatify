import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Calendar, Filter, Store, Globe } from 'lucide-react';

export interface CrmFilterState {
  storeId: string;
  storeIds: string[];
  country: string;
  dateStart: string | null;
  dateEnd: string | null;
}

interface CrmFiltersProps {
  onFilterChange: (filters: CrmFilterState) => void;
  initialStoreId?: string;
}

export function CrmFilters({ onFilterChange, initialStoreId }: CrmFiltersProps) {
  const [stores, setStores] = useState<any[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedStoreId, setSelectedStoreId] = useState<string>(initialStoreId || '');
  const [datePreset, setDatePreset] = useState<string>('all'); // all, today, yesterday, this_week, this_month, custom
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  useEffect(() => {
    loadStores();
  }, []);

  async function loadStores() {
    try {
      const { data } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
      if (data && data.length > 0) {
        setStores(data);
        
        // Extraer países únicos
        const uniqueCountries = Array.from(new Set(data.map((s: any) => s.country).filter(Boolean))).sort() as string[];
        setCountries(uniqueCountries);

        // Si no hay tienda seleccionada, dejar en "Todas" ('') por defecto
        if (!selectedStoreId) {
          setSelectedStoreId('');
          // Disparar cambio inicial
          triggerFilterChange('', '', 'all', '', '');
        }
      }
    } catch (e) {
      console.error("Error loading stores for filters:", e);
    }
  }

  // Effect para notificar al padre cuando cambian los filtros
  useEffect(() => {
    if (stores.length > 0) {
      triggerFilterChange(selectedStoreId, selectedCountry, datePreset, customStart, customEnd);
    }
  }, [selectedStoreId, selectedCountry, datePreset, customStart, customEnd]);

  const triggerFilterChange = (storeId: string, country: string, preset: string, start: string, end: string) => {
    let dateStart: string | null = null;
    let dateEnd: string | null = null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preset === 'today') {
      dateStart = today.toISOString();
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);
      dateEnd = endOfDay.toISOString();
    } else if (preset === 'yesterday') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      dateStart = yesterday.toISOString();
      
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);
      dateEnd = endOfYesterday.toISOString();
    } else if (preset === 'this_week') {
      const firstDay = new Date(today);
      const day = firstDay.getDay() || 7; // Lunes como primer día
      if (day !== 1) firstDay.setHours(-24 * (day - 1));
      dateStart = firstDay.toISOString();
    } else if (preset === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      dateStart = firstDay.toISOString();
    } else if (preset === 'custom') {
      if (start) {
        dateStart = new Date(start).toISOString();
      }
      if (end) {
        const endD = new Date(end);
        endD.setHours(23, 59, 59, 999);
        dateEnd = endD.toISOString();
      }
    }

    const filteredStores = country ? stores.filter(s => s.country === country) : stores;
    const storeIds = storeId ? [storeId] : filteredStores.map(s => s.id);

    onFilterChange({
      storeId,
      storeIds,
      country,
      dateStart,
      dateEnd
    });
  };

  const filteredStores = selectedCountry ? stores.filter(s => s.country === selectedCountry) : stores;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center z-10 relative">
      <div className="flex items-center gap-2 text-gray-500 font-medium">
        <Filter size={18} /> Filtros:
      </div>

      {/* Filtro por País */}
      <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
        <Globe size={16} className="text-gray-400" />
        <select 
          className="bg-transparent border-none text-sm font-medium text-gray-700 outline-none cursor-pointer"
          value={selectedCountry}
          onChange={(e) => {
            setSelectedCountry(e.target.value);
            setSelectedStoreId(''); // Reset store when country changes
          }}
        >
          <option value="">Todos los Países</option>
          {countries.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Filtro por Tienda */}
      <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
        <Store size={16} className="text-blue-500" />
        <select 
          className="bg-transparent border-none text-sm font-bold text-blue-700 outline-none cursor-pointer"
          value={selectedStoreId}
          onChange={(e) => setSelectedStoreId(e.target.value)}
        >
          <option value="">Todas las Tiendas {selectedCountry ? `en ${selectedCountry}` : ''}</option>
          {filteredStores.map(store => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
      </div>

      {/* Filtros Rápidos de Fecha */}
      <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-lg border border-gray-200">
        <button 
          onClick={() => setDatePreset('all')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${datePreset === 'all' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Siempre
        </button>
        <button 
          onClick={() => setDatePreset('today')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${datePreset === 'today' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Hoy
        </button>
        <button 
          onClick={() => setDatePreset('yesterday')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${datePreset === 'yesterday' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Ayer
        </button>
        <button 
          onClick={() => setDatePreset('this_week')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${datePreset === 'this_week' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Semana
        </button>
        <button 
          onClick={() => setDatePreset('this_month')}
          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${datePreset === 'this_month' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Mes
        </button>
        <button 
          onClick={() => setDatePreset('custom')}
          className={`flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-colors ${datePreset === 'custom' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Calendar size={12} /> Rango
        </button>
      </div>

      {/* Rango de Fechas Personalizado */}
      {datePreset === 'custom' && (
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-1 rounded-lg border border-gray-200">
          <input 
            type="date" 
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="bg-transparent border-none text-xs text-gray-700 outline-none"
          />
          <span className="text-gray-400 text-xs">hasta</span>
          <input 
            type="date" 
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="bg-transparent border-none text-xs text-gray-700 outline-none"
          />
        </div>
      )}
    </div>
  );
}
