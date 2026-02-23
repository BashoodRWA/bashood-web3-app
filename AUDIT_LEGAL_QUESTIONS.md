# ⚖️ AUDIT: LEGAL QUESTIONS FRAMEWORK

**Preguntas Específicas para Abogado de Criptomonedas Suizo**  
**Fecha:** 17 Febrero 2026  
**Estado:** CONFIDENTIAL - Para Consulta Jurídica  
**Objetivo:** Validar si correcciones narrativas permiten defensa de "utility token" bajo MiCA + Howey

---

## 📋 ESTRUCTURA

```
SECCIÓN A: Howey Test Defense Questions (US Regulatory)
SECCIÓN B: MiCA Compliance Questions (Swiss/EU Regulatory)
SECCIÓN C: Narrative Remediation Validation (Technical Structure)
SECCIÓN D: Implementation & Timeline Questions
SECCIÓN E: Risk Mitigation & Safe Harbor Questions
```

---

## SECCIÓN A: HOWEY TEST DEFENSE QUESTIONS

### Context for Lawyer:
Bashood is an ERC20 token (BHT) for a decentralized tokenization protocol. Current documentation claims utility but contains problematic language suggesting economic returns. We are proposing narrative corrections to establish Howey defense. Questions below validate if corrections are sufficient.

---

### A.1 - Investment of Money Prong

**PREGUNTA A.1.1:**
```
Current problematic language: "Democratizando el acceso a activos industriales 
de alto valor mediante tokenización" + "$250k asset fractionalized to $100 shares"

Proposed correction: "Protocolo descentralizado para tokenización de activos del 
mundo real" + "NFTs represent governance participation, not asset ownership"

Legal Question:
If we completely reframe narrative from "fractional asset ownership" to 
"governance infrastructure," can we credibly defend that primary motivation is 
NOT investment but protocol functionality?

Follow-up:
- How explicit must the distinction be in legal documents?
- Are disclaimers sufficient, or must narrative be restructured entirely?
- What is the "bright line" between "investment" and "utility use"?
```

**Why This Matters:**
The word "inversión" (investment) in Spanish vs "participación" (participation) in English has different regulatory connotations. European courts weigh language heavily.

**Expected Lawyer Response Type:**
- MiCA Article 2(3) quote on utility tokens
- Case law examples (Telegram case, BlockchainLabOrg, etc.)
- Specific disclaimers required in white paper

---

### A.1.2

**PREGUNTA A.1.2:**
```
Current implementation: Users buy BHT with ETH/USD, transfers managed by smart contract

Question:
In FINMA/OFSI's view, is "investment of money" satisfied if:
a) User spends ETH (blockchain-native asset) to buy BHT
b) No fiat conversion happens on-ramp (peer-to-peer DEX trades)
c) No promise of return is made in any document

Or does the mere ability to trade on DEX satisfy "exchange of value that is 
sufficient monetary contribution"?

Follow-up:
- Does on-ramp vs off-ramp fiat exposure change classification?
- If token is only tradeable on DEX (no CEX listing), does this reduce 
  "investment" characterization?
```

**Why This Matters:**
Some regulators treat blockchain-native trades differently from fiat investments.

---

### A.2 - Common Enterprise Prong

**PREGUNTA A.2.1:**
```
Current problematic structure: "Viviendas 3D project" + "Proyecto Valhalla" 
creates explicit nexus between token holding and specific projects

Proposed structure: Generic "protocol for tokenization" with NO specific projects

Legal Question:
If we COMPLETELY REMOVE all project-specific language:
- "Viviendas 3D Valencia"
- "5 casas con financiación BHT"  
- "Proyecto Valhalla árboles"
- "60/30/10 fund allocation to construction"

And replace with: "Protocol enables tokenization of various RWA categories, 
explored generically without specific project commitment"

Can we credibly defend that there is NO "common enterprise" between BHT holders?

In other words: Is the protocol itself the "enterprise," or is each 
tokenization activity separate?

Follow-up:
- What constitutes "common enterprise" in crypto context?
- Does Howey require ALL holders to participate in same enterprise, 
  or can protocol be multiple separate enterprises?
- Is there precedent for "generic platform = no common enterprise"?
```

