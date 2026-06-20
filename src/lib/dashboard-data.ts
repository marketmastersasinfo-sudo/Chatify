import { supabase } from './supabase';

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  country: string;
  storeId: string;
}

export async function fetchDashboardData(filters: DashboardFilters, allowedStoreIds: string[]) {
  if (!allowedStoreIds || allowedStoreIds.length === 0) return [];

  let query = supabase.from('leads').select('*, stores!inner(country)');

  if (filters.storeId && filters.storeId !== 'all') {
    if (allowedStoreIds.includes(filters.storeId)) {
      query = query.eq('store_id', filters.storeId);
    } else {
      return [];
    }
  } else {
    query = query.in('store_id', allowedStoreIds);
  }

  if (filters.country && filters.country !== 'all') {
    query = query.eq('stores.country', filters.country);
  }

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

// ══════════════════════════════════════
// 1. VENTAS WHATSAPP (Inbound)
// ══════════════════════════════════════
export function processSalesWaFunnels(leads: any[]) {
  const salesLeads = leads.filter(l => l.board_type === 'sales_wa');

  const incoming = salesLeads.length;
  const interaction = salesLeads.filter(l => 
    !['nuevo', 'cold_lead'].includes(l.status)
  ).length;
  const dataCollected = salesLeads.filter(l => 
    ['verifying_address', 'address_confirming', 'confirmado', 'recovered', 'despachado', 'entregado'].includes(l.status)
  ).length;
  const confirmed = salesLeads.filter(l => 
    ['confirmado', 'recovered', 'despachado', 'entregado'].includes(l.status)
  ).length;

  const revenue = salesLeads
    .filter(l => ['confirmado', 'recovered', 'despachado', 'entregado'].includes(l.status))
    .reduce((sum, l) => sum + (l.total_price || 0), 0);

  return {
    kpis: { incoming, interaction, dataCollected, confirmed, revenue },
    funnel: [
      { stage: "1. Leads Entrantes", count: incoming, percentage: 100, colorHex: "#3b82f6", color: "text-blue-700", bg: "bg-blue-50" },
      { stage: "2. Interacción IA", count: interaction, percentage: incoming > 0 ? Math.round((interaction/incoming)*100) : 0, colorHex: "#6366f1", color: "text-indigo-700", bg: "bg-indigo-50", dropoffAnalysis: "Fricción Inicial: El cliente no respondió o ignoró al bot." },
      { stage: "3. Datos Recolectados", count: dataCollected, percentage: incoming > 0 ? Math.round((dataCollected/incoming)*100) : 0, colorHex: "#a855f7", color: "text-purple-700", bg: "bg-purple-50", dropoffAnalysis: "Fricción de Datos: El cliente no compartió su dirección o datos." },
      { stage: "4. Pedidos Confirmados", count: confirmed, percentage: incoming > 0 ? Math.round((confirmed/incoming)*100) : 0, colorHex: "#22c55e", color: "text-green-700", bg: "bg-green-50", dropoffAnalysis: "Fricción de Cierre: Dieron datos pero no confirmaron." }
    ]
  };
}

// ══════════════════════════════════════
// 2. CARRITOS ABANDONADOS (Recuperación)
// ══════════════════════════════════════
export function processRemarketingFunnels(leads: any[]) {
  const remarketingLeads = leads.filter(l => (l.board_type || '').includes('remarketing_cart'));

  const detected = remarketingLeads.length;
  
  const sentTemplates = remarketingLeads.filter(l => 
    ['bot_sent', 'client_replied', 'verifying_address', 'recovered', 'lost'].includes(l.status) ||
    (l.recovery_touch && l.recovery_touch > 0)
  ).length;

  const replies = remarketingLeads.filter(l => 
    ['client_replied', 'verifying_address', 'recovered'].includes(l.status)
  ).length;

  const recovered = remarketingLeads.filter(l => l.status === 'recovered').length;

  const revenue = remarketingLeads
    .filter(l => l.status === 'recovered')
    .reduce((sum, l) => sum + (l.total_price || 0), 0);

  return {
    kpis: { detected, sentTemplates, replies, recovered, revenue },
    funnel: [
      { stage: "1. Carritos Detectados", count: detected, percentage: 100, colorHex: "#3b82f6", color: "text-blue-700", bg: "bg-blue-50" },
      { stage: "2. Plantillas Enviadas", count: sentTemplates, percentage: detected > 0 ? Math.round((sentTemplates / detected) * 100) : 0, colorHex: "#6366f1", color: "text-indigo-700", bg: "bg-indigo-50", dropoffAnalysis: "Fallos de Envío: Número inválido o sin WhatsApp." },
      { stage: "3. Respuestas al Bot", count: replies, percentage: detected > 0 ? Math.round((replies / detected) * 100) : 0, colorHex: "#a855f7", color: "text-purple-700", bg: "bg-purple-50", dropoffAnalysis: "Ignorados: El mensaje llegó pero no les interesó." },
      { stage: "4. Carritos Recuperados", count: recovered, percentage: detected > 0 ? Math.round((recovered / detected) * 100) : 0, colorHex: "#22c55e", color: "text-green-700", bg: "bg-green-50", dropoffAnalysis: "Fricción Final: Respondieron pero no compraron." }
    ]
  };
}

// ══════════════════════════════════════
// 3. REMARKETING ACTIVO (WhatsApp outbound)
// ══════════════════════════════════════
export function processRemarketingWaFunnels(leads: any[]) {
  // remarketing_wa or remarketing (not remarketing_carts)
  const rmLeads = leads.filter(l => l.board_type === 'remarketing' || l.board_type === 'remarketing_wa');

  const total = rmLeads.length;
  const contacted = rmLeads.filter(l => !['cold_lead', 'nuevo'].includes(l.status)).length;
  const engaged = rmLeads.filter(l => ['client_replied', 'verifying_address', 'recovered', 'warm'].includes(l.status)).length;
  const converted = rmLeads.filter(l => ['recovered', 'confirmado'].includes(l.status)).length;

  const revenue = rmLeads
    .filter(l => ['recovered', 'confirmado'].includes(l.status))
    .reduce((sum, l) => sum + (l.total_price || 0), 0);

  return {
    kpis: { total, contacted, engaged, converted, revenue },
    funnel: [
      { stage: "1. Base de Leads", count: total, percentage: 100, colorHex: "#f59e0b", color: "text-amber-700", bg: "bg-amber-50" },
      { stage: "2. Contactados", count: contacted, percentage: total > 0 ? Math.round((contacted/total)*100) : 0, colorHex: "#f97316", color: "text-orange-700", bg: "bg-orange-50", dropoffAnalysis: "No Contactados: El mensaje no fue enviado o falló." },
      { stage: "3. Enganchados", count: engaged, percentage: total > 0 ? Math.round((engaged/total)*100) : 0, colorHex: "#ef4444", color: "text-red-700", bg: "bg-red-50", dropoffAnalysis: "Sin Respuesta: Leyeron pero no respondieron." },
      { stage: "4. Convertidos", count: converted, percentage: total > 0 ? Math.round((converted/total)*100) : 0, colorHex: "#22c55e", color: "text-green-700", bg: "bg-green-50", dropoffAnalysis: "Fricción de Cierre: Interactuaron pero no compraron." }
    ]
  };
}

// ══════════════════════════════════════
// 5. CONFIRMACIÓN DE PEDIDOS (Logística)
// ══════════════════════════════════════
export function processLogisticsFunnels(leads: any[]) {
  const logLeads = leads.filter(l => l.board_type === 'logistics');

  const total = logLeads.length;
  const contacted = logLeads.filter(l => !['nuevo'].includes(l.status) || (l.recovery_touch && l.recovery_touch > 0)).length;
  const addressVerified = logLeads.filter(l => 
    ['address_confirming', 'confirmado', 'despachado', 'entregado'].includes(l.status)
  ).length;
  const confirmed = logLeads.filter(l => 
    ['confirmado', 'despachado', 'entregado'].includes(l.status)
  ).length;

  const revenue = logLeads
    .filter(l => ['confirmado', 'despachado', 'entregado'].includes(l.status))
    .reduce((sum, l) => sum + (l.total_price || 0), 0);

  return {
    kpis: { total, contacted, addressVerified, confirmed, revenue },
    funnel: [
      { stage: "1. Pedidos Recibidos", count: total, percentage: 100, colorHex: "#8b5cf6", color: "text-violet-700", bg: "bg-violet-50" },
      { stage: "2. Contactados", count: contacted, percentage: total > 0 ? Math.round((contacted/total)*100) : 0, colorHex: "#6366f1", color: "text-indigo-700", bg: "bg-indigo-50", dropoffAnalysis: "Sin Respuesta: No contestaron la llamada o template de confirmación." },
      { stage: "3. Dirección Verificada", count: addressVerified, percentage: total > 0 ? Math.round((addressVerified/total)*100) : 0, colorHex: "#3b82f6", color: "text-blue-700", bg: "bg-blue-50", dropoffAnalysis: "Sin Dirección: Contestaron pero no confirmaron la dirección de entrega." },
      { stage: "4. Confirmados", count: confirmed, percentage: total > 0 ? Math.round((confirmed/total)*100) : 0, colorHex: "#22c55e", color: "text-green-700", bg: "bg-green-50", dropoffAnalysis: "Cancelados: Verificaron dirección pero cancelaron el pedido." }
    ]
  };
}

// ══════════════════════════════════════
// 6. REDES SOCIALES
// ══════════════════════════════════════
export function processSocialFunnels(leads: any[]) {
  const socialLeads = leads.filter(l => l.board_type === 'social_media' || l.board_type === 'sales_social');

  const total = socialLeads.length;
  const engaged = socialLeads.filter(l => !['nuevo', 'cold_lead'].includes(l.status)).length;
  const interested = socialLeads.filter(l => 
    ['client_replied', 'verifying_address', 'recovered', 'confirmado', 'warm'].includes(l.status)
  ).length;
  const converted = socialLeads.filter(l => 
    ['recovered', 'confirmado'].includes(l.status)
  ).length;

  const revenue = socialLeads
    .filter(l => ['recovered', 'confirmado'].includes(l.status))
    .reduce((sum, l) => sum + (l.total_price || 0), 0);

  return {
    kpis: { total, engaged, interested, converted, revenue },
    funnel: [
      { stage: "1. Leads Sociales", count: total, percentage: 100, colorHex: "#ec4899", color: "text-pink-700", bg: "bg-pink-50" },
      { stage: "2. Enganchados", count: engaged, percentage: total > 0 ? Math.round((engaged/total)*100) : 0, colorHex: "#f43f5e", color: "text-rose-700", bg: "bg-rose-50", dropoffAnalysis: "Sin Interacción: Escribieron en redes pero no siguieron conversando." },
      { stage: "3. Interesados", count: interested, percentage: total > 0 ? Math.round((interested/total)*100) : 0, colorHex: "#a855f7", color: "text-purple-700", bg: "bg-purple-50", dropoffAnalysis: "Perdida de Interés: Mostraron interés pero no quisieron comprar." },
      { stage: "4. Convertidos", count: converted, percentage: total > 0 ? Math.round((converted/total)*100) : 0, colorHex: "#22c55e", color: "text-green-700", bg: "bg-green-50", dropoffAnalysis: "Fricción de Cierre: Interesados que no concretaron la compra." }
    ]
  };
}

// ══════════════════════════════════════
// GLOBAL: Calcular métricas IA
// ══════════════════════════════════════
export function processAIMetrics(leads: any[]) {
  // Leads cerrados por el bot (no tuvieron intervención humana)
  const confirmedLeads = leads.filter(l => ['recovered', 'confirmado', 'despachado', 'entregado'].includes(l.status));
  const total = confirmedLeads.length;
  if (total === 0) return { aiPercent: 0, humanPercent: 0, totalClosed: 0 };

  // Un lead fue cerrado con intervención humana si tiene algún mensaje de tipo 'human'
  const humanIntervened = confirmedLeads.filter(l => l.has_human_intervention).length;
  const aiOnly = total - humanIntervened;

  return {
    aiPercent: total > 0 ? Math.round((aiOnly / total) * 100) : 0,
    humanPercent: total > 0 ? Math.round((humanIntervened / total) * 100) : 0,
    totalClosed: total
  };
}

// ══════════════════════════════════════
// ADVANCED INSIGHTS (JOYAS OCULTAS)
// ══════════════════════════════════════

export function processAdvancedInsights(leads: any[]) {
  // 1. HEATMAP (Día vs Hora)
  const heatmapData = Array(7).fill(0).map(() => Array(24).fill(0));
  const confirmedLeads = leads.filter(l => ['confirmado', 'recovered', 'despachado', 'entregado'].includes(l.status));
  
  confirmedLeads.forEach(l => {
    if (l.created_at) {
      const d = new Date(l.created_at);
      // getDay: 0=Sun, 1=Mon... we'll map 0=Sun
      heatmapData[d.getDay()][d.getHours()]++;
    }
  });

  // 2. CALIDAD DE TRÁFICO
  const trafficMap = new Map<string, { total: number, converted: number, revenue: number }>();
  leads.forEach(l => {
    const source = l.traffic_source || 'Desconocido/Orgánico';
    const isConverted = ['confirmado', 'recovered', 'despachado', 'entregado'].includes(l.status);
    
    if (!trafficMap.has(source)) {
      trafficMap.set(source, { total: 0, converted: 0, revenue: 0 });
    }
    const data = trafficMap.get(source)!;
    data.total++;
    if (isConverted) {
      data.converted++;
      data.revenue += (l.total_price || 0);
    }
  });
  const trafficQuality = Array.from(trafficMap.entries()).map(([source, data]) => ({
    source,
    ...data,
    conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0
  })).sort((a, b) => b.revenue - a.revenue);

  // 3. RETENCIÓN Y LTV (Basado en phone)
  const phoneMap = new Map<string, number>();
  confirmedLeads.forEach(l => {
    if (l.phone) {
      phoneMap.set(l.phone, (phoneMap.get(l.phone) || 0) + 1);
    }
  });
  
  let repeatCustomers = 0;
  let singleCustomers = 0;
  phoneMap.forEach(count => {
    if (count > 1) repeatCustomers++;
    else singleCustomers++;
  });
  
  const totalUniqueCustomers = repeatCustomers + singleCustomers;
  const retentionRate = totalUniqueCustomers > 0 ? (repeatCustomers / totalUniqueCustomers) * 100 : 0;

  // Helper para agrupar productos similares (Ignora variantes y prefijos)
  const normalizeProductName = (name: string) => {
    if (!name) return 'Producto Desconocido';
    let n = name.replace(/\([^)]+\)/g, ''); // Remueve variantes entre paréntesis
    n = n.replace(/^(oferta|promo|promoción|descuento|combo|liquidación)\s*[:-]?\s*/i, ''); // Remueve prefijos comunes
    n = n.replace(/^[\.,'"]+/, ''); // Remueve puntuación basura al inicio (como ',' o '.')
    n = n.trim();
    // Capitalize first letter
    return n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
  };

  // 4. FRICCIÓN POR PRODUCTO
  const productMap = new Map<string, { total: number, abandoned: number }>();
  leads.forEach(l => {
    if (l.product_name) {
      const isLost = ['lost', 'cold_lead'].includes(l.status);
      const normalizedName = normalizeProductName(l.product_name);
      
      if (!productMap.has(normalizedName)) {
        productMap.set(normalizedName, { total: 0, abandoned: 0 });
      }
      const data = productMap.get(normalizedName)!;
      data.total++;
      if (isLost) data.abandoned++;
    }
  });
  const productFriction = Array.from(productMap.entries())
    .map(([name, data]) => ({
      name,
      ...data,
      dropoffRate: data.total > 0 ? (data.abandoned / data.total) * 100 : 0
    }))
    .filter(p => p.name !== 'Producto desconocido' && p.name !== '' && p.total > 0)
    .sort((a, b) => b.total - a.total); // Sort by volume initially

  // 6. GEOREFERENCIACIÓN (Demografía de Interés)
  const cityMap = new Map<string, { total: number, converted: number, revenue: number }>();
  leads.forEach(l => {
    // Si no hay ciudad, es Fricción Inicial
    const city = l.city ? l.city.trim().toUpperCase() : 'DESCONOCIDA (Fricción Inicial)';
    const isConverted = ['confirmado', 'recovered', 'despachado', 'entregado'].includes(l.status);
    
    if (!cityMap.has(city)) {
      cityMap.set(city, { total: 0, converted: 0, revenue: 0 });
    }
    const data = cityMap.get(city)!;
    data.total++;
    if (isConverted) {
      data.converted++;
      data.revenue += (l.total_price || 0);
    }
  });
  
  const geoDemographics = Array.from(cityMap.entries())
    .map(([city, data]) => ({
      city,
      ...data,
      conversionRate: data.total > 0 ? (data.converted / data.total) * 100 : 0
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 15);

  return {
    heatmapData,
    trafficQuality,
    retention: { repeatCustomers, totalUniqueCustomers, retentionRate },
    productFriction,
    geoDemographics
  };
}
