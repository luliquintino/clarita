# Evening Push Reminder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Send a daily push notification at 19h BRT to all subscribed patients who haven't checked in, and ensure the notification card disappears immediately after activation.

**Architecture:** New `eveningReminderJob.js` cron (22:00 UTC) queries all patients with push subscriptions who lack an emotional_log today, then calls the existing `sendPushToUser`. Frontend card already hides via `!subscribed`; we verify/harden the `usePushNotifications` hook so `subscribed` is correctly set on page load when permission was previously granted.

**Tech Stack:** Node.js, node-cron, web-push, PostgreSQL, Next.js, React

---

### Task 1: Create `eveningReminderJob.js`

**Files:**
- Create: `backend/src/jobs/eveningReminderJob.js`

**Step 1: Write the file**

```js
'use strict';

const cron = require('node-cron');
const { query } = require('../config/database');
const { sendPushToUser } = require('../services/pushService');

function startEveningReminderJob() {
  // 22:00 UTC = 19:00 BRT
  cron.schedule('0 22 * * *', async () => {
    console.log('[eveningReminder] Sending 19h reminders...');
    try {
      const result = await query(`
        SELECT ps.user_id
        FROM push_subscriptions ps
        JOIN users u ON u.id = ps.user_id
        WHERE u.role = 'patient'
          AND u.is_active = TRUE
          AND ps.user_id NOT IN (
            SELECT patient_id FROM emotional_logs
            WHERE logged_at >= CURRENT_DATE
          )
      `);

      for (const row of result.rows) {
        sendPushToUser(row.user_id, {
          title: 'Não esqueça do seu check-in hoje 🌙',
          body: 'Como foi o seu dia? Leva menos de 1 minuto.',
          url: '/patient-home',
          tag: 'evening-reminder',
        }).catch(err =>
          console.error('[eveningReminder] push failed for', row.user_id, err.message)
        );
      }

      console.log(`[eveningReminder] ${result.rows.length} lembrete(s) enviado(s).`);
    } catch (err) {
      console.error('[eveningReminder] Erro:', err.message);
    }
  });

  console.log('[eveningReminderJob] Agendado para 22:00 UTC (19:00 BRT) diariamente.');
}

module.exports = { startEveningReminderJob };
```

**Step 2: Verify file exists**

```bash
cat backend/src/jobs/eveningReminderJob.js
```
Expected: file contents printed.

---

### Task 2: Register the job in `index.js`

**Files:**
- Modify: `backend/src/index.js`

**Step 1: Find the existing job registrations**

```bash
grep -n "startCheckinReminderJob\|startNoCheckinJob" backend/src/index.js
```
Expected: two lines showing the require and the call.

**Step 2: Add require and call** — directly after the existing job lines:

```js
const { startEveningReminderJob } = require('./jobs/eveningReminderJob');
```

And in the startup block:

```js
startEveningReminderJob();
```

**Step 3: Verify server starts without errors**

```bash
cd backend && node -e "require('./src/index.js')" 2>&1 | head -20
```
Expected: `[eveningReminderJob] Agendado para 22:00 UTC (19:00 BRT) diariamente.` in output, no crashes.

**Step 4: Commit**

```bash
git add backend/src/jobs/eveningReminderJob.js backend/src/index.js
git commit -m "feat: add daily 19h BRT push reminder for all subscribed patients"
```

---

### Task 3: Harden `usePushNotifications` — subscribed state on page load

**Files:**
- Modify: `dashboard/src/hooks/usePushNotifications.ts`

**Context:** Currently the `useEffect` checks for an existing subscription and sets `subscribed = true`. This already works, but we need to make sure the effect also runs when `token` changes (e.g. on login). The effect currently has no dependency on `token`.

**Step 1: Read the current useEffect**

```bash
sed -n '1,25p' dashboard/src/hooks/usePushNotifications.ts
```

**Step 2: Update the useEffect dependency array**

Find:
```ts
  useEffect(() => {
    if (!('Notification' in window)) return;
    setPermission(Notification.permission);

    // Check if already subscribed
    if (Notification.permission === 'granted' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg =>
        reg.pushManager.getSubscription()
      ).then(sub => {
        if (sub) setSubscribed(true);
      }).catch(() => {});
    }
  }, []);
```

Replace with (add `token` to deps so it re-checks after login):
```ts
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
```

**Step 3: Verify no TypeScript errors**

```bash
cd dashboard && npx tsc --noEmit 2>&1
```
Expected: no errors.

**Step 4: Commit**

```bash
git add dashboard/src/hooks/usePushNotifications.ts
git commit -m "fix: re-check push subscription state when token changes"
```

---

### Task 4: Manual smoke test

**Step 1: Start backend in test mode with temporary cron**

Temporarily change the cron schedule in `eveningReminderJob.js` to `* * * * *` (every minute) to trigger immediately.

**Step 2: Start backend**

```bash
cd backend && node src/index.js
```

Wait 1 minute. Expected log:
```
[eveningReminder] Sending 19h reminders...
[eveningReminder] N lembrete(s) enviado(s).
```

**Step 3: Revert cron to `0 22 * * *`**

```bash
# revert the temp change
git checkout backend/src/jobs/eveningReminderJob.js
```

**Step 4: Test card behaviour in browser**

1. Open patient-home as a patient
2. If card shows, click "Ativar"
3. Card should disappear immediately
4. Refresh page — card should NOT reappear

---

### Task 5: Push to GitHub

```bash
git push origin main
```

Expected: branch pushed, all commits visible on GitHub.

---

## Apple Watch Note

No code changes needed. Web Push delivered to iPhone Safari PWA is automatically relayed to Apple Watch by iOS when notifications are enabled. This works out of the box.
