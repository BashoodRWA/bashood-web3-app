# 🔐 GUÍA: CREAR 4 WALLETS MULTI-SIG PARA BASHOOD

**Fecha**: 2 Febrero 2026  
**Objetivo**: Crear 4 wallets multi-sig seguras para recibir fondos de preventa  
**Plataforma**: Gnosis Safe en Base Network

---

## 📋 RESUMEN EJECUTIVO

Necesitas crear **4 wallets multi-signature** con la siguiente configuración:

| Wallet | Porcentaje | Threshold | Propósito |
|--------|------------|-----------|-----------|
| 🚀 **Development** | 45% ($1.03M) | 2-of-3 | Auditorías, desarrollo, legal |
| ⚙️ **Operations** | 25% ($575k) | 2-of-3 | Salarios, gas, infraestructura |
| 📢 **Marketing** | 20% ($460k) | 1-of-2 | Community, influencers, ads |
| 🏦 **Treasury** | 10% ($230k) | 3-of-5 | Reserva emergencia + liquidez |

---

## 🛠️ PASO 1: PREPARACIÓN

### Requisitos Previos:

```
✅ Wallet con fondos en Base (para gas de creación ~$5-10)
✅ Navegador con MetaMask/Coinbase Wallet instalado
✅ Lista de co-signatarios (emails y addresses)
✅ Acceso a https://safe.base.org
```

### Definir Signatarios:

**Development Wallet (2-of-3):**
```
Signatario 1: CTO/Tech Lead (address: 0x...)
Signatario 2: Deployer/Admin (address: 0x...)
Signatario 3: Auditor externo (address: 0x...)
Threshold: 2 firmas requeridas
```

**Operations Wallet (2-of-3):**
```
Signatario 1: CEO (address: 0x...)
Signatario 2: CFO (address: 0x...)
Signatario 3: Deployer/Admin (address: 0x...)
Threshold: 2 firmas requeridas
```

**Marketing Wallet (1-of-2):**
```
Signatario 1: CMO/Marketing Lead (address: 0x...)
Signatario 2: Deployer/Admin (address: 0x...)
Threshold: 1 firma (más ágil para campañas)
```

**Treasury Wallet (3-of-5):**
```
Signatario 1: CEO (address: 0x...)
Signatario 2: CFO (address: 0x...)
Signatario 3: CTO (address: 0x...)
Signatario 4: Advisor 1 (address: 0x...)
Signatario 5: Advisor 2 (address: 0x...)
Threshold: 3 firmas (máxima seguridad)
```

---

## 🔧 PASO 2: CREAR WALLETS EN GNOSIS SAFE

### Para CADA wallet (repetir 4 veces):

#### 2.1. Acceder a Gnosis Safe

```
1. Ir a: https://safe.base.org
2. Conectar wallet (botón "Connect Wallet")
3. Seleccionar red: Base Mainnet (o Base Sepolia para testnet)
4. Click en "+ Create new Safe"
```

#### 2.2. Configurar Signatarios

```
1. Seleccionar "Create new Safe"
2. Dar un nombre descriptivo:
   - "Bashood Development Wallet" 
   - "Bashood Operations Wallet"
   - "Bashood Marketing Wallet"
   - "Bashood Treasury Wallet"

3. Agregar owners (signatarios):
   - Click en "+ Add another owner"
   - Pegar address de cada signatario
   - Dar nombre a cada uno (ej: "CEO", "CTO", etc.)

4. Repetir hasta tener todos los signatarios
```

#### 2.3. Configurar Threshold

```
1. En "Threshold", seleccionar número de firmas requeridas:
   
   Development: 2 out of 3
   Operations:  2 out of 3
   Marketing:   1 out of 2
   Treasury:    3 out of 5

2. Review configuration
3. Click "Next"
```

#### 2.4. Confirmar Creación

