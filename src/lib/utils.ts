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