**Why This Matters:**
Removing specific projects is the biggest change. Need to confirm it moves the needle on Common Enterprise.

---

### A.2.2

**PREGUNTA A.2.2:**
```
Current structure: DAO has control over fund allocation, treasury management, 
parameter changes

Question:
Does DAO governance satisfy "common enterprise" reduction by:
a) Ensuring no single entity controls outcomes
b) Distributing control to token holders
c) Making "enterprise" decisions community-based vs team-based

Or does DAO still constitute "common enterprise" because outcomes depend on 
collective action (which is still "efforts of others")?

Follow-up:
- What's the difference between "DAO-controlled" and "investor syndicate" 
  from regulatory perspective?
- Does community vote = reduced "efforts of others" exposure?
```

**Why This Matters:**
DAO governance might help OR hurt depending on how regulator views it.

---

### A.3 - Expectation of Profits Prong

**PREGUNTA A.3.1:**
```
Current problematic language:
- "Staking Rewards - APY: 8-12%"
- "Revenue projections: $1.58M year 1 → $13.5M year 5"
- "Distribution from protocol treasury to holders"

Proposed correction:
- "Variable staking incentives funded from treasury (NOT guaranteed)"
- Remove revenue projection table entirely, replace with operations disclosure
- Add explicit: "No profit distribution to token holders"
- Add: "Any distribution requires DAO vote and is never guaranteed"

Legal Question:
Can we sufficient defend "no expectation of profits" if we:
1. Remove ALL financial projections
2. Remove ALL mentions of "returns," "rewards," "yields," "APY"
3. Add explicit disclaimer: "Holding BHT provides NO economic benefits"
4. Restructure staking as "governance incentive" not "profit sharing"

What additional steps are required beyond documentation changes?

Follow-up:
- Is removal of APY language sufficient alone, or must we change code behavior?
- If smart contract still distributes treasury fees, can we defend "no profit expectation" 
  while code does the distributing?
- What's the relationship between narrative and smart contract code in regulatory analysis?
```

**Why This Matters:**
This is the EASIEST prong to fix (narrative-only), but must validate it's sufficient.

---

### A.3.2

**PREGUNTA A.3.2:**
```
Current structure: Trading fees collected on secondary market
- Buyer pays 2.5% fee
- Seller pays 0% fee
- Fee goes to protocol treasury

Question:
Even with "no profit distribution" promise, does the ABILITY to 
resell token on secondary market imply "expectation of exit/liquidity profits"?

In other words: "Holder buys at $0.01, can sell on DEX at $0.02 = profit opportunity"

Does this satisfaction of expectation-of-profits even if protocol doesn't 
explicitly distribute funds?

Follow-up:
- Does existence of secondary market inherently create profit expectation?
- How do we distinguish "utility token with liquid market" from "security"?
- What's the SEC/FINMA standard on this specific point?
```

**Why This Matters:**
Secondary market liquidity is unavoidable in DEX environment. Need to understand 
if it alone creates profit expectation.

---

### A.4 - Efforts of Third Parties Prong

**PREGUNTA A.4.1:**
```
Current structure:
- Team develops protocol
- Smart contracts manage transactions
- Treasury generates fees
- DAO votes on distribution

Question:
Can we defend "minimal efforts of third parties" by:
1. Describing token as "pure governance"
2. Removing all project execution language
3. Making clear holders vote, but team executes governance decisions
4. Decentralizing decision-making via DAO

Does this reduce "efforts of third parties" enough to fail the Howey prong?

Follow-up:
- What constitutes "reasonable efforts" that would still fail Howey?
- Is "team maintains protocol" vs "team builds projects" significant distinction?
- How much DAO governance is required to reduce third-party control perception?
```

**Why This Matters:**
This is hardest prong to fix (team MUST develop protocol). Need to understand 
minimum protection required.

---

### A.4.2

