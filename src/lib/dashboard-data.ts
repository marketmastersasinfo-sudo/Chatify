import { supabase } from './supabase';

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  country: string;
  storeId: string;
}

export async function fetchDashboardData(filters: DashboardFilters, allowedStoreIds: string[]) {
  // If user has no store access, return empty
  if (!allowedStoreIds || allowedStoreIds.length === 0) return [];

  let query = supabase.from('leads').select('*, stores!inner(country)');

  // Filter by allowed stores
  if (filters.storeId && filters.storeId !== 'all') {
    if (allowedStoreIds.includes(filters.storeId)) {
      query = query.eq('store_id', filters.storeId);
    } else {
      return []; // Trying to access a store they don't have access to
    }
  } else {
    query = query.in('store_id', allowedStoreIds);
  }

  // Filter by country
  if (filters.country && filters.country !== 'all') {
    query = query.eq('stores.country', filters.country);
  }

  // Filter by date
  if (filters.startDate) {
    query = query.gte('created_at', `${filters.startDate}T00:00:00.000Z`);
  }
  if (filters.endDate) {
    query = query.lte('created_at', `${filters.endDate}T23:59:59.999Z`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching dashboard data:', error);
    return [];
  }

  return data || [];
}

export function processRemarketingFunnels(leads: any[], averageTicket = 85000) {
  // Funnel:
  // 1. Carritos Detectados (Total leads)
  // 2. Plantillas Enviadas ('bot_sent', 'client_replied', 'recovered', 'lost')
  // 3. Respuestas al Bot ('client_replied', 'verifying_address', 'recovered')
  // 4. Carritos Recuperados ('recovered')

  // Filter leads to only remarketing
  const remarketingLeads = leads.filter(l => l.board_type === 'remarketing');

  const detected = remarketingLeads.length;
  
  const sentTemplates = remarketingLeads.filter(l => 
    ['bot_sent', 'client_replied', 'recovered', 'lost'].includes(l.status)
  ).length;

  const replies = remarketingLeads.filter(l => 
    ['client_replied', 'verifying_address', 'recovered'].includes(l.status)
  ).length;

  const recovered = remarketingLeads.filter(l => l.status === 'recovered').length;

  const revenue = recovered * averageTicket;

  return {
    kpis: {
      detected,
      sentTemplates,
      replies,
      recovered,
      revenue
    },
    funnel: [
      {
        stage: "1. Carritos Detectados",
        count: detected,
        percentage: 100,
        colorHex: "#3b82f6",
        color: "text-blue-700",
        bg: "bg-blue-50"
      },
      {
        stage: "2. Plantillas Enviadas",
        count: sentTemplates,
        percentage: detected > 0 ? Math.round((sentTemplates / detected) * 100) : 0,
        colorHex: "#6366f1",
        color: "text-indigo-700",
        bg: "bg-indigo-50",
        dropoffAnalysis: "Fallos de Envío: El número de teléfono dejado en el checkout es inválido o no tiene WhatsApp."
      },
      {
        stage: "3. Respuestas al Bot",
        count: replies,
        percentage: detected > 0 ? Math.round((replies / detected) * 100) : 0,
        colorHex: "#a855f7",
        color: "text-purple-700",
        bg: "bg-purple-50",
        dropoffAnalysis: "Ignorados: El mensaje llegó pero no les interesó."
      },
      {
        stage: "4. Carritos Recuperados",
        count: recovered,
        percentage: detected > 0 ? Math.round((recovered / detected) * 100) : 0,
        colorHex: "#22c55e",
        color: "text-green-700",
        bg: "bg-green-50",
        dropoffAnalysis: "Fricción Final: Respondieron pero no compraron."
      }
    ]
  };
}

export function processSalesWaFunnels(leads: any[], averageTicket = 85000) {
  const salesLeads = leads.filter(l => l.board_type === 'sales_wa');

  const incoming = salesLeads.length;
  const interaction = salesLeads.filter(l => ['bot_replied', 'human_escalated', 'recovered', 'lost'].includes(l.status)).length;
  const dataCollected = salesLeads.filter(l => ['verifying_address', 'recovered'].includes(l.status)).length;
  const confirmed = salesLeads.filter(l => l.status === 'recovered').length;

  return {
    kpis: {
      incoming,
      interaction,
      dataCollected,
      confirmed,
      revenue: confirmed * averageTicket
    },
    funnel: [
      { stage: "1. Leads Entrantes", count: incoming, percentage: 100, colorHex: "#3b82f6", color: "text-blue-700", bg: "bg-blue-50" },
      { stage: "2. Interacción IA", count: interaction, percentage: incoming > 0 ? Math.round((interaction/incoming)*100) : 0, colorHex: "#6366f1", color: "text-indigo-700", bg: "bg-indigo-50", dropoffAnalysis: "Fricción Inicial: El cliente ignoró el saludo de la IA." },
      { stage: "3. Datos Recolectados", count: dataCollected, percentage: incoming > 0 ? Math.round((dataCollected/incoming)*100) : 0, colorHex: "#a855f7", color: "text-purple-700", bg: "bg-purple-50", dropoffAnalysis: "Fricción de Datos: No quiso dar su dirección." },
      { stage: "4. Pedidos Confirmados", count: confirmed, percentage: incoming > 0 ? Math.round((confirmed/incoming)*100) : 0, colorHex: "#22c55e", color: "text-green-700", bg: "bg-green-50", dropoffAnalysis: "Fricción de Cierre: No confirmaron el pedido." }
    ]
  };
}
