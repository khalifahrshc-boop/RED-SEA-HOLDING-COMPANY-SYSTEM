import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import { CompanyData } from '../types';
import arabicReshaper from 'arabic-reshaper';
// @ts-ignore
import bidiFactory from 'bidi-js';

const bidi = (() => {
  try {
    if (typeof bidiFactory === 'function') return bidiFactory();
    if (bidiFactory && bidiFactory.default && typeof bidiFactory.default === 'function') {
      return bidiFactory.default();
    }
    return null;
  } catch (e) {
    console.error('Bidi initialization failed', e);
    return null;
  }
})();

/**
 * Reshapes and reverses Arabic text for jsPDF compatibility.
 */
export const reshapeArabic = (text: string): string => {
  if (!text) return '';
  
  // Check if text contains Arabic characters
  const isArabic = /[\u0600-\u06FF]/.test(text);
  if (!isArabic) return text;

  try {
    let reshaped = '';
    const ar = arabicReshaper as any;
    
    if (ar && typeof ar.rewrite === 'function') {
      reshaped = ar.rewrite(text);
    } else if (ar && ar.reshape && typeof ar.reshape === 'function') {
      reshaped = ar.reshape(text);
    } else {
      reshaped = text;
    }

    if (bidi) {
       if (typeof bidi.getReorderedText === 'function') {
         return bidi.getReorderedText(reshaped);
       }
       if (typeof bidi.getReordered === 'function') {
         return bidi.getReordered(reshaped);
       }
    }
    
    return reshaped;
  } catch (error) {
    console.error('Arabic reshaping error:', error);
    return text;
  }
};

/**
 * Loads the Amiri font from the server.
 */
export const loadArabicFont = async (doc: jsPDF) => {
  try {
    const fontList = doc.getFontList();
    if (fontList['Amiri']) return true;

    // Try both lowercase and mixed case to be sure
    const response = await fetch('/api/fonts/amiri-regular');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    const fontBase64 = btoa(binary);
    
    doc.addFileToVFS('Amiri-Regular.ttf', fontBase64);
    doc.addFont('Amiri-Regular.ttf', 'Amiri', 'normal');
    
    return true;
  } catch (error) {
    console.error('Critical failure loading Arabic font:', error);
    return false;
  }
};

/**
 * Generates a standard PDF layout with company branding.
 */
export const generateStandardPDF = (
  title: string,
  data: Partial<CompanyData> = {},
  orientation: 'p' | 'l' = 'p'
) => {
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
  
  let y = 14;
  let startX = 14;

  if (data.logo) {
    try {
      doc.addImage(data.logo, 'PNG', 14, 10, 30, 30);
      startX = 50;
      y = 20;
    } catch(e) {
      console.error(e);
    }
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  
  const companyName = data.name || 'RED SEA HOLDING SYSTEM ERP';
  doc.text(companyName, startX, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  
  y += 6;
  if (data.crNumber) {
    doc.text(`CR Number: ${data.crNumber}`, startX, y);
    y += 5;
  }
  if (data.vatNumber) {
    doc.text(`VAT Number: ${data.vatNumber}`, startX, y);
    y += 5;
  }
  if (data.headquarters) {
    doc.text(data.headquarters, startX, y);
    y += 5;
  }
  
  y = Math.max(y + 10, data.logo ? 50 : 40);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 14, y);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  y += 8;
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, y);
  
  y += 10;
  
  return { doc, startY: y };
};

/**
 * Fixes oklch/oklab/color-mix functions which crash html2canvas in Tailwind 4.
 * This should be called within the onclone callback of html2canvas.
 */
