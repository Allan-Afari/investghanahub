/**
 * Profit Distribution Scheduler
 * Runs automatic profit distribution at scheduled intervals
 */

/**
 * Initialize profit distribution scheduler
 * Runs every hour to check for matured investments
 */
export async function initializeProfitScheduler(): Promise<void> {
  // Only run in production or when explicitly enabled
  const ENABLE_PROFIT_SCHEDULER = process.env.ENABLE_PROFIT_SCHEDULER === 'true';
  const PROFIT_CHECK_INTERVAL = parseInt(process.env.PROFIT_CHECK_INTERVAL_MS || '3600000'); // 1 hour

  if (!ENABLE_PROFIT_SCHEDULER) {
    console.log('⏭️  Profit distribution scheduler is disabled');
    return;
  }

  console.log(`🔄 Starting profit distribution scheduler (interval: ${PROFIT_CHECK_INTERVAL}ms)`);

  const { profitDistributionService } = await import('../services/profitDistributionService');

  // Run initial check
  try {
    const result = await profitDistributionService.processAutomaticDistribution();
    console.log(`✅ Initial profit check: ${result.message}`);
  } catch (error: any) {
    console.error('❌ Initial profit check failed:', error.message);
  }

  // Schedule recurring checks
  setInterval(async () => {
    try {
      console.log('🔄 Running scheduled profit distribution check...');
      const result = await profitDistributionService.processAutomaticDistribution();
      console.log(`✅ Scheduled profit check: ${result.message}`);
    } catch (error: any) {
      console.error('❌ Scheduled profit check failed:', error.message);
    }
  }, PROFIT_CHECK_INTERVAL);
}

/**
 * Manual trigger for profit distribution (for testing/admin)
 */
export async function triggerProfitDistribution(): Promise<void> {
  try {
    const { profitDistributionService } = await import('../services/profitDistributionService');
    console.log('🔄 Manually triggering profit distribution...');
    const result = await profitDistributionService.processAutomaticDistribution();
    console.log(`✅ Manual trigger result: ${result.message}`);
  } catch (error: any) {
    console.error('❌ Manual trigger failed:', error.message);
    throw error;
  }
}