```
1. Revisar resumen:
   - Nombre del Safe
   - Signatarios y sus addresses
   - Threshold configurado
   - Red (Base Mainnet)

2. Click "Create"
3. Firmar transacción en MetaMask
4. Esperar confirmación (~2-5 segundos en Base)

5. ✅ GUARDAR LA ADDRESS DEL SAFE
```

---

## 📝 PASO 3: DOCUMENTAR ADDRESSES

Después de crear las 4 wallets, documenta las addresses:

### Template de Documentación:

```javascript
// BASHOOD MULTI-SIG WALLETS - BASE MAINNET

const BASHOOD_WALLETS = {
  development: {
    address: "0x...", // Gnosis Safe address
    threshold: "2-of-3",
    owners: [
      "0x...CTO",
      "0x...Admin", 
      "0x...Auditor"
    ],
    purpose: "Auditorías, desarrollo, legal",
    allocation: "45%"
  },
  
  operations: {
    address: "0x...", // Gnosis Safe address
    threshold: "2-of-3",
    owners: [
      "0x...CEO",
      "0x...CFO",
      "0x...Admin"
    ],
    purpose: "Salarios, gas, infraestructura",
    allocation: "25%"
  },
  
  marketing: {
    address: "0x...", // Gnosis Safe address
    threshold: "1-of-2",
    owners: [
      "0x...CMO",
      "0x...Admin"
    ],
    purpose: "Community, influencers, ads",
    allocation: "20%"
  },
  
  treasury: {
    address: "0x...", // Gnosis Safe address
    threshold: "3-of-5",
    owners: [
      "0x...CEO",
      "0x...CFO",
      "0x...CTO",
      "0x...Advisor1",
      "0x...Advisor2"
    ],
    purpose: "Reserva emergencia + liquidez",
    allocation: "10%"
  }
};

module.exports = BASHOOD_WALLETS;
```

### Guardar en Variables de Entorno:

Crear archivo `.env.wallets`:

```bash
# BASHOOD MULTI-SIG WALLETS - BASE MAINNET
# Created: 2026-02-02

DEVELOPMENT_WALLET=0x...
OPERATIONS_WALLET=0x...
MARKETING_WALLET=0x...
TREASURY_WALLET=0x...

# Distribution percentages
DEVELOPMENT_SHARE=45
OPERATIONS_SHARE=25
MARKETING_SHARE=20
TREASURY_SHARE=10
```

---

## ✅ PASO 4: VERIFICAR CONFIGURACIÓN

### Checklist de Verificación:

```
Wallet #1 - Development:
✅ Address guardada
✅ 3 signatarios agregados
✅ Threshold 2-of-3 configurado
✅ Nombre "Bashood Development Wallet"
✅ Visible en https://safe.base.org

Wallet #2 - Operations:
✅ Address guardada
✅ 3 signatarios agregados
✅ Threshold 2-of-3 configurado
✅ Nombre "Bashood Operations Wallet"
✅ Visible en https://safe.base.org

Wallet #3 - Marketing:
✅ Address guardada
✅ 2 signatarios agregados
✅ Threshold 1-of-2 configurado
✅ Nombre "Bashood Marketing Wallet"
✅ Visible en https://safe.base.org

Wallet #4 - Treasury:
✅ Address guardada
✅ 5 signatarios agregados
✅ Threshold 3-of-5 configurado
✅ Nombre "Bashood Treasury Wallet"
✅ Visible en https://safe.base.org
```

---

## 🧪 PASO 5: TESTEAR (OPCIONAL - TESTNET)

Antes de mainnet, prueba el flujo completo en Base Sepolia:

```bash
# 1. Crear las 4 wallets en Base Sepolia
# 2. Enviar 0.01 ETH de prueba a cada una

# 3. Probar retiro desde cada wallet:
# - Development (requiere 2 firmas)
# - Operations (requiere 2 firmas)
# - Marketing (requiere 1 firma)
# - Treasury (requiere 3 firmas)

# 4. Verificar que el threshold funciona correctamente
```

---

## 🚀 PASO 6: INTEGRAR CON PAYMENT SPLITTER

