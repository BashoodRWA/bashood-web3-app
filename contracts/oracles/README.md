# 🔮 Oracles - Chainlink Price Feeds

Implementación de oracles para obtener precios en tiempo real usando Chainlink Price Feeds en Base blockchain.

---

## 📁 Archivos

### `ChainlinkPriceFeed.sol`

Wrapper del oracle de Chainlink con validaciones de seguridad adicionales.

**Características**:
- ✅ Validación de staleness (frescura del precio)
- ✅ Validación de respuesta válida (answer > 0)
- ✅ Validación de ronda completada (answeredInRound >= roundId)
- ✅ Protección contra cambios extremos de precio (maxChangePct)
- ✅ Funciones view y state-changing

**Configuración**:
```solidity
stalenessThreshold = 300 segundos (5 min default)
maxChangePct = 50% (protección contra spikes)
```

### `IPriceFeed.sol`

Interface estándar de Chainlink AggregatorV3.

```solidity
interface IPriceFeed {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (
        uint80 roundId,
        int256 answer,
        uint256 startedAt,
        uint256 updatedAt,
        uint80 answeredInRound
    );
}
```

---

## 🔐 Validaciones de Seguridad

### 1. **Staleness Check** (Línea 43-46)
```solidity
require(uAt != 0, "stale: updatedAt=0");
require(block.timestamp - uAt <= stalenessThreshold, "stale");
```
**Protege contra**: Usar precios desactualizados que podrían ser manipulados.

### 2. **Answer Validity** (Línea 42)
```solidity
require(answer > 0, "invalid: answer<=0");
```
**Protege contra**: Respuestas inválidas del oracle (0 o negativas).

### 3. **Round Completion** (Línea 44-45)
```solidity
require(answeredInRound != 0, "invalid: answeredInRound=0");
require(answeredInRound >= roundId, "stale: answeredInRound < roundId");
```
**Protege contra**: Usar datos de rondas incompletas o stale.

### 4. **Price Change Limit** (Línea 50-59)
```solidity
uint256 pct = (diff * 100) / prev;
require(pct <= maxChangePct, "change too large");
```
**Protege contra**: Spikes de precio anormales (flash crashes, manipulación).

---

## 🌐 Chainlink Price Feeds en Base

### Base Mainnet

Oracles disponibles en Base Mainnet (Chain ID: 8453):

| Par | Dirección | Decimales | Heartbeat |
|-----|-----------|-----------|-----------|
| **BTC/USD** | `0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F` | 8 | 30 min |
| **ETH/USD** | `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70` | 8 | 20 min |
| **USDC/USD** | `0x7e860098F58bBFC8648a4311b374B1D669a2bc6B` | 8 | 24 horas |

**Fuente oficial**: https://docs.chain.link/data-feeds/price-feeds/addresses?network=base

### Base Sepolia (Testnet)

Oracles de testing en Base Sepolia (Chain ID: 84532):

| Par | Dirección | Decimales | Notas |
|-----|-----------|-----------|-------|
| **BTC/USD** | `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` | 8 | Testnet |
| **ETH/USD** | `0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1` | 8 | Testnet |

⚠️ **Nota**: Testnet puede tener menos oracles disponibles. Verificar en documentación oficial.

---

## 📝 Uso en BashoodPresaleFinal

El contrato BashoodPresaleFinal usa este oracle para:

1. **Calcular precios en fiat** (líneas ~230-245):
```solidity
function _getFreshPrice() internal view returns (uint256) {
    require(address(priceFeed) != address(0), "PriceFeed not set");
    (, int256 answer,, uint256 updatedAt,) = priceFeed.latestRoundData();
    require(answer > 0 && updatedAt > 0, "Oracle: Invalid price");
    require(block.timestamp - updatedAt <= maxPriceStaleness, "Oracle: Stale");
    return uint256(answer);
}
```

2. **Convertir ETH a USD**:
```solidity
uint256 ethPrice = _getFreshPrice(); // ej: 3000 USD (8 decimales)
uint256 ethAmountInUSD = (msg.value * ethPrice) / 1e8;
```

3. **Validar pagos**:
```solidity
require(ethAmountInUSD >= priceInUSD, "Insufficient payment");
```

---

## ⚙️ Configuración Recomendada

### Para Producción (Mainnet)

```javascript
// En deploy script
const priceFeed = await ChainlinkPriceFeed.deploy(
  "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F" // BTC/USD Base Mainnet
);

await priceFeed.setStalenessThreshold(3600); // 1 hora max
await priceFeed.setMaxChangePct(30); // 30% cambio máximo
```

**Rationale**:
- **1 hora staleness**: Balance entre seguridad y disponibilidad
- **30% max change**: Criptomonedas volátiles, pero 30% es spike anormal

### Para Testing (Sepolia)

```javascript
const priceFeed = await ChainlinkPriceFeed.deploy(
  "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1" // BTC/USD Sepolia
);

await priceFeed.setStalenessThreshold(7200); // 2 horas (testnet más lento)
await priceFeed.setMaxChangePct(50); // 50% (testnet puede tener datos erráticos)
```

### Para Desarrollo Local

Usa `MockPriceFeed.sol` con precio fijo:
```javascript
const mockOracle = await MockPriceFeed.deploy(
  300000000000, // $3000 USD (8 decimales)
  8             // decimals
);
```

---

## 🧪 Testing

### Tests Cubiertos

Ver `test/bashoodPresaleFinal.additionalCoverage.test.cjs`:

- ❌ Oracle no configurado (revierte)
- ❌ MaxPriceStaleness = 0 (revierte)
- ❌ Oracle answer <= 0 (revierte)
- ❌ Oracle stale (revierte)
- ❌ answeredInRound < roundId (revierte)

**Todos los edge cases están protegidos** ✅

---

## 🔗 Referencias

- [Chainlink Price Feeds - Base](https://docs.chain.link/data-feeds/price-feeds/addresses?network=base)
- [Chainlink Documentation](https://docs.chain.link/)
- [Using Chainlink Price Feeds](https://docs.chain.link/data-feeds/using-data-feeds)
- [Base Blockchain Docs](https://docs.base.org/)

---

## ⚠️ Notas Importantes

### Staleness en Producción

**BashoodPresaleFinal** usa su propio `maxPriceStaleness` (configurable):
- Recomendado: **3600 segundos (1 hora)**
- Crítico para activos de alto valor ($100k-$500k NFTs)

### Heartbeat de Chainlink

Chainlink actualiza precios basado en:
1. **Tiempo (heartbeat)**: BTC/USD cada ~30 min en Base
2. **Desviación**: Si el precio cambia >0.5%

**Esto significa**:
- En mercados estables: Actualizaciones cada 30 min
- En mercados volátiles: Actualizaciones cada pocos minutos

**Configurar `maxPriceStaleness` acorde al heartbeat del oracle**.

---

**Última actualización**: 15 Enero 2026  
**Versión**: ChainlinkPriceFeed v1.0  
**Compatibilidad**: Chainlink AggregatorV3, Base blockchain
