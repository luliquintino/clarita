'use strict';

const { query } = require('../config/database');

/**
 * Sync SATEPSI test data.
 *
 * In production this would fetch from the CFP SATEPSI API or scrape
 * the official list. For now, it checks expiry dates and deactivates
 * tests whose expiry_date has passed.
 *
 * When a real SATEPSI API becomes available, replace the body of
 * fetchLatestSatepsiData() with the HTTP call.
 */
async function syncSatepsiTests() {
  let testsUpdated = 0;
  let testsDeactivated = 0;

  try {
    // 1. Deactivate tests whose expiry_date has passed
    const expired = await query(
      `UPDATE satepsi_tests
       SET approval_status = 'expired', last_updated = NOW()
       WHERE approval_status = 'active'
         AND expiry_date IS NOT NULL
         AND expiry_date < CURRENT_DATE
       RETURNING id, test_name`
    );
    testsDeactivated = expired.rows.length;

    if (testsDeactivated > 0) {
      console.log(`[satepsi-sync] Deactivated ${testsDeactivated} expired tests:`,
        expired.rows.map((t) => t.test_name).join(', '));
    }

    // 2. Attempt to fetch latest data from SATEPSI source
    // This is a placeholder for future SATEPSI API integration
    const latestData = await fetchLatestSatepsiData();

    if (latestData && latestData.length > 0) {
      for (const test of latestData) {
        const result = await query(
          `INSERT INTO satepsi_tests (test_name, test_author, approval_status, approval_date, expiry_date, test_category, cfp_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (test_name, test_author) DO UPDATE SET
             approval_status = EXCLUDED.approval_status,
             expiry_date = EXCLUDED.expiry_date,
             last_updated = NOW()
           RETURNING id`,
          [test.test_name, test.test_author, test.approval_status, test.approval_date, test.expiry_date, test.test_category, test.cfp_code]
        );
        if (result.rows.length > 0) testsUpdated++;
      }
    }

    // 3. Log sync result
    await query(
      `INSERT INTO satepsi_sync_log (tests_updated, tests_deactivated, status)
       VALUES ($1, $2, 'success')`,
      [testsUpdated, testsDeactivated]
    );

    console.log(`[satepsi-sync] Sync completed: ${testsUpdated} updated, ${testsDeactivated} deactivated`);
    return { testsUpdated, testsDeactivated, status: 'success' };
  } catch (err) {
    // Log failure
    await query(
      `INSERT INTO satepsi_sync_log (tests_updated, tests_deactivated, status, error_message)
       VALUES ($1, $2, 'error', $3)`,
      [testsUpdated, testsDeactivated, err.message]
    ).catch(() => {}); // Don't let logging failure mask original error

    console.error('[satepsi-sync] Sync failed:', err.message);
    return { testsUpdated, testsDeactivated, status: 'error', error: err.message };
  }
}

/**
 * Placeholder for fetching latest SATEPSI data from official source.
 * Replace with actual HTTP call when CFP API is available.
 *
 * Expected return format:
 * [{ test_name, test_author, approval_status, approval_date, expiry_date, test_category, cfp_code }]
 */
async function fetchLatestSatepsiData() {
  // TODO: Implement actual SATEPSI API fetch
  // const response = await fetch(process.env.SATEPSI_API_URL || 'https://satepsi.cfp.org.br/api/tests');
  // return response.json();
  return [];
}

module.exports = { syncSatepsiTests };
