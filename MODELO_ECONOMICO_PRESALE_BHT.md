# 📊 MODELO ECONÓMICO PRESALE - BASHOOD TOKEN (BHT)

**Documento de Reconstrucción Basado en Código y Documentación Existente**  
**Fecha**: 2 Febrero 2026  
**Estado**: Reconstruido desde archivos del proyecto

---

## 🎯 RESUMEN EJECUTIVO

### Información Recuperada del Código

Basándome en la documentación y código existente, he reconstruido el modelo económico:

```
📌 TOKENOMICS BHT
├─ Total Supply: 1,000,000,000 BHT
├─ Preventa: 250,000,000 BHT (25% del supply)
└─ Distribución recuperada del Investment Report
```

---

## 💰 DISTRIBUCIÓN TOTAL DEL TOKEN BHT

### Supply Total: 1,000,000,000 BHT

Según [Bashood_Investment_Coverage_Report_2025.md](docs/Bashood_Investment_Coverage_Report_2025.md):

| Categoría | Cantidad | Porcentaje | Propósito |
|-----------|----------|------------|-----------|
| **Preventa Pública** | 250,000,000 BHT | 25% | Venta inicial a inversores |
| **Equipo y Desarrollo** | 200,000,000 BHT | 20% | Bloqueado 2 años (vesting) |
| **Reserva de Liquidez** | 200,000,000 BHT | 20% | DEX liquidity pools |
| **Marketing y Partnerships** | 150,000,000 BHT | 15% | Campañas y colaboraciones |
| **Staking y Recompensas** | 200,000,000 BHT | 20% | Incentivos a holders |
| **TOTAL** | **1,000,000,000 BHT** | **100%** | |

---

## 🔍 MODELO DE PREVENTA - RECONSTRUCCIÓN

### Opción A: Preventa de BHT Tokens (NO NFTs directamente)

Según tu aclaración: **"0.1 ETH no era para el NFT, era para la compra del token BHT"**

#### Escenario Probable (requiere validación):

```javascript
// Encontrado en README.md línea 357
├─ 40% (400M) - Presale pública  ← NOTA: README dice 40%
├─ 25% (250M) - Equipo y desarrollo  

// Pero Investment Report dice:
├─ 25% (250M BHT) - Preventa  ← Más conservador
```

**Asumiendo 250M BHT en preventa** (según Investment Report):

### Cálculo de Precio por BHT:

Si la venta fuera directa (necesita confirmación):

```
Opción 1: Precio fijo por BHT
─────────────────────────────
Si 0.1 ETH compra X cantidad de BHT:

Precio por BHT = 0.1 ETH / X tokens

Ejemplos:
- Si X = 10,000 BHT → 0.00001 ETH/BHT ($0.023 @ $2,300/ETH)
- Si X = 25,000 BHT → 0.000004 ETH/BHT ($0.0092 @ $2,300/ETH)
- Si X = 50,000 BHT → 0.000002 ETH/BHT ($0.0046 @ $2,300/ETH)
```

### Revenue Total de Preventa:

```
Opción 2: Toda la preventa a 0.1 ETH por lote
──────────────────────────────────────────────
Si se venden 250M BHT en lotes de X tokens:

Lotes necesarios = 250,000,000 / X
Revenue total = Lotes × 0.1 ETH

Ejemplo (10,000 BHT por lote):
- Lotes: 25,000 lotes
- Revenue: 2,500 ETH = $5.75M @ $2,300/ETH
```

---

## 🏦 DISTRIBUCIÓN DE FONDOS - 4 WALLETS

### Según tu descripción: "se repartiera entre las 4 cuentas, marketing, etc"

#### Wallets Identificados en el Código:

**En BashoodPresaleFinal.sol:**
```solidity
Line 89:  address payable public immutable projectWallet;   // Wallet #1
Line 70:  address public operationsWallet;                  // Wallet #2
```

**En BashoodToken.sol:**
```solidity
Line 31:  address public treasuryWallet;                    // Wallet #3 (posible)
```

#### Distribución Estimada (requiere confirmación):

| Wallet | Función | % Estimado | Uso de Fondos |
|--------|---------|------------|---------------|
| **🎯 Project Wallet** | Desarrollo principal | 40% | Smart contracts, auditorías, desarrollo |
| **⚙️ Operations Wallet** | Operaciones diarias | 25% | Gas fees, pagos corrientes, salarios |
| **📢 Marketing Wallet** | Marketing y Growth | 20% | Campañas, influencers, publicidad |
| **🏦 Treasury/Reserve** | Reserva estratégica | 15% | Contingencias, expansión futura |
| **TOTAL** | | **100%** | |

### Ejemplo de Distribución con 2,500 ETH recaudados:

```
2,500 ETH total × $2,300/ETH = $5,750,000 USD

Distribución:
├─ Project Wallet:     1,000 ETH = $2,300,000 (40%)
├─ Operations Wallet:    625 ETH = $1,437,500 (25%)
├─ Marketing Wallet:     500 ETH = $1,150,000 (20%)
└─ Treasury Wallet:      375 ETH =   $862,500 (15%)
```

