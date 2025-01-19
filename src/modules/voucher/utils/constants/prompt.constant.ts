export const generateVoucherPrompt = (text: string) => {
  return `
You are an expert in analyzing receipts. Analyze the following text and extract the information in JSON format. The text may be in Spanish or English. Use the exact field names provided below. If a value is missing, return an empty string or 0.

Input text:
${text}

Expected JSON format:
{
  "date": "YYYY-MM-DD",
  "transaction_number": "string",
  "total": number,
  "vendor": "string",
  "tax_amount": number,
  "client": "string",
  "igv": number,
  "ITEMS": [
    {
      "code": "string",
      "name": "string",
      "quantity": number,
      "unit_price": number,
      "total": number
    }
  ]
}

Make sure to parse the information accurately. Do not invent data. Extract only what is explicitly present in the input text.
  `;
};