**PREGUNTA A.4.2:** 
```
Current problematic element: "Team allocates 60% of presale funds to 3D printer, 
30% to Valencia housing, 10% to marketing"

This explicitly shows team effort in external project execution.

Proposed correction: "Team allocates funds to development/operations per DAO 
governance, no specific external projects."

Question:
Does removal of "specific external projects" (Viviendas 3D, Valhalla) 
significantly reduce "efforts of third parties" exposure?

In regulatory view: Does "team develops tokenization protocol" look different 
from "team executes construction project"?

Follow-up:
- What's the distinction in regulatory analysis?
- If both are team efforts, why would one be safer?
- Is "generic platform efforts" vs "specific project efforts" material distinction?
```

**Why This Matters:**
This contextualizes why removing Viviendas 3D narrative is so important.

---

### A.5 - Integrated Howey Defense

**PREGUNTA A.5.1:**
```
Summary question combining all 4 prongs:

Current state (FAILS HOWEY):
- Investment: ✅ Spending money
- Common Enterprise: ✅ Viviendas 3D project nexus
- Expectation of Profits: ✅ APY 8-12%, revenue projections
- Efforts of Third Parties: ✅ Team builds construction projects
= 4/4 CRITERIA MET → SECURITY

Proposed corrected state:
- Investment: ⚠️ Spending ETH (hard to avoid)
- Common Enterprise: ❓ Generic protocol (not specific projects)
- Expectation of Profits: ✅ Narrative contradicts this → NO profit expectation
- Efforts of Third Parties: ⚠️ Team develops protocol (can't avoid)
= 2/4 CRITERIA (at best) → UTILITY TOKEN?

Legal Question:
If we achieve this state, can we credibly defend BHT as utility token under 
SEC Howey test?

What remaining risks exist?
```

**Why This Matters:**
This is the executive summary question for your lawyer.

---

## SECCIÓN B: MiCA COMPLIANCE QUESTIONS

### Context for Lawyer:
Switzerland is adjacent to EU, follows similar (often stricter) standards. MiCA 
(Markets in Crypto-Assets Regulation) is EU standard. Questions below validate 
Swiss/FINMA interpretation of MiCA Article 2(3) and related provisions.

---

### B.1 - MiCA Article 2(3) "Utility Token" Definition

**PREGUNTA B.1.1:**
```
MiCA Article 2(3): "Utility token means any digital representation of value 
that is not a financial instrument, and which:
(a) is only intended to provide access to a good or service supplied by its issuer
(b) is only accepted by the issuer of that utility token or other offerors of the good or service"

Current Bashood structure:
- BHT = governance token (vote on protocol)
- BHT = fee discount token (2.5% → 1.0% discount)
- BHT = staking token (distribute treasury fees)

Question:
Which of these uses satisfy MiCA Article 2(3)?

a) Governance: Does voting on protocol = "access to good"? Or is it just 
   "collective decision-making"?
b) Fee discount: Does 60% discount fee = "access to good"? Or is it 
   "economic benefit"?
c) Staking distribution: Does treasury distribution = "access to good"? Or is it 
   "profit sharing" (not allowed under MiCA)?

Follow-up:
- Which use case is defensible under MiCA?
- Should we eliminate staking distribution entirely and focus only on governance + fee discount?
- Does fee discount work if we reframe as "VIP membership tier" vs "investment benefit"?
```

**Why This Matters:**
MiCA has much stricter definition than US Howey test. Fee discounts might actually 
FAIL under MiCA even if they work under Howey.

---

### B.1.2

**PREGUNTA B.1.2:**
```
MiCA distinguishes between:
- Utility Token: Access to good/service (OK)
- Financial Instrument Token: Profit-sharing, investment rights (REGULATED)
- Asset-referenced Token: Stable value via reserve (REGULATED)

Current issue: Treasury distribution from fees can be classified as "profit-sharing"

Question:
If we completely eliminate distribution-to-holders language and replace with 
"DAO may vote to burn, reinvest, or reserve treasury," can we avoid 
"profit-sharing" classification?

Does removal of AUTOMATIC distribution to holders (replacing with DAO vote) 
change MiCA classification?

Follow-up:
- Is "DAO votes to reward holders" different from "automatic profit distribution"?
- What's the bright line test used by FINMA for this distinction?
- Are there safe harbor mechanisms in Swiss law?
```

