# 🔷 BASHOOD - START GUIDE
## Guía Rápida de Inicio en 10 Minutos

---

## ⏱️ TIEMPO TOTAL: 10 MINUTOS

```
Paso 1: Setup .env        [3 minutos]
Paso 2: Validar config    [2 minutos]
Paso 3: Obtener testnet ETH [instantáneo]
Paso 4: Deploy            [3 minutos]
Paso 5: Verificar         [2 minutos]
────────────────────────────────
TOTAL                     ~10 min
```

---

## ✅ PASO 1: CONFIGURAR .ENV (3 MIN)

### Opción A: Rápido
```bash
cd c:/Users/Franchu/Desktop/bashood-hardhat-tests
cp .env.example .env
```

### Opción B: Con tu wallet
```bash
# 1. Copiar template
cp .env.example .env

# 2. Editar en VS Code
code .env
```

**Variables que DEBES cambiar:**
```env
# Tu clave privada de test (Sepolia)
BASE_SEPOLIA_PRIVATE_KEY=0x... # obtén de Metamask, Hardhat, o genera nueva

# Tu wallet (donde recibirás testnet ETH)
OWNER_ADDRESS=0x...  # usa la misma del private key

# Wallets opcionales (pueden ser iguales al principio)
PROJECT_WALLET=0x...
OPS_WALLET=0x...
```

**¿No tienes clave privada?**
Usa Metamask:
1. Abre Metamask → Base Sepolia network
2. Click en ⋯ → Account details → Export private key
3. Paste en .env (sin copiar "0x" si no está)

---

## ✅ PASO 2: VALIDAR CONFIGURACIÓN (2 MIN)

```bash
npx hardhat run scripts/validate-base-config.js --network base-sepolia
```

**Nota importante sobre nombres de red**: Los comandos usan exactamente `base-sepolia` y `base-mainnet` como aparecen en `hardhat.config.js` (con guión, no camelCase).

**Salida esperada:**
```
✅ ¡Configuración lista para deployment a Base!
```

**Si hay error:**
- ❌ "insufficient funds" → IR AL PASO 3
- ❌ "invalid private key" → Revisar formato en .env
- ❌ "network request failed" → Problema de internet/RPC

---

## ✅ PASO 3: OBTENER TESTNET ETH (INSTANTÁNEO)

```
1. Ve a: https://www.base.org/docs/using-base/quickstart#faucet
2. Paste tu OWNER_ADDRESS (sin "0x")
3. Click "Send me ether"
4. Espera ~30 segundos
5. Verifica en Basescan: https://sepolia.basescan.org/address/TU_ADDRESS
```

**Alternativa (si no funciona faucet):**
```bash
# Solicitar en Discord Base
https://discord.gg/buildonbase → #faucet
```

---

## ✅ PASO 4: COMPILAR Y DEPLOY (3 MIN)

### Compilar contratos
```bash
npx hardhat compile

# Output esperado:
# 38 Solidity files compiled successfully
```

### Deploy a Base Sepolia
```bash
npx hardhat run scripts/deploy-base.js --network base-sepolia

# Output esperado:
# ✅ BashoodToken deployed to: 0x...
# ✅ BashoodPresaleFinal deployed to: 0x...
# ✅ DEPLOYMENT COMPLETADO EN BASE
# 📄 Deployment info guardado en: deployment-base-sepolia-TIMESTAMP.json
```

**⏰ Tiempo**: ~2-3 minutos

---

## ✅ PASO 5: VERIFICAR ESTADO (2 MIN)

### Ver presale status
```bash
# Encuentra el nombre del archivo JSON generado
ls deployment-base-sepolia-*.json

# Ejecutar (reemplaza TIMESTAMP)
npx hardhat run scripts/presale-status.js --network base-sepolia deployment-base-sepolia-1234567890.json

# O más simple:
npx hardhat run scripts/presale-status.js --network base-sepolia deployment-base-sepolia-*.json
```

**Salida esperada:**
```
📊 ESTADO DE LA PRESALE EN BASE
⚙️  CONFIGURACIÓN GENERAL
Project Wallet:  0x...
Presale Start:   [TIME]
Max NFT Supply:  1000
NFT Price (ETH): 0.1 ETH

📈 MÉTRICAS DE PRESALE
Total ETH Raised:  0 ETH
Total BHT Raised:  0 BHT
NFTs Minted:       0 / 1000
```

