'use client';
import { useState, useEffect } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005/api';

export function usePushNotifications(token: string | null) {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    setPermission(Notification.permission);

    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(reg => reg.pushManager.getSubscription())
        .then(sub => { if (sub) setSubscribed(true); })
        .catch(() => {});
    }
  }, [token]);

  async function subscribe() {
    if (!('serviceWorker' in navigator) || !token) return;
    setLoading(true);

    try {
      // Get VAPID public key (public endpoint — no auth header needed)
      const res = await fetch(`${API_URL}/push/vapid-public-key`);
      const { publicKey } = await res.json();

      if (!publicKey) {
        // dev mode without VAPID — just log
        console.log('[push] No VAPID key configured (dev mode)');
        setLoading(false);
        return;
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') {
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;

      // Check if already subscribed at browser level
      const existing = await registration.pushManager.getSubscription();
      if (existing) {
        // Already subscribed — just save to backend in case it wasn't saved
        await fetch(`${API_URL}/push/subscribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ subscription: existing }),
        });
        setSubscribed(true);
        return;
      }

      // No existing subscription — create new one
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      await fetch(`${API_URL}/push/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subscription }),
      });

      setSubscribed(true);
    } catch (err) {
      console.error('[push] subscribe failed:', err);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribe() {
    try {
      await fetch(`${API_URL}/push/unsubscribe`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubscribed(false);
    } catch (err) {
      console.error('[push] unsubscribe failed:', err);
    }
  }

  return { permission, subscribed, loading, subscribe, unsubscribe };
}