---

## 🔗 RELACIÓN BHT ↔ NFT

### Modelo Dual según el código:

En `BashoodPresaleFinal.sol` existen DOS formas de comprar NFTs:

```solidity
// OPCIÓN 1: Pagar con ETH
function purchaseWithETH(uint256 nftId, uint256 quantity) {
    // Precio: 0.1 ETH por NFT
    // 100% va a projectWallet
}

// OPCIÓN 2: Pagar con BHT
function purchaseWithBHT(uint256 nftId, uint256 quantity, ...) {
    // Precio: 100 BHT por NFT
    // Con descuento del 15%
    // Parte se quema, parte va a operations
}
```

### Posibles Modelos de Preventa:

#### Modelo A: Preventa Separada de NFTs
```
1. Usuario compra BHT en preventa (0.1 ETH → X tokens)
2. Fondos se distribuyen a 4 wallets
3. Posteriormente, usuario puede:
   a) Usar BHT para comprar NFTs (100 BHT/NFT con descuento)
   b) Holdear BHT para staking/governance
   c) Tradear BHT en DEXs
```

#### Modelo B: Preventa Combinada
```
1. Usuario paga 0.1 ETH
2. Recibe:
   - Cantidad X de BHT tokens
   - 1 NFT de preventa (opcional)
   - Acceso prioritario a futuras ventas
3. Fondos se distribuyen entre 4 wallets
```

---

## 📈 PROYECCIONES DE REVENUE

### Escenario Conservador: 250M BHT @ 10,000 BHT por 0.1 ETH

```
Total preventa: 250,000,000 BHT
Lotes de: 10,000 BHT
Precio por lote: 0.1 ETH
──────────────────────────────
Total lotes: 25,000
Revenue total: 2,500 ETH
En USD ($2,300/ETH): $5,750,000

Distribución a 4 wallets:
├─ Project:     $2,300,000 (40%)
├─ Operations:  $1,437,500 (25%)
├─ Marketing:   $1,150,000 (20%)
└─ Treasury:      $862,500 (15%)
```

### Escenario Optimista: 250M BHT @ 5,000 BHT por 0.1 ETH

```
Total preventa: 250,000,000 BHT
Lotes de: 5,000 BHT
Precio por lote: 0.1 ETH
──────────────────────────────
Total lotes: 50,000
Revenue total: 5,000 ETH
En USD ($2,300/ETH): $11,500,000

Distribución a 4 wallets:
├─ Project:     $4,600,000 (40%)
├─ Operations:  $2,875,000 (25%)
├─ Marketing:   $2,300,000 (20%)
└─ Treasury:    $1,725,000 (15%)
```

### Escenario Agresivo: 400M BHT @ 10,000 BHT por 0.1 ETH

```
Total preventa: 400,000,000 BHT (40% del supply, según README)
Lotes de: 10,000 BHT
Precio por lote: 0.1 ETH
──────────────────────────────
Total lotes: 40,000
Revenue total: 4,000 ETH
En USD ($2,300/ETH): $9,200,000

Distribución a 4 wallets:
├─ Project:     $3,680,000 (40%)
├─ Operations:  $2,300,000 (25%)
├─ Marketing:   $1,840,000 (20%)
└─ Treasury:    $1,380,000 (15%)
```

---

## 💸 COMPARACIÓN CON MERCADO

### Preventa BHT vs. Otras Token Sales:

| Proyecto | Tipo | Recaudado | Supply | Precio Inicial |
|----------|------|-----------|--------|----------------|
| **Bashood (Conservador)** | Utility Token | $5.75M | 1B BHT | $0.023/BHT |
| **Bashood (Optimista)** | Utility Token | $11.5M | 1B BHT | $0.046/BHT |
| Ethereum ICO (2014) | Layer 1 | $18M | 72M ETH | $0.31/ETH |
| Cardano ICO (2017) | Layer 1 | $62M | 31B ADA | $0.002/ADA |
| Polkadot ICO (2017) | Layer 0 | $145M | 1B DOT | $0.29/DOT |
| Avalanche ICO (2020) | Layer 1 | $42M | 360M AVAX | $0.50/AVAX |

### RWA Token Presales (más comparable):

| Proyecto | Recaudado | Modelo | Valoración |
|----------|-----------|--------|------------|
| **Centrifuge** | $4.3M Seed | Real Estate tokenization | $50M post |
| **RealT** | Bootstrapped | Real Estate fractionalization | N/A |
| **Goldfinch** | $25M Series A | Credit tokenization | $100M post |
| **Ondo Finance** | $20M Series A | Institutional RWA | $500M post |
| **Bashood** | $5.75M - $11.5M (est.) | Real Estate + 3D Tech | TBD |

**Conclusión**: Bashood está en el rango típico de proyectos RWA early-stage ($5M-$20M).

---

## ⚠️ INFORMACIÓN FALTANTE (REQUIERE VALIDACIÓN)

### Datos Críticos que Necesitan Confirmación:

1. **❓ Cantidad exacta de BHT por 0.1 ETH**
   - ¿10,000 BHT? ¿25,000 BHT? ¿50,000 BHT?
   - Esto determina el precio por token

