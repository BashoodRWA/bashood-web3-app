# 📊 FINANCIAL MODEL - BASHOOD RWA

**Excel Template Instructions + CSV Data**  
**Fecha:** 16 Febrero 2026  
**Objetivo:** 3-5 year financial projections para audit + fundraising

---

## 🎯 OVERVIEW

Este documento contiene:
1. **Instructions** para crear Excel financial model
2. **CSV data templates** (copy-paste a Excel)
3. **Formulas** para income statement, balance sheet, cash flow
4. **Assumptions** documentados

---

## 📋 EXCEL STRUCTURE (Sheets Requeridos)

### Sheet 1: Assumptions
### Sheet 2: Income Statement (5 years)
### Sheet 3: Balance Sheet (5 years)
### Sheet 4: Cash Flow Statement (5 years)
### Sheet 5: Metrics & KPIs
### Sheet 6: Scenario Analysis (Bear/Base/Bull)

---

## 📊 SHEET 1: ASSUMPTIONS

Crea estos assumptions (drivers del modelo):

```csv
Assumption,Unit,2026,2027,2028,2029,2030,Notes
REVENUE ASSUMPTIONS,,,,,,
Registered Users,#,5000,15000,50000,120000,200000,User growth assumptions
RWA NFTs Minted,#,1000,3000,8000,18000,25000,Asset tokenization growth
Avg Asset Value,USD,50000,55000,60000,65000,70000,Average RWA value
Trading Volume (Total),USD,10000000,30000000,80000000,180000000,200000000,Secondary market
Average Minting Fee,%,0.40%,0.35%,0.30%,0.25%,0.25%,Fee as % of asset value
Trading Fee,%,2.50%,2.50%,2.30%,2.30%,2.00%,Platform fee on trades
Fractional Assets Created,#,500,1200,3000,7000,10000,Fractionalization adoption
Oracle Updates per NFT,#/month,0.5,1,2,3,4,Price/telemetry updates
,,,,,,
EXPENSE ASSUMPTIONS,,,,,,
Dev Team Headcount,#,5,10,15,20,25,Engineers + product
Avg Dev Salary,USD,120000,125000,130000,135000,140000,Fully loaded cost
Ops Team Headcount,#,3,5,8,12,15,Operations + support
Avg Ops Salary,USD,80000,85000,90000,95000,100000,Fully loaded
Marketing Budget,% revenue,20%,20%,20%,18%,15%,As % of total revenue
Legal/Compliance,USD,150000,100000,200000,250000,300000,Audits + counsel
Infrastructure,USD/month,5000,10000,20000,30000,40000,AWS + tools + licenses
,,,,,,
TOKEN ECONOMICS,,,,,,
Token Price (avg),USD,0.002,0.010,0.025,0.050,0.100,Market price $BASHOOD
Circulating Supply,tokens,450M,550M,650M,750M,850M,Vesting releases
Market Cap,USD,900000,5500000,16250000,37500000,85000000,Price × Circulating
Staking APY,%,10%,10%,9%,8%,8%,Rewards %
Staking Participation,%,20%,30%,40%,50%,55%,% of supply staked
```

**INSTRUCTIONS:**
1. Copy above table to Excel Sheet 1
2. Name cells: e.g., B4 = "Users_2026", C4 = "Users_2027"
3. Use these named ranges in other sheets

---

## 📊 SHEET 2: INCOME STATEMENT (PROFIT & LOSS)

