import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

const SHOPYEASY_EXPORT_URL = 'https://shopyeasy-seven.vercel.app/api/chatify/export-abandoned?secret=chatify_sync_2026_x';

// Mapa de indicativos por país
const countryCallingCodes: Record<string, string> = {
  'Colombia': '57',
  'Perú': '51',
  'Ecuador': '593',
  'Venezuela': '58',
  'Costa Rica': '506',
  'Guatemala': '502',
  'Argentina': '54',
  'Chile': '56',
  'México': '52'
};

function formatPhone(phone: string, country: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);

  const callingCode = countryCallingCodes[country] || '57';
  if (!cleaned.startsWith(callingCode)) {
    cleaned = `${callingCode}${cleaned}`;
  }
  return cleaned;
}

/**
 * GET /api/sync-shopyeasy
 * 
 * Sincronización automática de carritos abandonados desde Shopyeasy.
 * Llamado por cron-job.org cada 5 minutos.
 * 
 * Flujo:
 * 1. Llama a la API de Shopyeasy para obtener carritos abandonados recientes
 * 2. Para cada carrito, busca la tienda correspondiente en Chatify
 * 3. Si el lead (phone + store) no existe, lo crea como carrito abandonado
 * 4. El cron de cart-recovery.ts se encarga de enviar los mensajes de recuperación
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const log: string[] = [];
  let imported = 0;
  let skippedExisting = 0;
  let skippedNoStore = 0;
  let errors = 0;

  try {
    // 1. Obtener todas las tiendas locales de Chatify
    const { data: localStores } = await supabase.from('stores').select('id, name, country');
    if (!localStores || localStores.length === 0) {
      return res.status(500).json({ error: 'No stores found in Chatify' });
    }

    // 2. Llamar a la API de Shopyeasy para obtener carritos abandonados
    const response = await fetch(SHOPYEASY_EXPORT_URL);
    if (!response.ok) {
      return res.status(502).json({ error: `Shopyeasy API returned ${response.status}` });
    }
    const result = await response.json();
    if (!result.success || !result.data) {
      return res.status(502).json({ error: 'Shopyeasy API returned invalid data' });
    }

    log.push(`📥 Shopyeasy reporta ${result.count} carritos abandonados en total`);

    // 3. Solo procesar carritos de las últimas 25 horas (para no importar carritos viejos)
    const cutoff = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const recentCarts = result.data.filter((cart: any) => cart.createdAt > cutoff);
    log.push(`🕐 ${recentCarts.length} carritos en las últimas 25 horas`);

    // 4. Procesar cada carrito
    for (const cart of recentCarts) {
      const storeName = cart.storeName;
      const storeCountry = cart.storeCountry;

      // Buscar la tienda en Chatify (match por nombre y país)
      const store = localStores.find((s: any) =>
        s.name.toLowerCase() === storeName.toLowerCase() &&
        s.country.toLowerCase() === storeCountry.toLowerCase()
      );

      if (!store) {
        skippedNoStore++;
        continue;
      }

      // Formatear teléfono según el país
      const formattedPhone = formatPhone(cart.customerPhone, storeCountry);
      if (!formattedPhone || formattedPhone.length < 8) {
        log.push(`⚠️ Teléfono inválido: ${cart.customerPhone} (${storeName})`);
        continue;
      }

      // Verificar si ya existe un lead con este teléfono para esta tienda
      // en estado de carrito abandonado (para no duplicar)
      const { data: existingLeads } = await supabase
        .from('leads')
        .select('id, status, product_name')
        .eq('store_id', store.id)
        .eq('phone', formattedPhone)
        .eq('board_type', 'remarketing_carts')
        .in('status', ['abandoned', 'bot_sent'])
        .order('created_at', { ascending: false })
        .limit(1);

      if (existingLeads && existingLeads.length > 0) {
        skippedExisting++;
        continue;
      }

      // Crear el lead como carrito abandonado
      const { error: insertError } = await supabase.from('leads').insert({
        store_id: store.id,
        name: cart.customerName || 'Cliente',
        phone: formattedPhone,
        product_name: cart.productName || null,
        city: cart.city || null,
        address: cart.address || null,
        traffic_source: 'Shopyeasy Auto-Sync',
        board_type: 'remarketing_carts',
        status: 'abandoned',
        recovery_touch: 0,
        notes: `Shopyeasy Cart ID: ${cart.id || 'N/A'}`
      });

      if (insertError) {
        errors++;
        log.push(`❌ Error insertando ${cart.customerName}: ${insertError.message}`);
      } else {
        imported++;
      }
    }

    log.push(`\n📊 Resumen:`);
    log.push(`  ✅ Importados: ${imported}`);
    log.push(`  ⏭️ Ya existentes: ${skippedExisting}`);
    log.push(`  🏪 Sin tienda: ${skippedNoStore}`);
    log.push(`  ❌ Errores: ${errors}`);

    return res.status(200).json({
      success: true,
      imported,
      skippedExisting,
      skippedNoStore,
      errors,
      log
    });

  } catch (error: any) {
    console.error('[sync-shopyeasy] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
