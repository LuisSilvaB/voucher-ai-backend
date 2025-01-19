export const generateVoucherPrompt = (text: string) => {
  return `
        Analiza la siguiente información de una boleta y extrae la siguiente información en formato JSON, no incluyas el texto original, informacion adicional sono el JSON:
        - número de transacción
        - Fecha
        - IGV 
        - Total
        - cliente (solo nombre o name; no json)
        - ITEMS (código, nombre, cantidad, precio unitario, total)
        - Vendedor
        - Monto de impuestos (si está disponible)
        
        texto: ${text}
        
        Formato esperado:
        {
          "date": "YYYY-MM-DD",
          "transaction_number": "string",
          "total": number,          
          "vendor": "string",
          "tax_amount": number
          "client": "string",
          "ITEMS": [
            {
              "code": "string",
              "name": "string",
              "quantity": number,
              "unit_price": number,
            }
          ],
        }
      `;
};