```csv
Income Statement (USD),2026,2027,2028,2029,2030
REVENUES,,,,,
Preventa (One-time),700000,0,0,0,0
RWA Minting Fees,500000,1200000,2500000,5000000,7000000
Trading Fees (2.5%),250000,750000,2000000,4500000,5000000
Fractional Creation Fees,100000,300000,800000,2000000,2500000
Oracle & Telemetry Services,30000,150000,400000,1000000,1500000
Staking Fees,0,50000,200000,400000,500000
Other Revenue,0,0,100000,300000,500000
TOTAL REVENUE,1580000,2450000,6000000,13200000,17000000
,,,,,
COST OF REVENUE,,,,,
Oracle Costs (Chainlink),10000,40000,100000,200000,300000
Gas Fees (Polygon),5000,15000,40000,80000,100000
Payment Processing,20000,35000,90000,200000,250000
TOTAL COGS,35000,90000,230000,480000,650000
,,,,,
GROSS PROFIT,1545000,2360000,5770000,12720000,16350000
Gross Margin %,97.8%,96.3%,96.2%,96.4%,96.2%
,,,,,
OPERATING EXPENSES,,,,,
Research & Development,,,,,
- Dev Team Salaries,600000,1250000,1950000,2700000,3500000
- Infrastructure,60000,120000,240000,360000,480000
- Tools & Licenses,20000,30000,50000,80000,100000
Total R&D,680000,1400000,2240000,3140000,4080000
,,,,,
Sales & Marketing,,,,,
- Marketing Budget,316000,490000,1200000,2376000,2550000
- Community Management,40000,80000,120000,180000,240000
- Partnerships,50000,100000,200000,300000,400000
Total S&M,406000,670000,1520000,2856000,3190000
,,,,,
General & Administrative,,,,,
- Ops Team Salaries,240000,425000,720000,1140000,1500000
- Legal & Compliance,150000,100000,200000,250000,300000
- Accounting & Audit,40000,60000,80000,100000,120000
- Insurance (D&O, Cyber),30000,50000,80000,120000,150000
- Office & Admin,20000,40000,60000,90000,120000
Total G&A,480000,675000,1140000,1700000,2190000
,,,,,
TOTAL OPERATING EXPENSES,1566000,2745000,4900000,7696000,9460000
,,,,,
EBITDA,-21000,-385000,870000,5024000,6890000
EBITDA Margin %,-1.3%,-15.7%,14.5%,38.1%,40.5%
,,,,,
Depreciation & Amortization,10000,20000,30000,40000,50000
,,,,,
EBIT (Operating Profit),-31000,-405000,840000,4984000,6840000
EBIT Margin %,-2.0%,-16.5%,14.0%,37.8%,40.2%
,,,,,
Interest Income (Treasury),5000,15000,40000,100000,150000
,,,,,
NET INCOME (LOSS),-26000,-390000,880000,5084000,6990000
Net Margin %,-1.6%,-15.9%,14.7%,38.5%,41.1%
```

**FORMULAS (Excel):**
```excel
# TOTAL REVENUE (B8)
=SUM(B2:B7)

# GROSS PROFIT (B14)
=B8-B12

# Gross Margin % (B15)
=B14/B8

# EBITDA (B32)
=B14-B31

# EBITDA Margin (B33)
=B32/B8

# NET INCOME (B40)
=B37+B39
```

**NOTES:**
- Year 1 Loss expected (investment phase)
- Year 2 Loss OK (scaling)
- Year 3+ Profitable (scale economics)

---

## 📊 SHEET 3: BALANCE SHEET

```csv
Balance Sheet (USD),2026,2027,2028,2029,2030
ASSETS,,,,,
Current Assets,,,,,
Cash & Cash Equivalents,300000,500000,2000000,8000000,16000000
Accounts Receivable,20000,40000,100000,220000,300000
Prepaid Expenses,10000,20000,40000,60000,80000
Total Current Assets,330000,560000,2140000,8280000,16380000
,,,,,
Non-Current Assets,,,,,
Token Treasury (200M @ market),400000,2000000,5000000,10000000,20000000
RWA NFT Inventory (platform owned),5000000,8000000,15000000,30000000,45000000
Property & Equipment,50000,80000,120000,180000,250000
Intangible Assets (IP),100000,150000,200000,250000,300000
Total Non-Current Assets,5550000,10230000,20320000,40430000,65550000
,,,,,
TOTAL ASSETS,5880000,10790000,22460000,48710000,81930000
,,,,,
LIABILITIES,,,,,
Current Liabilities,,,,,
Accounts Payable,50000,80000,150000,250000,350000
Accrued Expenses,40000,70000,130000,220000,300000
Deferred Revenue,10000,30000,80000,150000,200000
Total Current Liabilities,100000,180000,360000,620000,850000
,,,,,
Non-Current Liabilities,,,,,
Unvested Tokens (liability),4000000,3500000,3000000,2500000,2000000
Total Non-Current Liabilities,4000000,3500000,3000000,2500000,2000000
,,,,,
TOTAL LIABILITIES,4100000,3680000,3360000,3120000,2850000
,,,,,
EQUITY,,,,,
Founder Equity (if applicable),1780000,1780000,1780000,1780000,1780000
Retained Earnings,0,-26000,-416000,464000,5548000
Current Year P&L,-26000,-390000,880000,5084000,6990000
Token Treasury Reserve,400000,2000000,5000000,10000000,20000000
Accumulated Other Income,26000,46000,856000,5262000,12752000
Total Equity,1780000,7110000,19100000,45590000,79080000
,,,,,
TOTAL LIABILITIES + EQUITY,5880000,10790000,22460000,48710000,81930000
```

