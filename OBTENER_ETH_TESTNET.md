# 💧 GUÍA PARA OBTENER ETH DE TESTNET - BASE SEPOLIA

**Fecha:** 4 de Febrero 2026  
**Wallet:** 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266  
**Balance actual:** 0.0 ETH  
**Necesitamos:** ~0.5 ETH testnet

---

## 🌐 OPCIÓN 1: Coinbase Faucet (RECOMENDADO)

### Pasos:

1. **Abrir el faucet:**
   ```
   https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
   ```

2. **Seleccionar red:**
   - Buscar "Base Sepolia" en el dropdown
   - Asegurarte que dice "Base Sepolia Testnet"

3. **Pegar dirección de tu wallet:**
   ```
   0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   ```

4. **Click en "Send me ETH"**

5. **Esperar confirmación:**
   - Tarda 1-3 minutos
   - Recibirás ~0.05 ETH testnet
   - Si necesitas más, puedes repetir después de 24 horas

---

## 🌐 OPCIÓN 2: QuickNode Faucet

### Pasos:

1. **Abrir el faucet:**
   ```
   https://faucet.quicknode.com/base/sepolia
   ```

2. **Pegar dirección:**
   ```
   0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   ```

3. **Resolver CAPTCHA**

4. **Click en "Request"**

5. **Esperar:**
   - Tarda 1-2 minutos
   - Recibirás ~0.1 ETH testnet

---

## 🌐 OPCIÓN 3: Alchemy Faucet

### Pasos:

1. **Crear cuenta en Alchemy (si no tienes):**
   ```
   https://www.alchemy.com/
   ```
   - Sign up gratis
   - Verificar email

2. **Ir al faucet:**
   ```
   https://www.alchemy.com/faucets/base-sepolia
   ```

3. **Login con tu cuenta Alchemy**

4. **Pegar dirección:**
   ```
   0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   ```

5. **Click en "Send Me ETH"**

6. **Esperar:**
   - Tarda 2-5 minutos
   - Recibirás ~0.25 ETH testnet (¡más que los otros!)

---

## 🌐 OPCIÓN 4: Múltiples Faucets (Si necesitas más ETH)

Puedes usar TODOS los faucets para acumular más ETH:

```
Coinbase:  0.05 ETH
QuickNode: 0.10 ETH
Alchemy:   0.25 ETH
-------------------
TOTAL:     0.40 ETH ✅ (suficiente para desplegar)
```

---

## ✅ VERIFICAR QUE RECIBISTE EL ETH

### Desde la terminal (después de recibir):

```bash
node -e "const ethers = require('ethers'); const provider = new ethers.JsonRpcProvider('https://sepolia.base.org'); provider.getBalance('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266').then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));"
```

**Resultado esperado:**
```
Balance: 0.1 ETH  ✅
```

### O desde BaseScan Sepolia:

1. Abrir: https://sepolia.basescan.org/
2. Pegar en el buscador: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
3. Ver tu balance en la página

---

## 🚀 SIGUIENTE PASO: DESPLEGAR CONTRATOS

Una vez tengas ETH en tu wallet (mínimo 0.1 ETH, idealmente 0.5 ETH):

### 1. Verificar balance:
```bash
node -e "const ethers = require('ethers'); const provider = new ethers.JsonRpcProvider('https://sepolia.base.org'); provider.getBalance('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266').then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));"
```

### 2. Desplegar PaymentSplitter (prueba rápida):
```bash
npx hardhat run scripts/deploy-payment-splitter.js --network base-sepolia
```

### 3. Si funciona, desplegar todo:
```bash
npx hardhat run scripts/deploy-bashood-complete.js --network base-sepolia
```

---

## ⏱️ TIEMPOS ESTIMADOS

```
Solicitar ETH del faucet:    30 segundos
Esperar confirmación:         1-5 minutos
Verificar recepción:          10 segundos
Desplegar PaymentSplitter:    2-3 minutos
Desplegar ecosistema completo: 5-10 minutos
-------------------------------------------
TOTAL:                        10-20 minutos
```

