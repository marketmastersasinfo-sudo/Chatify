import { useState, useEffect } from 'react';
import {
  ShoppingCart, MessageSquare, MessageSquareText, MapPin,
  CheckCircle2, Users, Search, Loader2, Store,
  Ban, Send, Clock, TrendingUp, DollarSign, Zap
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CrmFilters } from '../components/CrmFilters';
import type { CrmFilterState } from '../components/CrmFilters';
import { LeadChatPanel } from '../components/LeadChatPanel';
import { CountryFlag } from '../utils/flags';
import { TrafficBadge } from '../components/TrafficBadge';

// ─── Column definitions ────────────────────────────────────────────────
const columns = [
  {
    id: 'abandoned',
    title: 'Carrito Abandonado',
    icon: ShoppingCart,
    accent: '#3B82F6',
    bg: 'bg-blue-50/40',
    border: 'border-blue-200',
    headerBg: 'bg-blue-100',
    headerText: 'text-blue-800',
    tooltip: 'Acaba de abandonar el carrito — el bot aún no ha contactado.',
  },
  {
    id: 'bot_sent',
    title: 'Mensaje Enviado',
    icon: MessageSquare,
    accent: '#F97316',
    bg: 'bg-orange-50/40',
    border: 'border-orange-200',
    headerBg: 'bg-orange-100',
    headerText: 'text-orange-800',
    tooltip: 'El bot envió la plantilla de recuperación — esperando respuesta.',
  },
  {
    id: 'client_replied',
    title: 'Cliente Respondió',
    icon: MessageSquareText,
    accent: '#EAB308',
    bg: 'bg-yellow-50/40',
    border: 'border-yellow-200',
    headerBg: 'bg-yellow-100',
    headerText: 'text-yellow-800',
    tooltip: 'El cliente interactuó — Sophia está atendiendo.',
  },
  {
    id: 'verifying_address',
    title: 'Verificando Dirección',
    icon: MapPin,
    accent: '#8B5CF6',
    bg: 'bg-purple-50/40',
    border: 'border-purple-200',
    headerBg: 'bg-purple-100',
    headerText: 'text-purple-800',
    tooltip: 'Street View enviado — esperando que confirme la fachada.',
  },
  {
    id: 'recovered',
    title: 'Pedido Confirmado ✅',
    icon: CheckCircle2,
    accent: '#10B981',
    bg: 'bg-green-50/40',
    border: 'border-green-200',
    headerBg: 'bg-green-100',
    headerText: 'text-green-800',
    tooltip: 'Dirección verificada y pedido 100% confirmado.',
  },
  {
    id: 'lost',
    title: 'Base Remarketing 📢',
    icon: Users,
    accent: '#6B7280',
    bg: 'bg-gray-50/40',
    border: 'border-gray-200',
    headerBg: 'bg-gray-100',
    headerText: 'text-gray-700',
    tooltip: 'Dijeron que no — guardados para campañas de difusión masiva.',
  },
];

const TOUCH_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: 'Sin mensaje', color: 'bg-gray-100 text-gray-500' },
  1: { label: 'Toque 1 (30min)', color: 'bg-blue-100 text-blue-700' },
  2: { label: 'Toque 2 (4h)', color: 'bg-orange-100 text-orange-700' },
  3: { label: 'Toque 3 (24h)', color: 'bg-red-100 text-red-700' },
};