**BALANCE CHECK:**
- Total Assets MUST EQUAL Total Liabilities + Equity
- If not balanced, check formulas

**FORMULAS (Excel):**
```excel
# Total Assets (B13)
=SUM(B5,B12)

# Total Liabilities (B23)
=SUM(B18,B22)

# Total Equity (B31)
=B28+B29+B30

# Check balance (B33)
=IF(B13=B33,"BALANCED","ERROR")
```

---

## 📊 SHEET 4: CASH FLOW STATEMENT

```csv
Cash Flow Statement (USD),2026,2027,2028,2029,2030
OPERATING ACTIVITIES,,,,,
Net Income,-26000,-390000,880000,5084000,6990000
Adjustments:,,,,,
+ Depreciation & Amortization,10000,20000,30000,40000,50000
+ Stock-based Compensation,50000,100000,150000,200000,250000
Changes in Working Capital:,,,,,
- Increase in AR,-20000,-20000,-60000,-120000,-80000
- Increase in Prepaid,-10000,-10000,-20000,-20000,-20000
+ Increase in AP,50000,30000,70000,100000,100000
+ Increase in Accrued,40000,30000,60000,90000,80000
Net Cash from Operations,94000,-240000,1110000,5374000,7370000
,,,,,
INVESTING ACTIVITIES,,,,,
- Purchase of Equipment,-50000,-30000,-40000,-60000,-70000
- RWA NFT Investments,-5000000,-3000000,-7000000,-15000000,-15000000
- Software Development (Capex),-20000,-40000,-60000,-80000,-100000
Net Cash from Investing,-5070000,-3070000,-7100000,-15140000,-15170000
,,,,,
FINANCING ACTIVITIES,,,,,
+ Preventa Proceeds,700000,0,0,0,0
+ Token Sales (if any),0,500000,1000000,2000000,3000000
+ Series A Fundraising (assumed),0,3000000,0,0,0
- Token Buybacks,0,0,-500000,-1000000,-1500000
Net Cash from Financing,700000,3500000,500000,1000000,1500000
,,,,,
NET CHANGE IN CASH,-4276000,190000,-5490000,-8766000,-6300000
Cash at Beginning,4576000,300000,490000,-5000000,-13766000
CASH AT END OF PERIOD,300000,490000,-5000000,-13766000,-20066000
```

**⚠️ CASH FLOW PROBLEM IDENTIFIED:**
- Year 3-5: NEGATIVE cash (deficit)
- Reason: High RWA NFT investments
- **SOLUTION:** Reduce NFT investments OR raise more funds

**ADJUSTED (Conservative):**
- Reduce RWA investments to match revenue
- OR: Raise Series A in 2027 ($3M-$5M)

---

## 📊 SHEET 5: METRICS & KPIs

```csv
Key Metrics,2026,2027,2028,2029,2030
USERS & ADOPTION,,,,,
Total Registered Users,5000,15000,50000,120000,200000
% YoY Growth,-,200%,233%,140%,67%
RWA NFTs Minted (cumulative),1000,4000,12000,30000,55000
% YoY Growth,-,300%,200%,150%,83%
Active Users (monthly),%MAU,2000,6000,20000,60000,120000
,,,,,
REVENUE METRICS,,,,,
ARPU (Avg Revenue Per User),USD,316,163,120,110,85
Revenue per NFT,USD,1580,613,500,440,309
Trading Volume,USD,10000000,30000000,80000000,180000000,200000000
Take Rate (fees/volume),%,4.0%,4.0%,3.6%,3.6%,3.4%
,,,,,
PROFITABILITY,,,,,
Gross Margin,%,97.8%,96.3%,96.2%,96.4%,96.2%
EBITDA Margin,%,-1.3%,-15.7%,14.5%,38.1%,40.5%
Net Margin,%,-1.6%,-15.9%,14.7%,38.5%,41.1%
Cash Burn (monthly),USD,-356333,-20000,375000,1342000,1831667
Months Runway (if no fundraising),months,0.8,-,5.3,5.9,8.7
,,,,,
UNIT ECONOMICS,,,,,
CAC (Customer Acquisition Cost),USD,81,45,30,25,17
LTV (Lifetime Value - 3 yr),USD,948,489,360,330,255
LTV / CAC Ratio,ratio,11.7,10.9,12.0,13.2,15.0
Payback Period,months,3.1,3.3,3.0,2.7,2.4
,,,,,
TEAM & EFFICIENCY,,,,,
Total Headcount,#,8,15,23,32,40
Revenue per Employee,USD,197500,163333,260870,412500,425000
Profit per Employee,USD,-3250,-26000,38261,158875,174750
```

