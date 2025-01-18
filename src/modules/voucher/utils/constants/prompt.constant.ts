export const generateVoucherPrompt = (text: string) => {
  return `
        Analiza la siguiente información de una boleta y extrae la siguiente información en formato JSON:
        - Fecha
        - Total
        - Items (descripción, cantidad, precio unitario, total)
        - Vendedor
        - Monto de impuestos (si está disponible)
        
        texto: ${text}
        
        Formato esperado:
        {
          "date": "YYYY-MM-DD",
          "total": number,
          "items": [
            {
              "description": "string",
              "quantity": number,
              "unitPrice": number,
              "total": number
            }
          ],
          "vendor": "string",
          "taxAmount": number
        }
      `;
};
