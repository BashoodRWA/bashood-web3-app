# Configuración de Seguridad - BashoodPresaleFinal

## 📋 Propósito

Este script configura los parámetros de seguridad del contrato BashoodPresaleFinal para mitigar **riesgos medios** identificados en el análisis de seguridad:

1. ✅ **Whitelist habilitada** - Compliance KYC/AML para activos industriales
2. ✅ **MaxPerUser configurado** - Prevenir centralización de ballenas  
3. ✅ **Oracle staleness estricto** - Protección contra precios obsoletos
4. ✅ **Burn/Discount seguros** - Límites económicos razonables

---

## 🚀 Uso

### Testnet (Base Sepolia)

```bash
# 1. Desplegar contrato primero (si no existe)
npx hardhat run scripts/deploy-base.js --network base-sepolia

# 2. Configurar seguridad
PRESALE_ADDRESS=0xYourPresaleAddress npx hardhat run scripts/configure-presale-security.js --network base-sepolia
```

### Mainnet (Base Mainnet)

```bash
# ⚠️ IMPORTANTE: Actualizar NETWORK_CONFIG en el script ANTES de ejecutar
# Configurar multisigSigner y multisigOps con addresses reales

PRESALE_ADDRESS=0xYourPresaleAddress npx hardhat run scripts/configure-presale-security.js --network base-mainnet
```

### Hardhat Local

```bash
# Para testing local
npx hardhat node

# En otra terminal:
PRESALE_ADDRESS=0xYourPresaleAddress npx hardhat run scripts/configure-presale-security.js --network localhost
```

---

## ⚙️ Configuración Aplicada

### 🔐 Control de Acceso

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| **whitelistEnabled** | `true` | Solo usuarios con firma KYC pueden comprar |
| **signerAddress** | Multisig (prod) / Deployer (test) | Wallet que firma whitelists |
| **operationsWallet** | Multisig (prod) / Deployer (test) | Recibe BHT de pagos |

### 🛡️ Protecciones Económicas

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| **maxPerUser** | 10 ETH equivalente | Límite de compra por usuario |
| **burnBps** | 500 (5%) | Porcentaje de BHT quemado en compras |
| **discountBps** | 1000 (10%) | Descuento al pagar con BHT |

### ⏰ Oracle

| Parámetro | Valor | Descripción |
|-----------|-------|-------------|
| **maxPriceStaleness** | 3600s (1 hora) | Máximo tiempo de precio obsoleto |

---

## 📊 Valores Recomendados vs Límites

| Parámetro | Valor Recomendado | Límite Hard-Coded (require) | Crítico Si... |
|-----------|-------------------|------------------------------|---------------|
| burnBps | 500 (5%) | **MAX: 1500 (15%)** | >15% drena liquidez |
| discountBps | 1000 (10%) | **MAX: 2000 (20%)** | >20% regala NFTs |
| maxPriceStaleness | 3600s (1h) | Sin límite superior | >24h riesgo manipulación |
| maxPerUser | 10 ETH fiat | 0 = ilimitado ⚠️ | 0 permite ballenas |

---

## ✅ Checklist de Seguridad

El script verifica automáticamente:

- [x] Signer configurado (multisig en producción)
- [x] Operations wallet configurado
- [x] Whitelist habilitada para KYC/AML
- [x] MaxPerUser > 0 (anti-ballena)
- [x] Oracle PriceFeed configurado
- [x] Oracle staleness < 1 hora
- [x] BurnBps dentro de límites (<15%)
- [x] DiscountBps dentro de límites (<20%)

---

## 🔴 Configuración CRÍTICA para Mainnet

### Antes de ejecutar en mainnet:

1. **Actualizar multisigs en `NETWORK_CONFIG`**:
   ```javascript
   "base-mainnet": {
     multisigSigner: "0xTU_MULTISIG_REAL",  // ⚠️ ACTUALIZAR
     multisigOps: "0xTU_MULTISIG_REAL",     // ⚠️ ACTUALIZAR
     useDeployerAsSigner: false,
     useDeployerAsOps: false,
   }
   ```

2. **Verificar que PriceFeed apunta a Chainlink oracle real**:
   ```bash
   # Base Mainnet Chainlink BTC/USD
   # https://docs.chain.link/data-feeds/price-feeds/addresses?network=base
   ```

3. **Activar presale solo DESPUÉS de configurar**:
   ```javascript
   await presale.startPresale();
   ```

---

## 🎯 Por Qué Esta Configuración

### Riesgo Mitigado: Whitelist Deshabilitada

**Sin whitelist**:
- ❌ Cualquiera puede comprar NFTs de activos industriales
- ❌ Riesgo regulatorio KYC/AML
- ❌ Bots y snipers en preventa

**Con whitelist (este script)**:
- ✅ Solo inversores con KYC aprobado
- ✅ Compliance regulatorio
- ✅ Distribución controlada

### Riesgo Mitigado: MaxPerUser = 0

**Sin límite (maxPerUser = 0)**:
- ❌ Una ballena compra toda la preventa
- ❌ Centralización de activos industriales
- ❌ Falla objetivo de democratización