**FORMULAS (Excel):**
```excel
# ARPU (B6)
=RevenueTOTAL / Users

# Take Rate (B11)
=TradingFees / TradingVolume

# Cash Burn monthly (B17)
=NetIncome / 12

# LTV/CAC (B22)
=B21 / B20

# Revenue per Employee (B27)
=TotalRevenue / Headcount
```

---

## 📊 SHEET 6: SCENARIO ANALYSIS

### SCENARIO 1: BEAR CASE (Crypto Winter)

```csv
Bear Case - Assumptions,2026,2027,2028,2029,2030
Users (50% slower growth),5000,10000,25000,50000,80000
NFTs Minted (50% slower),1000,2000,5000,10000,15000
Trading Volume (70% lower),3000000,9000000,24000000,54000000,60000000
Token Price (50% lower),0.001,0.005,0.013,0.025,0.050
,,,,,
BEAR CASE - REVENUE,,,,,
Total Revenue,950000,1470000,3600000,7920000,10200000
EBITDA,-500000,-700000,200000,2500000,3500000
Net Income,-520000,-730000,160000,2400000,3350000
Cash Position,-4500000,-4000000,-3000000,1000000,6000000
```

**KEY RISKS - BEAR:**
- 🔴 Cash runs out Year 2-3
- 🔴 MUST raise Series A ($3M+) by Q4 2027
- 🔴 OR cut burn rate (reduce team, marketing)

---

### SCENARIO 2: BASE CASE (Stable Market)

**This is the main model above** ✅

---

### SCENARIO 3: BULL CASE (Crypto Summer)

```csv
Bull Case - Assumptions,2026,2027,2028,2029,2030
Users (2x faster growth),5000,20000,80000,200000,350000
NFTs Minted (2x faster),1000,4000,12000,30000,50000
Trading Volume (2x higher),20000000,60000000,160000000,360000000,400000000
Token Price (2x higher),0.004,0.020,0.050,0.100,0.200
,,,,,
BULL CASE - REVENUE,,,,,
Total Revenue,3160000,4900000,12000000,26400000,34000000
EBITDA,900000,1000000,5500000,14000000,20000000
Net Income,880000,950000,5400000,13800000,19750000
Cash Position,-3000000,1500000,8000000,25000000,50000000
```

**KEY BENEFITS - BULL:**
- ✅ Profitable Year 1
- ✅ No additional fundraising needed
- ✅ Can self-fund growth from cash flow

---

## 💡 HOW TO USE THIS MODEL

### Step 1: Create Excel File
1. Open Excel (or Google Sheets)
2. Create 6 sheets (Assumptions, Income, Balance, Cash Flow, Metrics, Scenarios)
3. Copy-paste CSV tables above into each sheet

### Step 2: Link Formulas
1. Name cells in Assumptions sheet (e.g., "Users_2026")
2. Reference these in Income Statement (e.g., `=Minting_Fees_2026`)
3. Link Income → Balance → Cash Flow

### Step 3: Add Formatting
1. Use colors: Revenue (green), Expenses (red), Profit (blue)
2. Bold headers
3. Number format: Currency ($), Percent (%), Comma separator

### Step 4: Validate
1. Check balance sheet balances: Assets = Liabilities + Equity
2. Check cash flow ties to balance sheet: End Cash = Beginning + Net Change
3. Check income statement ties to balance sheet: Net Income → Retained Earnings

