import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // AI Client Initialization
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), nodeEnv: process.env.NODE_ENV });
  });

  // AI Accounting Classification
  app.post("/api/accounting/classify", async (req, res) => {
    const { accounts, pendingTransactions } = req.body;
    
    if (!accounts || !pendingTransactions) {
      return res.status(400).json({ error: "Accounts and pending transactions are required." });
    }

    try {
      const prompt = `
        You are an expert AI Accountant. Classify the following daily financial transactions into the given Chart of Accounts.
        
        Chart of Accounts:
        ${JSON.stringify(accounts.map((a: any) => ({ id: a.id, name: a.name, category: a.category, subCategory: a.subCategory })))}
        
        Transactions to Classify:
        ${JSON.stringify(pendingTransactions.map((t: any) => ({ internalId: t.id, description: t.description, amount: t.amount })))}
        
        Important Rules:
        1. Always pick the most appropriate account ID from the exact Chart of Accounts provided.
        2. If none match exactly, do your best to pick the closest matching account ID.
        3. Return ONLY a valid JSON array of objects with the exact keys: "internalId", "accountId". 
        Do not add markdown formatting or backticks around the JSON.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      let responseText = response.text || '[]';
      responseText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const mappings = JSON.parse(responseText);
      res.json({ mappings });
    } catch (error) {
      console.error("AI Classification Error:", error);
      res.status(500).json({ error: "Failed to classify transactions with AI." });
    }
  });

  // AI Accounting Report Generation
  app.post("/api/accounting/report", async (req, res) => {
    const { accounts, transactions } = req.body;

    if (!accounts) {
      return res.status(400).json({ error: "Accounts data is required." });
    }

    try {
      const prompt = `
        You are a Chief Financial Officer AI. Review the following Accounting Tree balances.
        Generate financial recommendations, identify trends, predict future financial outlooks, and produce:
        1. A concise Balance Sheet
        2. An Income Statement
        3. A Cash Flow Report
        
        Accounts Data:
        ${JSON.stringify(accounts)}
        
        Recent Transactions:
        ${JSON.stringify((transactions || []).slice(0, 50))}
        
        Return the report formatted in standard Markdown. Be professional, analytical, and actionable. Add recommendations for reducing liabilities or managing costs. Use the local currency SAR.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      res.json({ report: response.text || "No report generated." });
    } catch (error) {
      console.error("AI Reporting Error:", error);
      res.status(500).json({ error: "Failed to generate financial report with AI." });
    }
  });

  // AI Risk Detection
  app.post("/api/projects/risk-detect", async (req, res) => {
    const { projectDetails } = req.body;

    if (!projectDetails) {
      return res.status(400).json({ error: "Project details are required." });
    }

    try {
      const prompt = `
        You are an expert ERP Risk Detection AI. Analyze the following project data and detect financial, operational, and scheduling risks. 
        Provide a structured summary in JSON with:
        1. "RiskLevel" (Low, Medium, High)
        2. "Top3Risks" (array of strings)
        3. "MitigationStrategies" (array of strings)
        
        Project Data: ${projectDetails}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("AI Risk Detection Error:", error);
      res.status(500).json({ error: "Failed to analyze risks with AI." });
    }
  });

  // AI Contract Translation
  app.post("/api/contracts/translate", async (req, res) => {
    const { text, targetLang } = req.body;

    if (!text || !targetLang) {
      return res.status(400).json({ error: "Text and target language are required." });
    }

    try {
      const prompt = `Translate the following professional legal contract section into ${targetLang}. Preserve the formal tone and legal accuracy. 
        Return only the translated text.
        
        Text: ${text}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      res.json({ translatedText: response.text });
    } catch (error) {
      console.error("AI Translation Error:", error);
      res.status(500).json({ error: "Failed to translate with AI." });
    }
  });

  // AI Comprehensive Project Analysis
  app.post("/api/projects/analyze", async (req, res) => {
    const { projectSummary } = req.body;

    if (!projectSummary) {
      return res.status(400).json({ error: "Project summary is required." });
    }

    try {
      const prompt = `
        Analyze this construction project data and provide a strategic summary in JSON format:
        ${projectSummary}

        Return a JSON object:
        {
          "summary": "Full analysis of overall health",
          "risks": ["Risk 1", "Risk 2"],
          "recommendations": ["Rec 1", "Rec 2"],
          "financialHealth": "Critical|Stable|Strong"
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });

      res.json(JSON.parse(response.text || "{}"));
    } catch (error) {
      console.error("AI Project Analysis Error:", error);
      res.status(500).json({ error: "Failed to analyze project with AI." });
    }
  });

  // Font Proxy Route
  app.get("/api/fonts/:fontName", async (req, res) => {
    const { fontName } = req.params;
    const fontUrls: Record<string, string> = {
      'amiri-regular': 'https://cdn.jsdelivr.net/gh/googlefonts/amiri@main/fonts/ttf/Amiri-Regular.ttf',
      'amiri-bold': 'https://cdn.jsdelivr.net/gh/googlefonts/amiri@main/fonts/ttf/Amiri-Bold.ttf'
    };

    const url = fontUrls[fontName.toLowerCase()];
    if (!url) {
      return res.status(404).json({ error: "Font not found" });
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      res.setHeader('Content-Type', 'font/ttf');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.send(buffer);
    } catch (error) {
      console.error(`Error proxying font ${fontName}:`, error);
      res.status(500).json({ error: "Failed to fetch font" });
    }
  });

  // ZATCA QR Code Generator (TLV + Base64)
  app.post("/api/finance/generate-zatca-qr", (req, res) => {
    let { sellerName, vatRegistration, timestamp, total, vatTotal } = req.body;

    const getTlv = (tag: number, value: string) => {
      const tagBuf = Buffer.from([tag]);
      const valBuf = Buffer.from(value);
      const lenBuf = Buffer.from([valBuf.length]);
      return Buffer.concat([tagBuf, lenBuf, valBuf]);
    };

    try {
      // Normalize timestamp: parse to Date, format to ISO, strip milliseconds
      let isoTimestamp = new Date().toISOString();
      if (timestamp) {
        try {
          const parsedDate = new Date(timestamp);
          if (!isNaN(parsedDate.getTime())) {
            isoTimestamp = parsedDate.toISOString();
          }
        } catch (e) {
          console.error("ZATCA Timestamp parse failed:", e);
        }
      }
      const finalTimestamp = isoTimestamp.replace(/\.\d{3}/, ''); // e.g. 2024-04-18T12:00:00Z (clean, no ms)

      // Normalize numbers to exactly 2 decimal places
      const formattedTotal = Number(total || 0).toFixed(2);
      const formattedVatTotal = Number(vatTotal || 0).toFixed(2);

      const tlvData = Buffer.concat([
        getTlv(1, sellerName || "RED SEA HOLDING COMPANY SYSTEM"),
        getTlv(2, vatRegistration || "312345678900003"),
        getTlv(3, finalTimestamp),
        getTlv(4, formattedTotal),
        getTlv(5, formattedVatTotal),
      ]);

      const base64Qr = tlvData.toString("base64");
      res.json({ qrCode: base64Qr });
    } catch (error) {
      console.error("ZATCA QR Generation API Error:", error);
      res.status(500).json({ error: "Failed to generate QR code" });
    }
  });

  // PDF Generation Route
  app.post("/api/finance/generate-pdf", async (req, res) => {
    const { invoice } = req.body;
    
    if (!invoice) {
      return res.status(400).json({ error: "Invoice data is required" });
    }

    try {
      const { default: PDFDocument } = await import('pdfkit');
      const { default: QRCode } = await import('qrcode');
      
      const doc = new (PDFDocument as any)({ margin: 50 });
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice-${invoice.id}.pdf`);
      
      doc.pipe(res);

      // Header
      doc.fontSize(20).text('INVOICE', { align: 'right' });
      doc.fontSize(10).text(`Ares ERP Enterprise`, 50, 50);
      doc.text(`VAT: 312345678900003`, 50, 65);
      doc.moveDown();

      // Invoice Details
      doc.fontSize(12).text(`Invoice Number: ${invoice.id}`);
      doc.text(`Date: ${invoice.date || invoice.createdAt}`);
      doc.text(`Project: ${invoice.project}`);
      doc.text(`Status: ${invoice.status}`);
      doc.moveDown();

      // Content Table Header
      const tableTop = 200;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Description', 50, tableTop);
      doc.text('Amount', 400, tableTop, { align: 'right' });
      doc.font('Helvetica');

      // Content
      doc.text(`Service/Material requisition for ${invoice.project}`, 50, tableTop + 20);
      doc.text(`${invoice.amount.toLocaleString()} SAR`, 400, tableTop + 20, { align: 'right' });

      // Totals
      const totalTop = tableTop + 60;
      doc.text('Subtotal:', 350, totalTop);
      doc.text(`${invoice.amount.toLocaleString()} SAR`, 450, totalTop, { align: 'right' });

      doc.text('VAT (15%):', 350, totalTop + 15);
      doc.text(`${invoice.tax.toLocaleString()} SAR`, 450, totalTop + 15, { align: 'right' });

      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('Total:', 350, totalTop + 35);
      doc.text(`${invoice.total.toLocaleString()} SAR`, 450, totalTop + 35, { align: 'right' });

      // QR Code
      if (invoice.qrCodeData) {
        const qrImageBuffer = await (QRCode as any).toBuffer(invoice.qrCodeData);
        doc.image(qrImageBuffer, 50, doc.page.height - 150, { width: 100 });
        doc.fontSize(8).font('Helvetica').text('Scan for ZATCA Verification', 50, doc.page.height - 45);
      }

      // Footer
      doc.fontSize(8).text('Generated by Ares ERP Enterprise - Secure Node Gulf-West-1', 50, doc.page.height - 30, { align: 'center' });

      doc.end();
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  // Serve static files in production
  if (process.env.NODE_ENV === "production" || process.env.VITE_PROD === "true") {
    // Determine dist path relative to current working directory
    const distPath = path.resolve(process.cwd(), 'dist');
    console.log(`Production mode: Serving static files from ${distPath}`);
    
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      // Avoid infinite loop for API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: "API route not found" });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    // Vite middleware for development
    console.log("Development mode: Initializing Vite middleware...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          host: '0.0.0.0',
          port: 3000,
          hmr: process.env.DISABLE_HMR !== 'true'
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (e) {
      console.warn("Vite not found or failed to load. Falling back to static serving if dist exists.");
      const distPath = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distPath));
    }
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
