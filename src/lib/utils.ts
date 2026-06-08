import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * System-wide Notification and Audit Helpers
 */

export function triggerSystemNotification(notification: any) {
  try {
    const existingNotifications = JSON.parse(window.localStorage.getItem('ares_app_notifications') || '[]');
    window.localStorage.setItem('ares_app_notifications', JSON.stringify([notification, ...existingNotifications]));
    // Trigger the custom event for useLocalStorage sync
    window.dispatchEvent(new Event('local-storage-update-ares_app_notifications'));
  } catch (error) {
    console.error("Error triggering notification:", error);
  }
}

import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function createAuditLog(log: any) {
  try {
    const existingLogs = JSON.parse(window.localStorage.getItem('ares_audit_logs') || '[]');
    window.localStorage.setItem('ares_audit_logs', JSON.stringify([log, ...existingLogs]));
    // Trigger the custom event for useLocalStorage sync
    window.dispatchEvent(new Event('local-storage-update-ares_audit_logs'));

    // Also push to Firestore asynchronously
    try {
      if (db) {
        await addDoc(collection(db, 'audit_logs'), {
          ...log,
          timestamp: log.timestamp || serverTimestamp()
        });
      }
    } catch (fsError) {
      console.warn("Could not save audit log to Firestore:", fsError);
    }
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
}

export function generateZatcaQrClientSide(
  sellerName: string,
  vatRegistration: string,
  timestamp: string,
  total: number,
  vatTotal: number
): string {
  const toTlv = (tag: number, value: string): Uint8Array => {
    const valueBytes = new TextEncoder().encode(value);
    const tagBytes = new Uint8Array([tag, valueBytes.length]);
    const res = new Uint8Array(tagBytes.length + valueBytes.length);
    res.set(tagBytes, 0);
    res.set(valueBytes, tagBytes.length);
    return res;
  };

  let formattedTime = timestamp;
  try {
    const d = new Date(timestamp);
    if (!isNaN(d.getTime())) {
      formattedTime = d.toISOString().replace(/\.\d{3}/, '');
    }
  } catch (e) {
    console.error("Timestamp format error:", e);
  }

  const t1 = toTlv(1, sellerName);
  const t2 = toTlv(2, vatRegistration);
  const t3 = toTlv(3, formattedTime);
  const t4 = toTlv(4, total.toFixed(2));
  const t5 = toTlv(5, vatTotal.toFixed(2));

  const totalLength = t1.length + t2.length + t3.length + t4.length + t5.length;
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  merged.set(t1, offset); offset += t1.length;
  merged.set(t2, offset); offset += t2.length;
  merged.set(t3, offset); offset += t3.length;
  merged.set(t4, offset); offset += t4.length;
  merged.set(t5, offset); offset += t5.length;

  let binaryString = "";
  for (let i = 0; i < merged.length; i++) {
    binaryString += String.fromCharCode(merged[i]);
  }
  return btoa(binaryString);
}