Una vez que tengas las 4 addresses, actualiza las variables de entorno:

```bash
# Editar .env
DEVELOPMENT_WALLET=0xYourDevelopmentSafeAddress
OPERATIONS_WALLET=0xYourOperationsSafeAddress
MARKETING_WALLET=0xYourMarketingSafeAddress
TREASURY_WALLET=0xYourTreasurySafeAddress
```

Luego deploy del PaymentSplitter:

```bash
npx hardhat run scripts/deploy-payment-splitter.js --network base-sepolia

# Verificar que las addresses están correctas
# Testear con 1 ETH
# Verificar distribución: 0.45 + 0.25 + 0.20 + 0.10 = 1.00 ETH
```

---

## ⚠️ SEGURIDAD - BEST PRACTICES

### DO's ✅

```
✅ Usar hardware wallets para signatarios importantes
✅ Verificar addresses 3 veces antes de confirmar
✅ Testear en testnet primero
✅ Documentar signatarios y threshold
✅ Hacer backup de recovery phrases
✅ Usar threshold 2+ para montos grandes
✅ Diversificar signatarios (no todos en mismo equipo)
```

### DON'Ts ❌

```
❌ Usar misma wallet para múltiples safes
❌ Compartir llaves privadas entre signatarios
❌ Configurar threshold 1-of-1 (solo para testing)
❌ Olvidar documentar addresses
❌ Usar addresses de exchanges como signatarios
❌ Crear safes sin testear primero
❌ Perder acceso a majority de signatarios
```

---

## 🔥 ESCENARIOS DE EMERGENCIA

### ¿Qué pasa si pierdes acceso a signatarios?

#### Scenario 1: Perdiste 1 signatario de Development (2-of-3)
```
✅ SAFE - Aún tienes 2 de 3
Acción: Usar los 2 restantes para:
1. Firmar transacción de "swap owner"
2. Reemplazar signatario perdido con nuevo address
3. Actualizar documentación
```

#### Scenario 2: Perdiste 2 signatarios de Treasury (3-of-5)
```
✅ SAFE - Aún tienes 3 de 5
Acción: Usar los 3 restantes para:
1. Firmar transacción de "swap owner" (2 veces)
2. Reemplazar ambos signatarios perdidos
3. Considerar aumentar threshold a 4-of-5
```

#### Scenario 3: Perdiste TODOS menos 1 (CRÍTICO)
```
❌ LOCKED - No puedes acceder a fondos
Acción: 
1. Contactar soporte de Gnosis Safe
2. Investigar opciones de recovery social
3. En mainnet con fondos grandes, consultar legal
4. PREVENCIÓN: Siempre mantener threshold < total owners
```

---

## 📊 COSTOS ESTIMADOS

### Gas Fees en Base:

```
Crear 1 Safe: ~$2-5 USD
Crear 4 Safes: ~$10-20 USD

Por transacción posterior:
- 1 firma: ~$0.50
- 2 firmas: ~$0.75
- 3 firmas: ~$1.00

Total setup: < $25 USD
```

---

## 🎯 CHECKLIST FINAL

Antes de proceder con preventa, verifica:

```
✅ 4 wallets creadas en Gnosis Safe
✅ Todas las addresses documentadas
✅ Variables de entorno configuradas
✅ Threshold verificado en cada wallet
✅ Signatarios confirmados y contactados
✅ Testeado en Base Sepolia
✅ PaymentSplitter deployado con addresses correctas
✅ Distribución 45/25/20/10 verificada
✅ Backup de addresses en múltiples lugares
✅ Plan de emergencia documentado
```

---

## 📞 RECURSOS

- **Gnosis Safe Base**: https://safe.base.org
- **Docs**: https://docs.safe.global
- **Support**: https://help.safe.global
- **Base Explorer**: https://basescan.org

---

**Creado**: 2 Febrero 2026  
**Siguiente paso**: Después de crear wallets → Deploy PaymentSplitter → Deploy BashoodPresaleFinal
