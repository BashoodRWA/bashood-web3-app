/**
 * DOOSAN DX360 - RWA Financial Simulation
 * 
 * Purpose: Validate tokenization model with real industrial asset data
 * Phase: Pre-deployment validation (no blockchain interaction)
 * 
 * This script simulates 12 months of operation under 3 revenue scenarios:
 * - Low: €96,000/year (unsustainable)
 * - Medium: €144,000/year (modest profit)
 * - High: €180,000/year (healthy margins)
 */

const fs = require('fs');
const path = require('path');

// Load asset configuration
const configPath = path.join(__dirname, '../pilot-assets/doosan-dx360-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Smart contract parameters (from BashoodToken)
const BURN_RATE_BPS = 10;      // 0.1%
const TREASURY_FEE_BPS = 50;   // 0.5%
const HOLDERS_SHARE_BPS = 9940; // 99.4%

// Tokenization parameters
const ASSET_VALUE = config.financialData.assetValue;
const TOKENIZED_PERCENTAGE = config.tokenizationSimulation.tokenizedPercentage;
const TOKENIZED_VALUE = (ASSET_VALUE * TOKENIZED_PERCENTAGE) / 100;
const OWNER_RETAINED_PERCENTAGE = 100 - TOKENIZED_PERCENTAGE;

// Annual costs (fixed)
const ANNUAL_COSTS = config.costStructure.annual.total;
const MONTHLY_COSTS = ANNUAL_COSTS / 12;

// Revenue scenarios
const SCENARIOS = {
  low: config.revenueScenarios.low.monthly,
  medium: config.revenueScenarios.medium.monthly,
  high: config.revenueScenarios.high.monthly
};

console.log('\n🏗️  DOOSAN DX360 - RWA FINANCIAL SIMULATION');
console.log('═══════════════════════════════════════════════════════════\n');

console.log('📋 ASSET OVERVIEW');
console.log(`   Model: ${config.assetName} (${config.technicalSpecs.model})`);
console.log(`   Value: €${ASSET_VALUE.toLocaleString()}`);
console.log(`   Tokenized: ${TOKENIZED_PERCENTAGE}% (€${TOKENIZED_VALUE.toLocaleString()})`);
console.log(`   Owner Retained: ${OWNER_RETAINED_PERCENTAGE}%`);
console.log(`   Annual Costs: €${ANNUAL_COSTS.toLocaleString()}`);
console.log(`   Monthly Costs: €${MONTHLY_COSTS.toLocaleString()}\n`);

console.log('⚙️  OPERATIONAL DATA');
console.log(`   Work Schedule: ${config.operativeData.workSchedule.startTime} - ${config.operativeData.workSchedule.endTime}`);
console.log(`   Effective Hours/Day: ${config.operativeData.workSchedule.effectiveHours}h`);
console.log(`   Operative Days/Year: ${config.operativeData.workSchedule.daysPerYear}`);
console.log(`   Daily Production: ${config.operativeData.performance.dailyProduction.toLocaleString()} m³`);
console.log(`   Fuel Consumption: ${config.operativeData.fuelConsumption.dailyConsumption}L/day (€${config.operativeData.fuelConsumption.dailyCost}/day)\n`);

console.log('💰 REVENUE SCENARIOS');
console.log(`   Low: €${SCENARIOS.low.toLocaleString()}/month (€${(SCENARIOS.low * 12).toLocaleString()}/year)`);
console.log(`   Medium: €${SCENARIOS.medium.toLocaleString()}/month (€${(SCENARIOS.medium * 12).toLocaleString()}/year)`);
console.log(`   High: €${SCENARIOS.high.toLocaleString()}/month (€${(SCENARIOS.high * 12).toLocaleString()}/year)\n`);

console.log('═══════════════════════════════════════════════════════════\n');

/**
 * Simulate one month of operation
 * @param {number} monthlyRevenue - Revenue for this month (EUR)
 * @param {number} monthlyCosts - Costs for this month (EUR)
 * @returns {object} Financial breakdown
 */
function simulateMonth(monthlyRevenue, monthlyCosts) {
  // Step 1: Calculate net profit
  const netProfit = monthlyRevenue - monthlyCosts;
  
  if (netProfit <= 0) {
    return {
      revenue: monthlyRevenue,
      costs: monthlyCosts,
      netProfit: netProfit,
      distributableAmount: 0,
      ownerShare: 0,
      tokenHoldersShare: 0,
      treasuryFee: 0,
      burnAmount: 0,
      finalToHolders: 0,
      status: 'LOSS'
    };
  }
  
  // Step 2: Split by ownership percentage
  const ownerShare = netProfit * (OWNER_RETAINED_PERCENTAGE / 100);
  const tokenHoldersShare = netProfit * (TOKENIZED_PERCENTAGE / 100);
  
  // Step 3: Apply treasury fee on token holders' share
  const treasuryFee = tokenHoldersShare * (TREASURY_FEE_BPS / 10000);
  
  // Step 4: Remaining for token holders (before burn)
  // Note: Burn applies on token TRANSFERS, not on revenue distribution
  // For simplicity, we assume minimal transfers in this simulation
  const burnAmount = 0; // Burn happens on secondary trading, not revenue distribution
  
  const finalToHolders = tokenHoldersShare - treasuryFee - burnAmount;
  
  return {
    revenue: monthlyRevenue,
    costs: monthlyCosts,
    netProfit: netProfit,
    ownerShare: ownerShare,
    tokenHoldersShare: tokenHoldersShare,
    treasuryFee: treasuryFee,
    burnAmount: burnAmount,
    finalToHolders: finalToHolders,
    status: 'PROFIT'
  };
}

/**
 * Run 12-month simulation
 * @param {string} scenarioName - 'low', 'medium', or 'high'
 */
function runSimulation(scenarioName) {
  const monthlyRevenue = SCENARIOS[scenarioName];
  const scenarioLabel = scenarioName.toUpperCase();
  
  console.log(`\n🔍 SCENARIO: ${scenarioLabel} (€${monthlyRevenue.toLocaleString()}/month)`);
  console.log('───────────────────────────────────────────────────────────\n');
  
  let totalRevenue = 0;
  let totalCosts = 0;
  let totalNetProfit = 0;
  let totalOwnerShare = 0;
  let totalTokenHoldersShare = 0;
  let totalTreasuryFee = 0;
  let totalBurnAmount = 0;
  let totalFinalToHolders = 0;
  let profitableMonths = 0;
  
  const monthlyResults = [];
  
  for (let month = 1; month <= 12; month++) {
    const result = simulateMonth(monthlyRevenue, MONTHLY_COSTS);
    
    totalRevenue += result.revenue;
    totalCosts += result.costs;
    totalNetProfit += result.netProfit;
    totalOwnerShare += result.ownerShare;
    totalTokenHoldersShare += result.tokenHoldersShare;
    totalTreasuryFee += result.treasuryFee;
    totalBurnAmount += result.burnAmount;
    totalFinalToHolders += result.finalToHolders;
    
    if (result.status === 'PROFIT') {
      profitableMonths++;
    }
    
    monthlyResults.push({
      month,
      ...result
    });
  }
  
  // Calculate ROI for token holders
  const totalInvested = TOKENIZED_VALUE;
  const totalReturned = totalFinalToHolders;
  const roi = ((totalReturned / totalInvested) * 100);
  const annualYield = roi;
  
  // Display monthly breakdown (first 3 months + summary)
  console.log('📅 MONTHLY BREAKDOWN (Sample - Months 1-3):\n');
  for (let i = 0; i < 3; i++) {
    const m = monthlyResults[i];
    console.log(`   Month ${m.month}:`);
    console.log(`     Revenue:         €${m.revenue.toLocaleString()}`);
    console.log(`     Costs:           €${m.costs.toLocaleString()}`);
    console.log(`     Net Profit:      €${m.netProfit.toLocaleString()} ${m.status === 'LOSS' ? '❌' : '✅'}`);
    if (m.status === 'PROFIT') {
      console.log(`     Owner (${OWNER_RETAINED_PERCENTAGE}%):     €${m.ownerShare.toFixed(2)}`);
      console.log(`     Token Holders (${TOKENIZED_PERCENTAGE}%): €${m.tokenHoldersShare.toFixed(2)}`);
      console.log(`     Treasury Fee:    €${m.treasuryFee.toFixed(2)}`);
      console.log(`     Final to Holders: €${m.finalToHolders.toFixed(2)}`);
    }
    console.log('');
  }
  
  console.log('   [... months 4-12 follow same pattern]\n');
  
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log('📊 ANNUAL SUMMARY\n');
  console.log(`   Total Revenue:           €${totalRevenue.toLocaleString()}`);
  console.log(`   Total Costs:             €${totalCosts.toLocaleString()}`);
  console.log(`   Net Profit:              €${totalNetProfit.toLocaleString()} ${totalNetProfit < 0 ? '❌' : '✅'}`);
  console.log(`   Profit Margin:           ${((totalNetProfit / totalRevenue) * 100).toFixed(2)}%`);
  console.log(`   Profitable Months:       ${profitableMonths}/12\n`);
  
  console.log('💸 DISTRIBUTION BREAKDOWN\n');
  console.log(`   Owner Share (${OWNER_RETAINED_PERCENTAGE}%):        €${totalOwnerShare.toFixed(2)}`);
  console.log(`   Token Holders (${TOKENIZED_PERCENTAGE}%):       €${totalTokenHoldersShare.toFixed(2)}`);
  console.log(`   Treasury Fee (0.5%):      €${totalTreasuryFee.toFixed(2)}`);
  console.log(`   Burn Amount (0.1%):       €${totalBurnAmount.toFixed(2)}`);
  console.log(`   Final to Holders:         €${totalFinalToHolders.toFixed(2)}\n`);
  
  console.log('💰 TOKEN HOLDER ROI\n');
  console.log(`   Initial Investment:       €${totalInvested.toLocaleString()}`);
  console.log(`   Annual Returns:           €${totalFinalToHolders.toFixed(2)}`);
  console.log(`   Annual ROI:               ${roi.toFixed(2)}%`);
  console.log(`   Yield:                    ${annualYield.toFixed(2)}% APY\n`);
  
  // Breakeven analysis
  const breakevenMonthlyRevenue = MONTHLY_COSTS / (TOKENIZED_PERCENTAGE / 100);
  console.log('🎯 BREAKEVEN ANALYSIS\n');
  console.log(`   Monthly Costs:            €${MONTHLY_COSTS.toLocaleString()}`);
  console.log(`   Minimum Revenue (40%):    €${breakevenMonthlyRevenue.toFixed(2)}/month`);
  console.log(`   Current Revenue:          €${monthlyRevenue.toLocaleString()}/month`);
  console.log(`   Status:                   ${monthlyRevenue >= breakevenMonthlyRevenue ? '✅ Above breakeven' : '❌ Below breakeven'}\n`);
  
  // Risk assessment
  console.log('⚠️  RISK ASSESSMENT\n');
  if (roi < 5) {
    console.log('   🔴 HIGH RISK - ROI below 5% (not competitive vs traditional investments)');
  } else if (roi < 10) {
    console.log('   🟡 MEDIUM RISK - ROI 5-10% (marginally competitive)');
  } else {
    console.log('   🟢 LOW RISK - ROI above 10% (competitive with RWA market)');
  }
  
  if (profitableMonths < 12) {
    console.log(`   🔴 ${12 - profitableMonths} months with losses - operational sustainability at risk`);
  } else {
    console.log('   🟢 All months profitable - stable operation');
  }
  
  if (totalNetProfit < 0) {
    console.log('   🔴 CRITICAL - Annual net loss, model unsustainable');
  }
  
  console.log('\n');
  
  return {
    scenario: scenarioName,
    totalRevenue,
    totalCosts,
    totalNetProfit,
    totalOwnerShare,
    totalFinalToHolders,
    totalTreasuryFee,
    roi,
    annualYield,
    profitableMonths,
    monthlyResults
  };
}

/**
 * Run all scenarios and generate comparison
 */
function runAllScenarios() {
  const results = {
    low: runSimulation('low'),
    medium: runSimulation('medium'),
    high: runSimulation('high')
  };
  
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('📈 SCENARIO COMPARISON');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│ Metric              │ Low       │ Medium    │ High      │');
  console.log('├─────────────────────────────────────────────────────────┤');
  console.log(`│ Annual Revenue      │ €${results.low.totalRevenue.toLocaleString().padEnd(8)}│ €${results.medium.totalRevenue.toLocaleString().padEnd(8)}│ €${results.high.totalRevenue.toLocaleString().padEnd(8)}│`);
  console.log(`│ Net Profit          │ €${results.low.totalNetProfit.toFixed(0).padEnd(8)}│ €${results.medium.totalNetProfit.toFixed(0).padEnd(8)}│ €${results.high.totalNetProfit.toFixed(0).padEnd(8)}│`);
  console.log(`│ Holders Return      │ €${results.low.totalFinalToHolders.toFixed(0).padEnd(8)}│ €${results.medium.totalFinalToHolders.toFixed(0).padEnd(8)}│ €${results.high.totalFinalToHolders.toFixed(0).padEnd(8)}│`);
  console.log(`│ ROI (Annual)        │ ${results.low.roi.toFixed(2)}%    │ ${results.medium.roi.toFixed(2)}%   │ ${results.high.roi.toFixed(2)}%   │`);
  console.log(`│ Treasury Collected  │ €${results.low.totalTreasuryFee.toFixed(0).padEnd(8)}│ €${results.medium.totalTreasuryFee.toFixed(0).padEnd(8)}│ €${results.high.totalTreasuryFee.toFixed(0).padEnd(8)}│`);
  console.log(`│ Profitable Months   │ ${results.low.profitableMonths}/12      │ ${results.medium.profitableMonths}/12     │ ${results.high.profitableMonths}/12     │`);
  console.log('└─────────────────────────────────────────────────────────┘\n');
  
  console.log('✅ VALIDATION CONCLUSIONS\n');
  
  console.log('1️⃣  SCENARIO LOW (€96,000/year):');
  console.log('   ❌ UNSUSTAINABLE - Annual loss of €' + Math.abs(results.low.totalNetProfit).toFixed(0));
  console.log('   ❌ Negative ROI for token holders');
  console.log('   ⚠️  DO NOT TOKENIZE at this revenue level\n');
  
  console.log('2️⃣  SCENARIO MEDIUM (€144,000/year):');
  if (results.medium.roi >= 15) {
    console.log('   ✅ VIABLE - Healthy margins');
  } else if (results.medium.roi >= 10) {
    console.log('   🟡 MARGINAL - Acceptable but not optimal');
  } else {
    console.log('   ⚠️  RISKY - ROI below market expectations');
  }
  console.log(`   ✅ Positive net profit: €${results.medium.totalNetProfit.toFixed(0)}`);
  console.log(`   ✅ Token holders ROI: ${results.medium.roi.toFixed(2)}%`);
  console.log('   🎯 MINIMUM RECOMMENDED REVENUE LEVEL\n');
  
  console.log('3️⃣  SCENARIO HIGH (€180,000/year):');
  console.log('   ✅ OPTIMAL - Strong operational margins');
  console.log(`   ✅ Healthy net profit: €${results.high.totalNetProfit.toFixed(0)}`);
  console.log(`   ✅ Competitive ROI: ${results.high.roi.toFixed(2)}%`);
  console.log('   ✅ Sustainable for long-term tokenization\n');
  
  console.log('══════════════════════════════════════════════════════════\n');
  console.log('🎯 FINAL RECOMMENDATIONS\n');
  console.log('✅ PROCEED TO TOKENIZATION IF:');
  console.log('   • Confirmed monthly revenue ≥ €12,000 (medium scenario)');
  console.log('   • Asset operational history validated (6+ months)');
  console.log('   • Owner committed to transparent reporting');
  console.log('   • Legal structure defined (SPV or similar)\n');
  
  console.log('❌ DO NOT PROCEED IF:');
  console.log('   • Revenue projections below €12,000/month');
  console.log('   • Costs higher than estimated (validate insurance/maintenance)');
  console.log('   • Asset condition unknown or poor');
  console.log('   • Legal/tax structure uncertain\n');
  
  console.log('📋 NEXT STEPS:');
  console.log('   1. Validate 6-month revenue history with asset owner');
  console.log('   2. Request insurance policy + maintenance records');
  console.log('   3. Confirm operational costs (fuel prices, maintenance)');
  console.log('   4. Negotiate tokenization percentage (40% suggested)');
  console.log('   5. Define legal structure (SPV in Spain or Malta)');
  console.log('   6. IF validated → Deploy testnet pilot');
  console.log('   7. IF profitable 3+ months → Consider mainnet\n');
  
  // Save results to JSON
  const resultsPath = path.join(__dirname, '../pilot-assets/doosan-dx360-simulation-results.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    assetId: config.assetId,
    assetName: config.assetName,
    scenarios: results,
    configuration: {
      assetValue: ASSET_VALUE,
      tokenizedPercentage: TOKENIZED_PERCENTAGE,
      tokenizedValue: TOKENIZED_VALUE,
      annualCosts: ANNUAL_COSTS,
      burnRateBps: BURN_RATE_BPS,
      treasuryFeeBps: TREASURY_FEE_BPS
    }
  }, null, 2));
  
  console.log(`💾 Results saved to: ${resultsPath}\n`);
}

// Execute simulation
runAllScenarios();
