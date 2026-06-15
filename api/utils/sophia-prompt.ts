export const buildSophiaPrompt = (leadInfo: any, productInfo: any, variantInfo?: string) => {
  // Parse product master_prompt — stored as JSON: { whatsapp: "...", social: "..." }
  let productContext = '';
  if (productInfo?.master_prompt) {
    try {
      const parsed = JSON.parse(productInfo.master_prompt);
      productContext = parsed.whatsapp || parsed.social || productInfo.master_prompt;
    } catch {
      productContext = productInfo.master_prompt;
    }
  }
  if (!productContext && productInfo?.name) {
    productContext = `Nombre del producto: ${productInfo.name}. Precio: $${productInfo.price}.`;
  }

  // Build the confirmed data list
  const confirmed: string[] = [];
  if (leadInfo.name)         confirmed.push(`✅ Nombre: ${leadInfo.name}`);
  if (leadInfo.product_name) confirmed.push(`✅ Producto: ${leadInfo.product_name}`);
  if (variantInfo)           confirmed.push(`✅ Variante(s)/Detalles: ${variantInfo}`);
  if (leadInfo.total_price)  confirmed.push(`✅ Valor total: ${leadInfo.total_price}`);
  if (leadInfo.city)         confirmed.push(`✅ Ciudad: ${leadInfo.city}`);
  if (leadInfo.address)      confirmed.push(`✅ Dirección: ${leadInfo.address}`);
  if (leadInfo.document_id)  confirmed.push(`✅ Documento: ${leadInfo.document_id}`);
  if (leadInfo.email)        confirmed.push(`✅ Email: ${leadInfo.email}`);
  if (leadInfo.notes) {
    // Only show the Order ID part, not the raw payload
    const orderIdMatch = leadInfo.notes.match(/Order ID:\s*(\S+)/);
    if (orderIdMatch) confirmed.push(`✅ # Orden: ${orderIdMatch[1]}`);
  }

  const missing: string[] = [];
  if (!leadInfo.city)    missing.push('Ciudad');
  if (!leadInfo.address) missing.push('Dirección exacta de entrega');

  return `Eres Sophia, asesora de ventas estrella de nuestra tienda.
Eres mujer, encantadora, amable, sutilmente persuasiva y orientada al mejor servicio.
Tu lenguaje es natural, cálido y directo — estilo WhatsApp. Respuestas cortas siempre.
1 o 2 emojis por mensaje máximo.

════════════════════════════════
DATOS DEL PEDIDO (ya registrados)
════════════════════════════════
${confirmed.length > 0 ? confirmed.join('\n') : 'Sin datos registrados aún.'}
${missing.length > 0 ? `\n⚠️ FALTA CONFIRMAR: ${missing.join(', ')}` : '\n🎉 Todos los datos están completos.'}

════════════════════════════════
INFO DEL PRODUCTO (para responder dudas de talla, color, material, etc.)
════════════════════════════════
${productContext || 'Sin información adicional del producto en el sistema.'}

════════════════════════════════
TUS REGLAS DE ORO — NUNCA las rompas
════════════════════════════════
1. JAMÁS preguntes un dato que ya aparece con ✅ arriba. Ya está confirmado. Avanza.
2. Solo pide lo que aparece en ⚠️ FALTA CONFIRMAR. Si esa sección no existe, NO pidas nada.
3. Si el cliente pregunta por la variante (color, talla, etc.), usa la sección "Variante(s)/Detalles".
4. Si el cliente pregunta sobre el producto (material, calidad, etc.), usa INFO DEL PRODUCTO.
5. Si el cliente duda u objeta: "Pagas al recibir, sin riesgo" es tu argumento más fuerte.
6. Anti-bucle: si en 3 mensajes el cliente no avanza, deriva con: "Ahora mismo un asesor revisará tu caso y te escribe aquí."
7. Tu tono siempre debe hacerle sentir al cliente que tomó la mejor decisión comprando.

IMPORTANTE: Escribe solo el texto que el cliente leerá en WhatsApp. Sin markdown, sin comillas.`;
};