---

## 💰 COSTOS DE GAS ESTIMADOS

### En Base Sepolia (testnet):
```
Deploy PaymentSplitter:       ~0.01 ETH testnet
Deploy BashoodToken:          ~0.02 ETH testnet
Deploy BashoodPresaleFinal:   ~0.03 ETH testnet
Deploy contratos auxiliares:  ~0.02 ETH testnet
Configuración:                ~0.01 ETH testnet
--------------------------------
TOTAL ESTIMADO:               ~0.09 ETH testnet
```

**Recomendación:** Obtener al menos 0.2 ETH testnet (para tener margen)

---

## 📸 CAPTURAS DE PANTALLA (Referencia)

### Coinbase Faucet:
```
1. Seleccionar "Base Sepolia"
2. Pegar dirección: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
3. Click "Send me ETH"
4. Ver mensaje: "Success! You should receive your testnet ETH shortly"
```

### QuickNode Faucet:
```
1. Pegar dirección: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
2. Resolver CAPTCHA (robot detector)
3. Click "Request"
4. Ver mensaje: "Request submitted successfully"
```

### Alchemy Faucet:
```
1. Login con tu cuenta
2. Seleccionar "Base Sepolia"
3. Pegar dirección: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
4. Click "Send Me ETH"
5. Ver mensaje: "Transaction successful"
```

---

## ❓ PROBLEMAS COMUNES

### "Faucet ya usado en las últimas 24h"
**Solución:** Usar otro faucet diferente o esperar 24h

### "Dirección inválida"
**Solución:** Verificar que pegaste: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` (sin espacios)

### "Red no soportada"
**Solución:** Asegurarte de seleccionar "Base Sepolia" (no Base Mainnet, no Ethereum Sepolia)

### "No recibo el ETH después de 10 minutos"
**Solución:** 
1. Verificar en BaseScan: https://sepolia.basescan.org/address/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
2. Intentar con otro faucet
3. Revisar que seleccionaste la red correcta

### "Necesito más ETH"
**Solución:** Usar los 3 faucets (Coinbase + QuickNode + Alchemy) = 0.4 ETH total

---

## 🎯 CHECKLIST

Antes de desplegar, verifica:

- [ ] Tienes al menos 0.1 ETH en tu wallet (verificado con el comando)
- [ ] La wallet es: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- [ ] Estás en Base Sepolia (no mainnet)
- [ ] El archivo `.env` tiene `PRIVATE_KEY` configurada
- [ ] El archivo `.env` tiene las 4 wallets configuradas
- [ ] Hardhat está configurado para `base-sepolia`

Si todos los checks están ✅, estás listo para desplegar.

---

## 🚀 COMANDOS DE DEPLOYMENT

### Verificar configuración:
```bash
cat .env | grep WALLET
```

### Verificar saldo antes de desplegar:
```bash
node -e "const ethers = require('ethers'); const provider = new ethers.JsonRpcProvider('https://sepolia.base.org'); provider.getBalance('0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266').then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));"
```

### Desplegar PaymentSplitter:
```bash
npx hardhat run scripts/deploy-payment-splitter.js --network base-sepolia
```

### Desplegar ecosistema completo:
```bash
npx hardhat run scripts/deploy-bashood-complete.js --network base-sepolia
```

### Verificar contratos después del despliegue:
```bash
# Ver en BaseScan
https://sepolia.basescan.org/address/[DIRECCION_CONTRATO]
```

---

## 📞 SOPORTE

Si tienes problemas:
1. Verificar que estás en la red correcta (Base Sepolia)
2. Verificar que tu wallet tiene saldo suficiente
3. Revisar errores en la terminal
4. Consultar documentación de Hardhat: https://hardhat.org/

---

**¿Listo para obtener ETH? Elige un faucet y comienza:**
- 🔵 Coinbase: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- 🟣 QuickNode: https://faucet.quicknode.com/base/sepolia
- ⚪ Alchemy: https://www.alchemy.com/faucets/base-sepolia