**Why This Matters:**
If automatic distribution fails MiCA, we need to change to governance-based model.

---

### B.2 - FINMA Guidance on Swiss Crypto Regulation

**PREGUNTA B.2.1:**
```
FINMA published guidance on crypto assets (2020) that distinguishes:
- Currency tokens (e.g., Bitcoin)
- Utility tokens (access to service)
- Asset tokens (backed by real assets)

Question:
Under FINMA's current (2026?) guidance:
a) Is a "RWA tokenization protocol" classified as utility token?
b) If tokens backed by real assets (the NFTs), does that change classification 
   from "utility" to "asset token"?
c) What's required in white paper and code to satisfy FINMA classification?

Follow-up:
- Has FINMA updated guidance since 2020?
- Are there specific Swiss court precedents on tokenization protocols?
- What's FINMA's stance on DAO governance as risk mitigation?
```

**Why This Matters:**
FINMA is stricter than some EU regulators. Need to understand Swiss-specific 
interpretation.

---

### B.3 - Swiss Foundation vs Delaware LLC (Regulatory Impact)

**PREGUNTA B.3.1:**
```
Question:
How does choice of legal entity (Swiss Foundation vs Delaware LLC) affect 
MiCA/FINMA compliance?

Specifically:
a) Does Swiss Foundation = automatic MiCA compliance, or does token classification 
   still determine regulatory treatment?
b) Does Delaware LLC mean we fall outside Swiss/EU regulation?
c) If we're Delaware-based but selling to EU/Swiss investors, are we still 
   subject to MiCA?
d) Which structure is better for "utility token" defense?

Follow-up:
- What are compliance costs for each structure?
- Timeline for registration in each jurisdiction?
- What tax implications are relevant?
- If we're aiming for Swiss Foundation, when must we apply (before or after presale)?
```

**Why This Matters:**
Entity structure affects regulatory burden and compliance requirements.

---

## SECCIÓN C: NARRATIVE REMEDIATION VALIDATION

### Context for Lawyer:
We've identified 47 problematic phrases and are proposing specific corrections. 
Below validates if proposed changes are sufficient and legally defensible.

---

### C.1 - Viviendas 3D / Proyecto Valhalla Elimination

**PREGUNTA C.1.1:**
```
Current problematic language (identified in lines 12, 30-55, 80-110, 120-160):
- "Token (BHT) + NFTs + Viviendas 3D + Proyecto Valhalla"
- "60% → INFRAESTRUCTURA (Impresora 3D), 30% → CONSTRUCCIÓN SOCIAL (Valencia), 10% → MARKETING"
- "Primera Comunidad Piloto - Valencia" with specific details ("5 casas", "$350k")
- "Proyecto Valhalla" with supply details ("2,000 árboles", "expansión por demanda")

Proposed action: COMPLETE ELIMINATION of these sections and replacement with:
"Bashood = Protocolo descentralizado para tokenización de activos
The team is exploring potential RWA categories but no specific projects 
are funded or guaranteed."

Legal Question:
Is this elimination sufficient, or do we need:
a) Stronger affirmative language that we're NOT doing these projects?
b) Public statement/press release stating projects abandoned?
c) Documentation of investor notification if we previously promised these projects?

Follow-up:
- What if some investors bought thinking Viviendas 3D was real?
- Do we need refund mechanism or investor communication plan?
- Is elimination enough, or must we publicly renounce projects?
```

**Why This Matters:**
This is the most dramatic narrative change. Need to confirm it's legally sufficient 
and operationally feasible.

---

### C.1.2

**PREGUNTA C.1.2:**
```
Question:
After elimination, what can we STILL say about real-world asset potential?

Safe language examples:
- "Protocol enables tokenization of various RWA categories"
- "Team is researching real estate, industrial equipment, environmental projects"
- "Any future projects would be separately funded and managed"
- "No promised returns from protocol to token holders"

Question: 
What's the maximum "forward-looking" language we can include without 
recreating Howey exposure?

Follow-up:
- Can we mention specific assets (industrial equipment, real estate) as examples?
- Can we show architectural diagrams for potential future use cases?
- Can we discuss team expertise in real estate/construction?
```

