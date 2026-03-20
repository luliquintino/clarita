# Design: Evening Push Reminder + Notification Card UX

**Date:** 2026-03-20
**Status:** Approved

## Problem

1. The notification activation card does not reliably disappear in all edge cases after the user enables push notifications.
2. There is no daily 19h BRT push reminder targeting all subscribed patients (existing job only covers patients in care relationships).
3. Apple Watch support is expected.

## Goals

- Card disappears immediately and permanently once the user activates notifications (or has already activated in a previous session).
- All patients with an active push subscription receive a daily reminder at 19h BRT (22:00 UTC) if they have not done a check-in today.
- Apple Watch receives the notification automatically via iPhone relay — no extra code required.

## Out of Scope

- Per-user timezone configuration.
- Configurable reminder time.
- Separate native app for Apple Watch.

## Design

### 1. Frontend — Notification Card Condition Fix

**File:** `dashboard/src/app/patient-home/page.tsx`

Current condition:
```tsx
{permission === 'default' && !subscribed && (
```

Updated condition:
```tsx
{permission === 'default' && !subscribed && (
```

The condition is already logically correct (`permission === 'default'` becomes `'granted'` the moment `requestPermission()` resolves, so the card disappears). However, `usePushNotifications` should also be updated to handle the case where the user returns to the page with `permission === 'granted'` — in that case, `subscribed` should be set to `true` via the existing `useEffect` that calls `pushManager.getSubscription()`. Confirm this path works end-to-end.

No JSX change needed; the hook's `useEffect` already handles it.

### 2. Backend — Evening Reminder Job

**New file:** `backend/src/jobs/eveningReminderJob.js`

```
Cron schedule: 0 22 * * *   (22:00 UTC = 19:00 BRT)
```

Query logic:
```sql
SELECT ps.user_id
FROM push_subscriptions ps
JOIN users u ON u.id = ps.user_id
WHERE u.role = 'patient'
  AND u.is_active = TRUE
  AND ps.user_id NOT IN (
    SELECT patient_id FROM emotional_logs
    WHERE logged_at >= CURRENT_DATE
  )
```

Push payload:
```json
{
  "title": "Não esqueça do seu check-in hoje 🌙",
  "body": "Como foi o seu dia? Leva menos de 1 minuto.",
  "url": "/patient-home",
  "tag": "evening-reminder"
}
```

**Register in:** `backend/src/index.js` alongside existing jobs.

### 3. Apple Watch

No changes required. Web Push delivered to iPhone Safari PWA is automatically relayed to Apple Watch by iOS when:
- The user has paired their Watch with iPhone
- Notifications are enabled for the app

This is handled entirely by the OS.

## Files Changed

| File | Change |
|---|---|
| `backend/src/jobs/eveningReminderJob.js` | Create — daily 22:00 UTC cron job |
| `backend/src/index.js` | Register `startEveningReminderJob()` |
| `dashboard/src/hooks/usePushNotifications.ts` | Verify/fix `subscribed` detection on page load |

## Testing

- Manually trigger job by temporarily changing cron to `* * * * *`, verify push arrives.
- After subscribing on patient-home, refresh page — card should not reappear.
- Verify expired subscriptions are cleaned up (410 handling already in `pushService.js`).