**Con límite (este script)**:
- ✅ Distribución justa entre inversores
- ✅ Máximo 10 ETH en fiat por usuario
- ✅ Democratización de acceso a activos

### Riesgo Mitigado: Oracle Stale

**Oracle staleness > 24h**:
- ❌ Precios de hace días aceptados
- ❌ Manipulación: esperar precio favorable
- ❌ Proyecto pierde 20-30% en volatilidad

**Staleness 1h (este script)**:
- ✅ Precios siempre frescos
- ✅ Máximo desfase: 1 hora
- ✅ Protección contra manipulación

---

## 📈 Impacto en Coverage

Esta configuración cubre los siguientes branches del contrato:

```solidity
// Whitelist check (línea ~1160)
if (whitelistEnabled) { // ✅ Cubierto
    require(_verifySignature(...), "Not whitelisted");
}

// MaxPerUser check (línea ~398)  
if (maxPerUser > 0) { // ✅ Cubierto
    require(spentByUser[msg.sender] + amount <= maxPerUser, "User cap exceeded");
}

// Oracle staleness (línea ~237)
require(block.timestamp - updatedAt <= maxPriceStaleness, "Price too stale"); // ✅ Cubierto
```

**Branch Coverage Incrementado**: +3-5%  
**Total Esperado**: ~70% (desde 67.41%)

---

## 🧪 Testing de la Configuración

Para verificar que la configuración se aplicó correctamente:

```javascript
const presale = await ethers.getContractAt("BashoodPresaleFinal", PRESALE_ADDRESS);

// Verificar whitelist
const whitelistEnabled = await presale.whitelistEnabled();
console.log("Whitelist:", whitelistEnabled); // debe ser true

// Verificar maxPerUser  
const maxPerUser = await presale.maxPerUser();
console.log("MaxPerUser:", ethers.formatEther(maxPerUser)); // debe ser 10.0

// Verificar staleness
const staleness = await presale.maxPriceStaleness();
console.log("Staleness:", staleness.toString()); // debe ser 3600

// Verificar burn/discount
const burnBps = await presale.burnBps();
const discountBps = await presale.bhtDiscountBps();
console.log("Burn:", burnBps.toString()); // debe ser 500
console.log("Discount:", discountBps.toString()); // debe ser 1000
```

---

## 📄 Archivo de Salida

El script genera un archivo JSON con toda la configuración aplicada:

```
presale-security-config-{network}-{timestamp}.json
```

Ejemplo:
```json
{
  "network": "base-sepolia",
  "timestamp": "2026-01-15T...",
  "presaleAddress": "0x...",
  "configuration": {
    "signer": "0x...",
    "operationsWallet": "0x...",
    "whitelistEnabled": true,
    "maxPerUser": "10.0 ETH",
    "maxPriceStaleness": "3600s",
    "burnBps": 500,
    "discountBps": 1000
  },
  "validations": {
    "priceFeed": "0x...",
    "rescueContract": "0x...",
    "presaleActive": false
  },
  "checklist": [...]
}
```

Guardar este archivo para auditoría y documentación.

---

## 🔄 Modificar Configuración

Para cambiar valores, editar `SECURITY_CONFIG` en el script:

```javascript
const SECURITY_CONFIG = {
  whitelistEnabled: true,        // true/false
  maxPerUser: ethers.parseEther("10"), // en ETH fiat equivalente
  maxPriceStaleness: 3600,       // en segundos
  burnBps: 500,                  // en basis points (500 = 5%)
  discountBps: 1000,             // en basis points (1000 = 10%)
};
```

Luego re-ejecutar el script. Solo aplicará los cambios necesarios.

---

## ⚠️ Advertencias

### 🔴 CRÍTICO - Mainnet

- **NUNCA** usar deployer como signer en mainnet
- **NUNCA** deshabilitar whitelist para activos industriales reales
- **SIEMPRE** usar multisig para roles críticos
- **VERIFICAR** direcciones 3 veces antes de configurar

### 🟡 IMPORTANTE - Testnet

- Deployer como signer está OK para testing
- Documentar todas las configuraciones aplicadas
- No enviar ETH real a contratos de testnet

---

## 📚 Referencias

- [Análisis de Seguridad Completo](../ANALISIS_SEGURIDAD_EDGE_CASES.md)
- [Documentación de Deployment](../DEPLOY.md)
- [Mainnet Checklist](../MAINNET_DEPLOYMENT_CHECKLIST_FINAL.md)

---

## 🆘 Troubleshooting

### Error: "No tiene ADMIN_ROLE"
```bash
# Verificar roles
const ADMIN_ROLE = await presale.ADMIN_ROLE();
await presale.grantRole(ADMIN_ROLE, deployer.address);
```

### Error: "multisigSigner es 0x000..."
```bash
# Actualizar NETWORK_CONFIG en el script antes de ejecutar
```

### Warning: "PriceFeed NO está configurado"
```bash
# Configurar oracle primero
await presale.setPriceFeed(CHAINLINK_ORACLE_ADDRESS);
```

---

**Última actualización**: 15 Enero 2026  
**Versión**: 1.0.0  
**Compatibilidad**: BashoodPresaleFinal v2.x