**Why This Matters:**
We want to preserve protocol utility narrative while eliminating security langauge.

---

### C.2 - APY / Staking Language Correction

**PREGUNTA C.2.1:**
```
Current problematic language (TOKENOMICS lines ~85):
"Staking Rewards - APY: 8-12% (variable según lockup)
 Lockup 3 meses: 8% APY"

Proposed correction:
"Variable Staking Incentives - The protocol may distribute treasury excess to 
governance token holders. No guaranteed returns. Distribution amounts, frequency, 
and mechanism determined by DAO governance."

Question:
Is this language change sufficient, or must code also be changed?

Specifically:
a) If smart contract AUTOMATICALLY distributes to stakers, does narrative 
   disclaimer overcome code behavior?
b) Or must contract require explicit DAO vote before ANY distribution?
c) What's the regulatory view: Narrative > Code, or Code > Narrative?

Follow-up:
- Should we eliminate automatic staking rewards entirely?
- Is DAO-gated distribution safer than automatic distribution + disclaimer?
- What does contract code currently do?
```

**Why This Matters:**
If code contradicts narrative, we have a bigger problem than just rewriting docs.

---

### C.2.2

**PREGUNTA C.2.2:**
```
Question:
If we remove staking rewards entirely and replace with "governance voting + 
fee discounts," does that make token MORE defensible as utility?

Compare:
A) Current: Staking grants 8-12% APY (automatic distribution)
B) Proposed: Staking grants voting power + fee discounts (no distributions)
C) Safer: Only governance, no staking or fee discounts

Which is most defensible under Howey + MiCA?

Follow-up:
- Does removing staking reduce utility value perception?
- Can fee discounts alone justify token utility?
- Is pure governance (1 token = 1 vote) enough?
```

**Why This Matters:**
More conservative approach might be safer but less valuable to users.

---

### C.3 - Revenue Projection Table

**PREGUNTA C.3.1:**
```
Current problematic element (TOKENOMICS lines ~145-160):
Revenue projection table: $1.58M (Y1) → $2.45M (Y2) → $5.9M (Y3) → $13.5M (Y5)

Red flags:
- Shows exponential growth (8.5x expansion)
- Implies "revenue growth = token value growth"
- No clarification on fund destination

Proposed correction #1: Remove table entirely
Proposed correction #2: Replace with "Treasury Flow" section explaining operations

Question:
Is removal sufficient, or should we:
a) Keep table for business planning purposes with strong disclaimers?
b) Move to confidential investor deck (not public whitepaper)?
c) Include only Year 1, not multi-year projections?

If we remove entirely, what financial disclosures are still required for investor 
due diligence?

Follow-up:
- What's the minimum financial information required in whitepaper?
- Can we have confidential business projections for accredited investors only?
- What disclaimers are needed if we DO include projections?
```

**Why This Matters:**
Investors want to see financials. Complete removal might hurt credibility.

---

## SECCIÓN D: IMPLEMENTATION & TIMELINE QUESTIONS

---

### D.1 - Legal Document Updates

**PREGUNTA D.1.1:**
```
Question:
Which documents require legal review and update?

Priority 1 (must update):
- [ ] Whitepaper - remove Howey issues
- [ ] Token sale Terms & Conditions
- [ ] Smart contract code comments
- [ ] Website copy

Priority 2 (should update):
- [ ] Pitch deck
- [ ] Investor FAQ
- [ ] Marketing materials
- [ ] Community docs

Which must be reviewed by lawyer vs internal team?

What's the approval process?
- Revisions by team → lawyer review → final approval → public release?
- Do we need investor notification of changes?

Timeline:
How long for lawyer to review and approve changes?
```

**Why This Matters:**
Need to understand regulatory approval process and timing.

---

### D.2 - Presale Launch Timeline

