import { routeAIRequest } from '../../api/utils/ai-router';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orgId, provider, model, apiKey, systemPrompt, userPrompt } = req.body;

  if (!provider || !apiKey) {
    return res.status(400).json({ error: 'Falta proveedor o API key' });
  }

  try {
    const response = await routeAIRequest({
      organizationId: orgId || 'demo',
      module: 'whatsapp',
      systemPrompt: systemPrompt || 'Eres un asistente comercial.',
      messages: [{ role: 'user', content: userPrompt || 'Hola' }],
      providerOverride: provider
    });

    return res.status(200).json({
      success: true,
      response,
      estimatedCostUsd: 0.0001
    });
  } catch (error: any) {
    return res.status(500).json({
      error: error.message || 'Error invocando proveedor de IA'
    });
  }
}