### Step 5: Sensitivity Analysis
1. Change key assumptions (Users growth, Token price)
2. See impact on EBITDA, Net Income, Cash
3. Create 3 scenarios: Bear, Base, Bull

---

## 🚨 CRITICAL ASSUMPTIONS TO VALIDATE

**With Auditor:**
- [ ] Revenue assumptions realistic? (compare to Ondo, Backed)
- [ ] Expense ratios reasonable? (40% R&D, 25% S&M, 30% G&A)
- [ ] Token price assumptions? (depend on market)
- [ ] Vesting liability calculation correct?

**With Investors:**
- [ ] LTV/CAC ratio acceptable? (3:1 minimum, we have 11:1 ✅)
- [ ] Payback period? (< 6 months ideal, we have 3 months ✅)
- [ ] Gross margin? (> 70% SaaS standard, we have 97% ✅)
- [ ] Path to profitability? (Year 3 ✅)

---

## 📋 DELIVERABLES CHECKLIST

- [ ] Excel file with 6 sheets
- [ ] All formulas working (no #REF errors)
- [ ] Balance sheet balanced
- [ ] Cash flow ties to balance sheet
- [ ] 3 scenarios (Bear, Base, Bull)
- [ ] Charts/graphs (Revenue, EBITDA, Cash)
- [ ] Assumptions documented
- [ ] Sensitivity analysis tables

---

## 🎯 OPTION 1: HIRE FREELANCER

**Where:** Upwork.com, Toptal.com  
**Search:** "crypto financial model" or "SaaS financial model"  
**Budget:** $15k-$25k  
**Timeline:** 2 weeks  
**Deliverable:** Fully built Excel model + 1-hour walkthrough

**Job Posting Template:**
```
Title: Financial Model for Crypto/RWA Startup ($15k, 2 weeks)

Description:
We are seeking an experienced financial modeler to build a 3-5 year financial projection model for our RWA tokenization platform (Polygon-based, $700k raised).

Deliverables:
- Excel model (6 sheets: Assumptions, P&L, Balance Sheet, Cash Flow, Metrics, Scenarios)
- 3 scenario analysis (Bear, Base, Bull)
- Unit economics (LTV, CAC, payback)
- Token economics integration (vesting, treasury)
- Charts & visualizations
- 1-hour walkthrough call

Requirements:
- Experience with crypto/blockchain startups (MUST)
- Advanced Excel/Google Sheets (formulas, named ranges, data validation)
- Understanding of token economics
- Prior SaaS/marketplace financial models
- Available to start immediately, deliver in 2 weeks

Budget: $15,000 fixed price
Timeline: 2 weeks from award

To apply:
1. Share 2-3 prior financial model examples (crypto preferred)
2. Explain your process (1-2 paragraphs)
3. Confirm availability (days to start, hours per week)
4. Proposed timeline (milestones)
```

---

## 🎯 OPTION 2: DIY (Save $15k, Cost 40 hours)

**If you have Excel skills:**
1. Download YC Startup Model Template (free)
2. Customize with BASHOOD data (use CSV tables above)
3. Add token economics sheet
4. Validate formulas (test scenarios)
5. Get feedback from CFO/advisor

**Timeline:**
- Day 1-2: Setup structure (8 hours)
- Day 3-4: Input data & formulas (12 hours)
- Day 5-6: Scenarios & validation (10 hours)
- Day 7: Charts, formatting, documentation (10 hours)
- **Total: 40 hours (5 days full-time)**

---

## ✅ VALIDATION CHECKLIST (Before Sending to Auditor)

- [ ] All sheets present (6 sheets)
- [ ] Balance sheet balances every year
- [ ] Cash flow ties to balance sheet
- [ ] No #REF, #DIV/0, #VALUE errors
- [ ] Assumptions documented with sources
- [ ] 3 scenarios present (Bear, Base, Bull)
- [ ] Charts included (Revenue, EBITDA, Cash)
- [ ] Cell references use named ranges (not A1 notation)
- [ ] Model is "audit-ready" (clear, organized, professional)

---

**RECOMMENDATION:** Hire freelancer ($15k) unless you have strong Excel+finance background.

**TIMELINE:** Start Monday (Feb 17), deliver Monday (Mar 3) = 2 weeks ✅

**Next Step:** Post job on Upwork TODAY or start DIY Monday 🚀