// ─── Component ────────────────────────────────────────────────────────
export function CrmRemarketingCarts() {
  const [filters, setFilters] = useState<CrmFilterState | null>(null);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [forcingSend, setForcingSend] = useState<string | null>(null);

  useEffect(() => {
    if (filters) loadLeads(filters);
    else setLeads([]);
  }, [filters]);

  async function loadLeads(f: CrmFilterState) {
    setLoading(true);
    try {
      let query = supabase
        .from('leads')
        .select('*, stores(name, country)')
        .eq('board_type', 'remarketing_carts')
        .order('created_at', { ascending: false });

      if (f.storeIds && f.storeIds.length > 0) query = query.in('store_id', f.storeIds);
      else if (f.storeIds && f.storeIds.length === 0)
        query = query.eq('store_id', '00000000-0000-0000-0000-000000000000');
      if (f.dateStart) query = query.gte('created_at', f.dateStart);
      if (f.dateEnd) query = query.lte('created_at', f.dateEnd);

      const { data } = await query;
      setLeads(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  // ── Force send now (manual trigger for one lead) ─────────────────────
  async function handleForceSend(lead: any) {
    if (!lead.store_id) return;
    setForcingSend(lead.id);
    try {
      const res = await fetch(`/api/cart-recovery?leadId=${lead.id}`, {
        headers: { 'x-cron-secret': '' }
      });
      if (res.ok) {
        // Refresh this lead's status
        const { data } = await supabase.from('leads').select('*, stores(name, country)').eq('id', lead.id).single();
        if (data) setLeads(prev => prev.map(l => l.id === lead.id ? data : l));
      }
    } catch (e) { console.error(e); }
    setForcingSend(null);
  }

  // ── Drag and Drop ─────────────────────────────────────────────────────
  const handleDragStart = (e: React.DragEvent, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    if (!draggedLeadId) return;
    setLeads(prev => prev.map(l => l.id === draggedLeadId ? { ...l, status: targetStatus } : l));
    await (supabase as any).from('leads').update({ status: targetStatus }).eq('id', draggedLeadId);
    setDraggedLeadId(null);
  };

  // ── Filtered leads ─────────────────────────────────────────────────────
  const filteredLeads = searchQuery.trim()
    ? leads.filter(l => {
      const q = searchQuery.toLowerCase();
      return (
        l.name?.toLowerCase().includes(q) ||
        l.phone?.includes(q) ||
        l.product_name?.toLowerCase().includes(q) ||
        l.tracking_id?.toLowerCase().includes(q)
      );
    })
    : leads;

  // ── Stats ────────────────────────────────────────────────────────────
  const totalLeads = leads.length;
  const recovered = leads.filter(l => l.status === 'recovered').length;
  const inProgress = leads.filter(l => ['bot_sent', 'client_replied', 'verifying_address'].includes(l.status)).length;
  const recoveryRate = totalLeads > 0 ? Math.round((recovered / totalLeads) * 100) : 0;
  const estimatedRevenue = leads
    .filter(l => l.status === 'recovered')
    .reduce((acc, l) => acc + (Number(l.total_price) || 0), 0);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col pb-8 relative">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-purple-600" />
              CRM — Recuperación de Carritos
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Bot automático · Street View · Base Remarketing
              <span className="ml-2 text-orange-600 font-semibold">Regla Meta: Plantilla obligatoria</span>
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar nombre, celular, producto..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 w-72"
            />
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Total Leads</p>
              <p className="text-xl font-bold text-gray-900">{totalLeads}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Tasa de Recuperación</p>
              <p className="text-xl font-bold text-gray-900">{recoveryRate}%</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Zap className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">En Proceso</p>
              <p className="text-xl font-bold text-gray-900">{inProgress}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">Ingresos Recuperados</p>
              <p className="text-xl font-bold text-gray-900">${estimatedRevenue.toLocaleString('es-CO')}</p>
            </div>
          </div>
        </div>
      </div>

      <CrmFilters onFilterChange={setFilters} />

      {/* ── Kanban Board ─────────────────────────────────────────────── */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 snap-x relative mt-4">
        {columns.map((col) => {
          const colLeads = filteredLeads.filter(l => l.status === col.id);
          return (
            <div
              key={col.id}
              className="flex-shrink-0 w-[300px] flex flex-col snap-center h-full"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.id)}
            >
              {/* Column header */}
              <div
                className={`flex items-center justify-between px-3 py-2.5 rounded-t-xl border-x border-t ${col.border} ${col.bg}`}
                title={col.tooltip}
                style={{ borderTopColor: col.accent, borderTopWidth: 3 }}
              >
                <div className="flex items-center gap-2">
                  <col.icon className="w-4 h-4" style={{ color: col.accent }} />
                  <h3 className="text-xs font-bold text-gray-700">{col.title}</h3>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${col.headerBg} ${col.headerText}`}>
                  {colLeads.length}
                </span>
              </div>

              {/* Column body */}
              <div className={`flex-1 p-2 border-x border-b rounded-b-xl ${col.border} ${col.bg} flex flex-col gap-2 overflow-y-auto pb-12`}>
                {loading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : colLeads.map(lead => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    accent={col.accent}
                    onDragStart={handleDragStart}
                    onClick={() => setSelectedLead(lead)}
                    onForceSend={handleForceSend}
                    isForcingSend={forcingSend === lead.id}
                  />
                ))}
                {!loading && colLeads.length === 0 && (
                  <div className="h-20 border-2 border-dashed border-gray-200/70 rounded-xl flex items-center justify-center text-xs font-semibold text-gray-300">
                    Vacío
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Chat Panel ────────────────────────────────────────────────── */}
      {selectedLead && (
        <LeadChatPanel
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onDelete={() => {}}
          onBan={() => {}}
          onUpdateLead={updatedLead => {
            if (updatedLead.board_type !== 'remarketing_carts') {
              setLeads(leads.filter(l => l.id !== updatedLead.id));
              setSelectedLead(null);
            } else {
              setLeads(leads.map(l => l.id === updatedLead.id ? updatedLead : l));
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Lead Card ────────────────────────────────────────────────────────
function LeadCard({
  lead, accent, onDragStart, onClick, onForceSend, isForcingSend
}: {
  lead: any;
  accent: string;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onClick: () => void;
  onForceSend: (lead: any) => void;
  isForcingSend: boolean;
}) {
  const touch = lead.recovery_touch ?? 0;
  const touchMeta = TOUCH_LABELS[touch] || TOUCH_LABELS[0];

  const timeSince = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead.id)}
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all relative overflow-hidden group"
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 w-1 h-full rounded-l-xl" style={{ backgroundColor: accent }} />

      <div className="pl-3 pr-3 pt-3 pb-2.5">
        {/* Row 1: badges */}
        <div className="flex items-center gap-1.5 flex-wrap mb-2">
          <TrafficBadge source={lead.traffic_source} />
          {lead.stores?.country && (
            <span className="leading-none"><CountryFlag country={lead.stores.country} /></span>
          )}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${touchMeta.color}`}>
            {touchMeta.label}
          </span>
          {lead.is_banned && (
            <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
              <Ban className="w-2.5 h-2.5" /> Baneado
            </span>
          )}
        </div>

        {/* Row 2: name + store */}
        <h4 className="font-bold text-gray-900 text-sm leading-tight">{lead.name || 'Sin nombre'}</h4>
        {lead.stores?.name && (
          <p className="text-[10px] font-semibold text-gray-400 mt-0.5 flex items-center gap-1 uppercase tracking-wide">
            <Store className="w-3 h-3" /> {lead.stores.name}
          </p>
        )}

        {/* Row 3: product */}
        {lead.product_name && (
          <p className="text-xs font-semibold text-purple-600 bg-purple-50 w-fit px-2 py-0.5 rounded-full mt-1.5">
            🛍️ {lead.product_name}
          </p>
        )}

        {/* Row 4: phone + price */}
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-[11px] text-gray-400">{lead.phone}</p>
          {lead.total_price && (
            <p className="text-xs font-bold text-green-600">${Number(lead.total_price).toLocaleString('es-CO')}</p>
          )}
        </div>

        {/* Row 5: last contact time */}
        {lead.recovery_last_sent_at && (
          <div className="flex items-center gap-1 mt-1.5">
            <Clock className="w-3 h-3 text-gray-300" />
            <p className="text-[10px] text-gray-400">Último msg: hace {timeSince(lead.recovery_last_sent_at)}</p>
          </div>
        )}

        {/* Row 6: actions (shown on hover for non-recovered/lost) */}
        {(lead.status === 'abandoned' || lead.status === 'bot_sent') && (
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => onForceSend(lead)}
              disabled={isForcingSend}
              className="w-full text-xs font-bold bg-purple-600 text-white py-1.5 rounded-lg flex items-center justify-center gap-1.5 hover:bg-purple-700 transition-colors"
            >
              {isForcingSend
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Enviando...</>
                : <><Send className="w-3 h-3" /> Enviar mensaje ahora</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