### Ver deployment info
```bash
cat deployment-base-sepolia-*.json
```

### Verificar contrato en Basescan (OPCIONAL)
```bash
# Requiere BASESCAN_API_KEY en .env (obtenible en https://basescan.org/apis)
npx hardhat verify --network base-sepolia PRESALE_ADDRESS

# Ver en: https://sepolia.basescan.org/address/0x...
```

---

## 🎉 ¡YA ESTÁ HECHO!

Completaste los 5 pasos en ~10 minutos:

✅ Configuración Base  
✅ Validación  
✅ Testnet ETH  
✅ Deploy exitoso  
✅ Verificación  

---

## 📊 VERIFICAR EN BASESCAN

Abre: https://sepolia.basescan.org/

Busca tu wallet address → Verás las transacciones de deployment

---

## 🚀 PRÓXIMOS PASOS (DESPUÉS DE HOY)

### Día 2-3: Testing
```bash
# Monitor presale
watch -n 5 'npx hardhat run scripts/presale-status.js --network base-sepolia deployment-base-sepolia-*.json'

# Ver balance de ETH en presale
npx hardhat accounts --network base-sepolia
```

### Día 4: Deploy Mainnet (DESPUÉS DE TESTING)
```bash
# ⚠️  SOLO después de 48+ horas de testing en Sepolia
npx hardhat run scripts/deploy-base.js --network base-mainnet
```

---

## 🆘 PROBLEMAS COMUNES

| Problema | Solución |
|----------|----------|
| ❌ "insufficient funds" | Obtener ETH desde faucet (Paso 3) |
| ❌ "invalid private key" | Revisar .env → sin "0x" al inicio |
| ❌ "network error" | Verifica internet, prueba otro RPC |
| ❌ "contracts not found" | Ejecutar `npx hardhat compile` primero |
| ❌ "Account has 0 ETH" | Necesitas testnet ETH antes de deploy |

**Para más ayuda:**
```bash
# Ver guía completa
code docs/BASE_OPERACION_GUIA.md

# Ver estado del proyecto
node scripts/project-status.cjs

# Ver detalles de error
npx hardhat run scripts/validate-base-config.js --network base-sepolia
```

---

## 📱 RÁPIDA REFERENCIA

### Comandos Esenciales
```bash
# Validar setup
npx hardhat run scripts/validate-base-config.js --network base-sepolia

# Deploy
npx hardhat run scripts/deploy-base.js --network base-sepolia

# Ver status
npx hardhat run scripts/presale-status.js --network base-sepolia deployment-base-sepolia-*.json

# Estado general
node scripts/project-status.cjs
```

### Enlaces Importantes
- Docs: https://docs.base.org/
- Faucet: https://www.base.org/docs/using-base/quickstart#faucet
- Basescan Sepolia: https://sepolia.basescan.org/
- Base Discord: https://discord.gg/buildonbase

---

## ✨ RESUMEN EN 1 LÍNEA

```bash
# Haz esto y listo:
cp .env.example .env; \
code .env; \
# [Edita tu private key y addresses]; \
npx hardhat compile; \
npx hardhat run scripts/deploy-base.js --network base-sepolia
```

---

## 📋 CHECKLIST

- [ ] `.env` configurado
- [ ] Validación exitosa
- [ ] ETH en tesnet (0.01+)
- [ ] Compilación exitosa
- [ ] Deploy exitoso
- [ ] Presale status mostrando 0 NFTs (normal = sin buyers aún)

---

## 🎯 RESULTADO ESPERADO

Después de 10 minutos, tendrás:
- ✅ Contratos deployados en Base Sepolia
- ✅ Direcciones guardadas en JSON
- ✅ Presale operacional (lista para buyers)
- ✅ Sistema referral configurado
- ✅ Oracle de precios integrado

**Status**: 🟢 Ready for testing

---

**¡Buena suerte! 🚀**

Cualquier problema, revisar `docs/BASE_OPERACION_GUIA.md` o ejecutar:
```bash
npx hardhat run scripts/validate-base-config.js --network base-sepolia
```

---

*Guía rápida | Bashood Base Integration | 2024-11-27*