2. **❓ Porcentajes exactos de distribución a 4 wallets**
   - ¿40/25/20/15? ¿Otra distribución?
   - ¿Nombres exactos de cada wallet?

3. **❓ Mecanismo de distribución**
   - ¿Automático en smart contract?
   - ¿Manual después del deployment?
   - ¿Existe un PaymentSplitter contract?

4. **❓ Total de BHT en preventa**
   - ¿250M BHT (25%) según Investment Report?
   - ¿400M BHT (40%) según README?
   - Discrepancia entre documentos

5. **❓ Relación BHT → NFT**
   - ¿Los compradores de BHT reciben NFTs automáticamente?
   - ¿O deben comprarlos separadamente con BHT?
   - ¿Hay un airdrop de NFTs a holders de BHT?

---

## 🔧 IMPLEMENTACIÓN TÉCNICA REQUERIDA

### Si el modelo es "0.1 ETH → BHT tokens → distribuir a 4 wallets":

#### Opción 1: PaymentSplitter Contract (Recomendado)
```solidity
import "@openzeppelin/contracts/finance/PaymentSplitter.sol";

// Deploy PaymentSplitter con 4 wallets y sus shares
address[] memory payees = [projectWallet, opsWallet, marketingWallet, treasuryWallet];
uint256[] memory shares = [40, 25, 20, 15]; // Porcentajes

PaymentSplitter splitter = new PaymentSplitter(payees, shares);

// Usar splitter como projectWallet en presale
presale = new BashoodPresaleFinal(..., address(splitter), ...);
```

#### Opción 2: Distribución Manual Post-Presale
```solidity
function distributePresaleFunds() external onlyOwner {
    uint256 balance = address(this).balance;
    
    projectWallet.transfer(balance * 40 / 100);
    opsWallet.transfer(balance * 25 / 100);
    marketingWallet.transfer(balance * 20 / 100);
    treasuryWallet.transfer(balance * 15 / 100);
}
```

#### Opción 3: Multi-Sig con 4 Signatarios
```
Usar Gnosis Safe u otra multi-sig con:
- 4 signatarios (project, ops, marketing, treasury)
- Threshold 2-of-4 o 3-of-4
- Manual distribution según acuerdo interno
```

---

## 📊 DASHBOARD DE MÉTRICAS CLAVE

### KPIs de Preventa:

```
Métrica                  | Target      | Fórmula
─────────────────────────┼─────────────┼──────────────────
BHT Vendidos             | 250M tokens | totalBHTSold
ETH Recaudados           | 2,500 ETH   | address(this).balance
Inversores Únicos        | 500-1,000   | uniqueBuyers.length
Ticket Promedio          | 5 ETH       | totalETH / buyers
Revenue en USD           | $5.75M      | totalETH × ethPrice
Distribución Completada  | 100%        | wallets funded
```

### Métricas Post-Presale:

```
Token Velocity           | <20%/mes    | trading volume / supply
Holder Retention         | >80%        | holders @ t+30 / initial
DEX Liquidity           | >$1M TVL    | liquidity pool balance
Price Discovery         | Stable      | σ(price) < 30%
Burn Rate               | 2-5%/año    | burned / circulating
```

---

## 🎯 RECOMENDACIONES

### Acción Inmediata:

1. **✅ Confirmar Tokenomics**
   - Validar: ¿250M o 400M BHT en preventa?
   - Definir: ¿Cuántos BHT por 0.1 ETH?
   - Documentar: Precio inicial exacto

2. **✅ Implementar Distribución de Fondos**
   - Opción A: Deploy PaymentSplitter
   - Opción B: Multi-sig con 4 firmas
   - Opción C: Función manual distributePresaleFunds()

3. **✅ Documentar Wallets**
   - Wallet 1 (Project): Address + Purpose
   - Wallet 2 (Operations): Address + Purpose
   - Wallet 3 (Marketing): Address + Purpose
   - Wallet 4 (Treasury): Address + Purpose

4. **✅ Clarificar BHT ↔ NFT**
   - ¿Modelo A: Preventa separada?
   - ¿Modelo B: Bundle BHT + NFT?
   - ¿Modelo C: Airdrop NFTs a holders?

5. **✅ Actualizar Documentación**
   - Resolver discrepancia README vs Investment Report
   - Crear TOKENOMICS.md oficial
   - Actualizar deployment scripts

---

## 📞 SIGUIENTE PASO

**URGENTE**: Necesitas proporcionar:

1. **Cantidad exacta de BHT por 0.1 ETH**
2. **Addresses de las 4 wallets**
3. **Porcentajes exactos de distribución**
4. **Modelo de relación BHT → NFT**

Con esta información podré:
- ✅ Calcular revenue exacto
- ✅ Implementar distribución en smart contract
- ✅ Actualizar documentación oficial
- ✅ Generar proyecciones precisas

---

**Creado**: 2 Febrero 2026  
**Autor**: Reconstrucción basada en análisis de código y documentación  
**Estado**: ⚠️ REQUIERE VALIDACIÓN con datos originales del ordenador anterior
