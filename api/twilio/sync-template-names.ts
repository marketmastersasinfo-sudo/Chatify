import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

/**
 * POST /api/twilio/sync-template-names
 * Reads all store_templates that have a twilio_content_sid + template_name,
 * and updates the Twilio Content Template's friendlyName to match.
 * Also syncs real approval status from Twilio back into store_templates.
 *
 * Body: { storeId?: string }  — if omitted, syncs ALL stores
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const { storeId } = req.body || {};

    // 1. Load store_templates from Supabase
    let query = supabase
      .from('store_templates')
      .select('id, template_name, twilio_content_sid, twilio_approval_status, store_id')
      .not('twilio_content_sid', 'is', null)
      .not('template_name', 'is', null)
      .neq('template_name', '');

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data: localTemplates, error: dbErr } = await query;
    if (dbErr) throw new Error('Error leyendo store_templates: ' + dbErr.message);

    const results: any[] = [];

    for (const tmpl of (localTemplates || [])) {
      const sid = tmpl.twilio_content_sid?.trim();
      const name = tmpl.template_name?.trim();
      if (!sid || !name) continue;

      const result: any = { id: tmpl.id, name, sid, actions: [] };

      try {
        // 2a. Fetch current Twilio Content Template
        const content = await twilioClient.content.v1.contents(sid).fetch();
        const currentFriendlyName = content.friendlyName;

        // 2b. If friendlyName is wrong/empty, update it via Twilio REST API directly
        // (Twilio SDK doesn't expose .update() for Content Templates but REST API accepts POST)
        if (!currentFriendlyName || currentFriendlyName !== name) {
          const accountSid = process.env.TWILIO_ACCOUNT_SID!;
          const authToken = process.env.TWILIO_AUTH_TOKEN!;
          const base64Auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

          const updateRes = await fetch(`https://content.twilio.com/v1/Content/${sid}`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${base64Auth}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ FriendlyName: name }).toString(),
          });

          if (updateRes.ok) {
            result.actions.push(`✅ Renombrado a "${name}" en Twilio`);
          } else {
            const errBody = await updateRes.text();
            result.actions.push(`⚠️ No se pudo renombrar (${updateRes.status}): ${errBody.substring(0, 100)}`);
          }
        } else {
          result.actions.push(`ℹ️ Ya tenía el nombre correcto: "${currentFriendlyName}"`);
        }

        // 2c. Sync approval status from Twilio back to Supabase
        try {
          const approval = await twilioClient.content.v1.contents(sid).approvalFetch().fetch();
          const realStatus = approval.status || 'approved';
          if (realStatus !== tmpl.twilio_approval_status) {
            await supabase
              .from('store_templates')
              .update({ twilio_approval_status: realStatus })
              .eq('id', tmpl.id);
            result.actions.push(`🔄 Estado actualizado: ${tmpl.twilio_approval_status} → ${realStatus}`);
          } else {
            result.actions.push(`✅ Estado correcto: ${realStatus}`);
          }
        } catch (approvalErr: any) {
          result.actions.push(`⚠️ No se pudo verificar estado: ${approvalErr.message}`);
        }

      } catch (twilioErr: any) {
        result.actions.push(`❌ Error Twilio: ${twilioErr.message}`);
      }

      results.push(result);
    }

    return res.status(200).json({
      success: true,
      synced: results.length,
      results,
    });

  } catch (error: any) {
    console.error('[sync-template-names] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