**PREGUNTA D.2.1:**
```
Current assumption: 4-5 week audit + corrections → presale launch

Question:
If we make narrative corrections but want to launch presale, what's minimum 
timeline for regulatory validation?

Scenario A: Proceed with corrected narrative + disclaimers
- Minimal additional delay
- Risk: Regulators could contest classification later
- Timeline: 1 week for final legal review

Scenario B: Get formal FINMA pre-submission opinion
- Formal dialogue with regulator
- Safe harbor: FINMA's opinion protects presale
- Timeline: 4-6 weeks

Scenario C: Wait for formal Swiss Foundation registration first
- Strongest regulatory position
- No presale until entity exists
- Timeline: 8-12 weeks

Lawyer recommendation?

What's risk vs reward tradeoff?
```

**Why This Matters:**
Timeline directly impacts presale launch decision.

---

## SECCIÓN E: RISK MITIGATION & SAFE HARBOR

---

### E.1 - Disclaimers and Safe Harbor Language

**PREGUNTA E.1.1:**
```
Question:
What specific disclaimers reduce regulatory risk?

Proposed safe harbor language:
"BHT is NOT a financial instrument, investment, or security. It is a utility 
token providing governance access to the Bashood protocol. Token holders should 
not expect any economic returns or profits. Participation is at user's own risk."

Is this sufficient, or should we add:
a) FINMA/SEC safe harbor disclaimer?
b) Country-specific disclaimers (US, EU, Switzerland)?
c) Specific user type restrictions (no US persons, no securities investors)?
d) Minimum investment language (to reduce retail investor perception)?

What's the standard safe harbor framework used by crypto projects?

Follow-up:
- Should we restrict to accredited investors only?
- Should we geo-block certain jurisdictions?
- What KYC/AML requirements reduce risk?
```

**Why This Matters:**
Disclaimers can reduce but not eliminate risk. Need to understand trade-offs.

---

### E.2 - Ongoing Compliance Obligations

**PREGUNTA E.2.1:**
```
Question:
If we launch presale with corrected narrative + disclaimers, what are 
ongoing compliance obligations?

1. Reporting Requirements:
   - Must we update regulators on project progress?
   - How often (annual, monthly)?
   - What if we deviate from whitepaper?

2. Investor Protection:
   - Are we required to maintain treasury reserves?
   - Must we have insurance?
   - What if protocol fails/goes to zero?

3. Evolution:
   - If we later launch Viviendas 3D project (separately), how does that affect BHT?
   - Can token holders sue if they expect we'd do this?
   - How do we legally separate BHT from future RWA projects?

4. DAO Governance:
   - If DAO votes to distribute treasury, is that "profit sharing"?
   - Must we pre-approve DAO voting mechanisms?
   - What are governance guardrails we need?

Follow-up:
- What's cost of ongoing compliance?
- Who oversees DAO governance for legal compliance?
- What happens if community votes to do something illegal?
```

**Why This Matters:**
Regulatory compliance doesn't end at presale. Need to understand lifetime obligations.

---

### E.3 - Legal Opinion Letter

**PREGUNTA E.3.1:**
```
Question:
Can we receive formal legal opinion letter stating:

"Under Swiss law and MiCA regulation, BHT token, as currently structured with 
corrected narrative per Appendix A, constitutes a utility token under 
Article 2(3) MiCA, and is NOT a financial instrument requiring registration."

Would this:
a) Protect presale from regulatory challenge?
b) Be publishable to investors (increase confidence)?
c) Satisfy platform requirements (DEX listing, exchange listing)?
d) Provide safe harbor for future regulatory questions?

What's cost/timeline for legal opinion?
```

**Why This Matters:**
Legal opinion is gold standard for investor confidence.

---

## SECCIÓN F: CRITICAL CLARIFICATIONS NEEDED

---

### F.1 - Smart Contract Code vs. Narrative Alignment