export const fixHtml2CanvasOklch = (clonedDoc: Document) => {
  // More aggressive regex that handles deeper nesting and various spacings
  const colorRegex = /(oklch|oklab|lab|lch|hwb|color-mix)\s*\((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*\)/gi;
  const replacementColor = '#334155';

  // 1. Scrub all <style> tags
  clonedDoc.querySelectorAll('style').forEach(style => {
    if (style.textContent && /(oklch|oklab|lab|lch|hwb|color-mix)/i.test(style.textContent)) {
      style.textContent = style.textContent.replace(colorRegex, replacementColor);
      
      // Secondary pass for any missed ones that might be inside variables or complex rules
      if (/(oklch|oklab|lab|lch|hwb|color-mix)/i.test(style.textContent)) {
         style.textContent = style.textContent.replace(/(oklch|oklab|lab|lch|hwb|color-mix)\s*\([^;}]*/gi, replacementColor);
      }
    }
  });

  // 2. Scrub all elements with inline styles or color-bearing attributes
  const allElements = clonedDoc.getElementsByTagName('*');
  for (let i = 0; i < allElements.length; i++) {
    const el = allElements[i] as HTMLElement;

    // Inline style attribute
    const styleAttr = el.getAttribute('style');
    if (styleAttr && /(oklch|oklab|lab|lch|hwb|color-mix)/i.test(styleAttr)) {
      el.setAttribute('style', styleAttr.replace(colorRegex, replacementColor));
    }

    // SVG and other color attributes
    ['fill', 'stroke', 'stop-color', 'flood-color', 'lighting-color'].forEach(attr => {
      const val = el.getAttribute(attr);
      if (val && /(oklch|oklab|lab|lch|hwb|color-mix)/i.test(val)) {
        el.setAttribute(attr, val.replace(colorRegex, replacementColor));
      }
    });

    // Special case for data attributes that might be used by some libraries
    for (let j = 0; j < el.attributes.length; j++) {
      const attr = el.attributes[j];
      if (attr.value && /(oklch|oklab|lab|lch|hwb|color-mix)/i.test(attr.value)) {
        attr.value = attr.value.replace(colorRegex, replacementColor);
      }
    }
  }
};

/**
 * Applies a styled table to the doc.
 */
export const applyAutoTable = (
  doc: jsPDF,
  options: any
) => {
  autoTable(doc, {
    theme: 'grid',
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    ...options,
  });
};

/**
 * Normalizes a date into a valid ISO-8601 timestamp required by ZATCA.
 */
export const getZatcaTimestamp = (dateStr?: string, createdAtStr?: string): string => {
  let dateObj: Date;
  if (createdAtStr) {
    dateObj = new Date(createdAtStr);
  } else if (dateStr) {
    dateObj = new Date(dateStr);
  } else {
    dateObj = new Date();
  }
  
  if (isNaN(dateObj.getTime())) {
    dateObj = new Date();
  }

  // Convert to ISO-8601 string and remove milliseconds (.fff) to pass strict ZATCA validators
  return dateObj.toISOString().replace(/\.\d{3}/, '');
};

/**
 * Generates a ZATCA-compliant Base64 TLV (Tag-Length-Value) string.
 * This is fully client-side and browser compatible.
 */
export const generateZatcaBase64 = (
  sellerName: string,
  vatRegistration: string,
  timestamp: string,
  total: number,
  vatTotal: number
): string => {
  const getTlvBytes = (tag: number, value: string): Uint8Array => {
    const encoder = new TextEncoder();
    const valueBytes = encoder.encode(value);
    const tlv = new Uint8Array(2 + valueBytes.length);
    tlv[0] = tag;
    tlv[1] = valueBytes.length;
    tlv.set(valueBytes, 2);
    return tlv;
  };

  try {
    const parts = [
      getTlvBytes(1, sellerName || "Ali Enterprises"),
      getTlvBytes(2, vatRegistration || "123456789012345"),
      getTlvBytes(3, timestamp),
      getTlvBytes(4, Number(total).toFixed(2)),
      getTlvBytes(5, Number(vatTotal).toFixed(2)),
    ];

    const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
    const combinedBytes = new Uint8Array(totalLength);
    
    let offset = 0;
    parts.forEach(part => {
      combinedBytes.set(part, offset);
      offset += part.length;
    });

    let binaryString = "";
    for (let i = 0; i < combinedBytes.length; i++) {
      binaryString += String.fromCharCode(combinedBytes[i]);
    }

    return btoa(binaryString);
  } catch (err) {
    console.error("ZATCA TLV encoding failed client-side:", err);
    return btoa(`${sellerName}|${vatRegistration}|${timestamp}|${total}|${vatTotal}`);
  }
};