**PREGUNTA F.1.1:**
```
Current status: Smart contracts have NOT been fully audited relative to 
corrected narrative.

Question:
Do the actual smart contracts (BashoodToken.sol, BashoodPresaleFinal.sol, 
BashoodMultiToken.sol) implement:

a) Automatic profit distribution to holders? (If yes, narrative correction won't work)
b) Owner ability to change terms post-sale? (If yes, needs governance safeguards)
c) Any hedging against real asset performance? (If yes, might imply revenue sharing)
d) Emergency fund extraction mechanisms? (If yes, must be transparent)

If code behavior contradicts corrected narrative, we have bigger problem.

What code audit is needed before presale?
```

**Why This Matters:**
Can't have narrative say "utility" if code does "security behaviors."

---

### F.2 - Investor Communications Plan

**PREGUNTA F.2.1:**
```
Question:
If we eliminate Viviendas 3D narrative, do we owe investor notification?

Specifically:
a) Have we previously marketed Viviendas 3D to potential investors?
b) Did any investor buy based on that promise?
c) Do we need refund mechanism or investor release?
d) Should we communicate reasoning for change (transparency vs liability risk)?

How should we position change to community?
- Transparency: "We're following legal advice to improve compliance"
- Pivot: "We're refocusing on protocol utility"
- Risk: "We were wrong before"

What's recommended legal approach?
```

**Why This Matters:**
Community loyalty and legal exposure depend on communication strategy.

---

## RESUMEN EJECUTIVO: PREGUNTAS MÁS CRÍTICAS

For your lawyer, these are the questions that MUST be answered:

1. **Can narrative corrections alone (without code changes) make BHT defensible 
   as utility token under Howey test?**
   - If NO → we need code changes (estimated 2-3 weeks + audit)
   - If YES → narrative corrections sufficient (5-7 days + legal review)

2. **Is complete elimination of Viviendas 3D language necessary, or can we keep 
   generic references to real estate exploration?**
   - If MUST ELIMINATE → we must decide if that's acceptable
   - If GENERIC OK → we have more flexibility

3. **Does automatic staking distribution with disclaimer defeat "profits" prong, 
   or must distribution be DAO-gated?**
   - If AUTOMATIC + DISCLAIMER OK → keep current rewards mechanism
   - If MUST DAO-GATE → need contract modification

4. **What's minimum legal certainty required before presale launch?**
   - FINMA pre-submission opinion (4-6 weeks, safer)
   - Formal legal opinion letter (2 weeks, moderate)
   - Lawyer sign-off on corrected narrative (1 week, faster but riskier)

5. **What's timeline and cost structure for your ongoing legal support?**
   - Presale review + launch: $X
   - First year compliance: $Y/month
   - Investor disputes/regulatory inquiry: $Z/hour

---

## PRÓXIMOS PASOS

1. **Email this document to your Swiss crypto lawyer** with request for written 
   responses to all questions

2. **Mark critical path questions** (highlighted above) for urgent response (48 hours)

3. **Timeline:**
   - Today: Send to lawyer
   - Day 2: Lawyer initial feedback
   - Day 3-4: Detailed Q&A clarification
   - Day 5: Strategic decision (proceed as/Y/Z, timeline A/B/C)

4. **Expected outcome:** Strategic decision matrix showing:
   - Minimal-risk path (take 12 weeks, highest certainty)
   - Moderate-risk path (take 6 weeks, FINMA opinion)
   - Maximum-speed path (take 2 weeks, narrative + disclaimers)
   - Cost/risk trade-offs for each

---

## APPENDIX: DOCUMENT REFERENCES

When sending to lawyer, attach:
- [ ] AUDIT_ECONOMIC_ARCHITECTURE.md (575 lines, key findings)
- [ ] AUDIT_TECHNICAL_ARCHITECTURE.md (500 lines, code analysis)
- [ ] AUDIT_NARRATIVE_ASSESSMENT.md (830 lines, all 47 problems + fixes)
- [ ] Corrected versions of: README.md, TOKENOMICS.md, BASHOOD_VISION_COMPLETA.md
- [ ] Full whitepaper if exists
- [ ] Token sale terms & conditions
- [ ] All smart contract code (BashoodToken.sol, BashoodPresaleFinal.sol, etc.)

Lawyer will need full context to give meaningful advice.
