# Checklist de Verificación de Claves/Carteras - Bashood

## ⚠️ CRÍTICO: Verificar ANTES de cualquier despliegue o batch-mint

La verificación incorrecta de claves puede causar:
- ❌ Pérdida permanente de fondos
- ❌ Pérdida de control de contratos
- ❌ Imposibilidad de ejecutar funciones privilegiadas
- ❌ Costos de gas desperdiciados
- ❌ Necesidad de redesplegar contratos

---

## 1. Checklist Pre-Despliegue

### 1.1 Verificación de Claves Privadas

- [ ] **Formato correcto**: Las claves privadas están en formato hexadecimal (0x... 64 caracteres)
- [ ] **No están en repositorio**: Las claves NO están commiteadas en git
- [ ] **Archivo .env existe**: El archivo `.env` existe y contiene las variables necesarias
- [ ] **Variables cargadas**: Las variables de entorno se cargan correctamente en `hardhat.config.js`
- [ ] **Backup seguro**: Existe un backup de las claves en un lugar seguro (hardware wallet, password manager)

### 1.2 Derivación de Direcciones

- [ ] **Deployer address**: La dirección del deployer se deriva correctamente
- [ ] **Admin address**: La dirección del admin se deriva correctamente
- [ ] **Emergency address**: La dirección del emergency se deriva correctamente
- [ ] **Operations address**: La dirección del operations wallet se deriva correctamente
- [ ] **Checksums**: Todas las direcciones pasan validación de checksum

### 1.3 Capacidad de Firma

- [ ] **Deployer puede firmar**: El deployer puede firmar mensajes
- [ ] **Admin puede firmar**: El admin puede firmar mensajes
- [ ] **Emergency puede firmar**: El emergency puede firmar mensajes
- [ ] **Operations puede firmar**: El operations wallet puede firmar mensajes
- [ ] **Firma verificable**: Las firmas se pueden verificar correctamente

### 1.4 Balances

- [ ] **Deployer tiene fondos**: >= 0.1 ETH (o equivalente en la red)
- [ ] **Admin tiene fondos**: >= 0.01 ETH (para transacciones de admin)
- [ ] **Emergency tiene fondos**: >= 0.01 ETH (para emergencias)
- [ ] **Operations tiene fondos**: >= 0.01 ETH (para operaciones)
- [ ] **Fondos en red correcta**: Los balances están en la red donde se va a desplegar

### 1.5 Configuración de Red

- [ ] **Red configurada**: La red objetivo está configurada en `hardhat.config.js`
- [ ] **RPC funciona**: El endpoint RPC responde correctamente
- [ ] **ChainId correcto**: El chainId coincide con la red esperada
- [ ] **Gas price**: El gas price configurado es apropiado para la red

---

## 2. Checklist Post-Despliegue

### 2.1 Ownership de Contratos

- [ ] **BashoodRescue owner**: El deployer es owner del contrato BashoodRescue
- [ ] **BashoodPresaleFinal owner**: El deployer es owner del contrato BashoodPresaleFinal
- [ ] **BashoodMultiToken owner**: El deployer es owner del contrato BashoodMultiToken
- [ ] **BashoodReferral owner**: El deployer es owner del contrato BashoodReferral

### 2.2 Roles y Permisos

#### BashoodRescue
- [ ] **ADMIN_ROLE**: Admin wallet tiene ADMIN_ROLE
- [ ] **EMERGENCY_ROLE**: Emergency wallet tiene EMERGENCY_ROLE
- [ ] **DEFAULT_ADMIN_ROLE**: Admin wallet tiene DEFAULT_ADMIN_ROLE

#### BashoodPresaleFinal
- [ ] **ADMIN_ROLE**: Admin wallet tiene ADMIN_ROLE
- [ ] **OPERATOR_ROLE**: Operations wallet tiene OPERATOR_ROLE (si aplica)
- [ ] **Signer configurado**: La dirección del signer está configurada correctamente

#### BashoodMultiToken
- [ ] **MINTER_ROLE**: Deployer/Admin tiene MINTER_ROLE
- [ ] **DEFAULT_ADMIN_ROLE**: Admin tiene DEFAULT_ADMIN_ROLE

### 2.3 Configuraciones Críticas

- [ ] **projectWallet**: La dirección del project wallet es correcta
- [ ] **operationsWallet**: La dirección del operations wallet es correcta
- [ ] **treasuryWallet**: La dirección del treasury wallet es correcta
- [ ] **Rescue contract**: El contrato rescue está configurado en presale
- [ ] **NFT contract**: El contrato NFT está configurado en presale
- [ ] **Token contract**: El contrato BHT está configurado en presale

---

## 3. Checklist Pre Batch-Mint

### 3.1 Permisos de Mint

- [ ] **MINTER_ROLE verificado**: El wallet que ejecuta el batch-mint tiene MINTER_ROLE
- [ ] **Balance suficiente**: El wallet tiene suficiente ETH para gas
- [ ] **Gas limit**: El gas limit configurado es suficiente para el batch
- [ ] **NFT supply**: Hay supply suficiente de NFTs para mintear

### 3.2 Configuración de Batch

- [ ] **Direcciones válidas**: Todas las direcciones destino son válidas
- [ ] **Cantidades correctas**: Las cantidades por NFT son correctas
- [ ] **IDs correctos**: Los IDs de NFT son los esperados
- [ ] **Tamaño de batch**: El tamaño del batch no excede el gas limit
- [ ] **Datos serializados**: Los datos de mint están correctamente formateados

### 3.3 Verificación de Resultados

- [ ] **Transacción confirmada**: La transacción se confirmó en la blockchain
- [ ] **Eventos emitidos**: Los eventos de mint se emitieron correctamente
- [ ] **Balances actualizados**: Los balances de NFT se actualizaron
- [ ] **Gas usado**: El gas usado está dentro de lo esperado
- [ ] **No reverts**: No hubo reverts durante el mint

---

## 4. Comandos de Verificación

### Verificación Automática (Recomendado)
```bash
# Ejecutar script de verificación completo
npx hardhat run scripts/verify-wallets.js --network <network>
```

### Verificación Manual

```bash
# 1. Verificar balance de deployer
npx hardhat run scripts/check-balance.js --network <network>

# 2. Verificar ownership de contratos
npx hardhat run scripts/verify-ownership.js --network <network>

# 3. Verificar roles
npx hardhat run scripts/verify-roles.js --network <network>

# 4. Test de firma
npx hardhat run scripts/test-signing.js --network <network>
```

---

## 5. Troubleshooting Común

### Error: "insufficient funds"
- **Causa**: El wallet no tiene suficiente ETH para gas
- **Solución**: Transferir ETH al wallet antes de desplegar

### Error: "nonce too low/high"
- **Causa**: El nonce está desincronizado
- **Solución**: Resetear el nonce o esperar confirmación de transacciones pendientes

### Error: "invalid signature"
- **Causa**: La clave privada no corresponde a la dirección esperada
- **Solución**: Verificar que la clave privada en .env es la correcta

### Error: "caller is not the owner"
- **Causa**: El wallet que llama no es el owner del contrato
- **Solución**: Usar el wallet correcto o transferir ownership

### Error: "missing role"
- **Causa**: El wallet no tiene el rol necesario
- **Solución**: Garantizar el rol desde un wallet con DEFAULT_ADMIN_ROLE

---

## 6. Mejores Prácticas de Seguridad

### 6.1 Gestión de Claves

✅ **HACER**:
- Usar hardware wallets para mainnet
- Mantener claves en password managers encriptados
- Usar diferentes claves para diferentes redes
- Rotar claves periódicamente
- Hacer backup de claves en múltiples ubicaciones seguras

❌ **NO HACER**:
- Commitear claves en repositorios
- Compartir claves por email/chat
- Reutilizar claves entre proyectos
- Almacenar claves en texto plano
- Usar la misma clave en testnet y mainnet

### 6.2 Separación de Roles

- **Deployer**: Solo para despliegue inicial, después transferir ownership
- **Admin**: Para operaciones administrativas, multisig recomendado
- **Emergency**: Solo para emergencias, multisig altamente recomendado
- **Operations**: Para operaciones diarias, puede ser EOA con balance limitado

### 6.3 Validación Pre-Mainnet

1. **Testnet primero**: Siempre probar en testnet antes de mainnet
2. **Dry run**: Ejecutar transacciones con `--dry-run` si disponible
3. **Double check**: Verificar dos veces todas las direcciones
4. **Gas estimation**: Estimar gas antes de ejecutar
5. **Monitoring**: Monitorear la transacción hasta confirmación

---

## 7. Template de Variables de Entorno

```bash
# .env.example
# NUNCA commitear el .env real

# Network Configuration
INFURA_API_KEY=your_infura_key
ALCHEMY_API_KEY=your_alchemy_key

# Wallet Private Keys (NUNCA commitear estas claves reales)
DEPLOYER_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
ADMIN_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
EMERGENCY_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000
OPERATIONS_PRIVATE_KEY=0x0000000000000000000000000000000000000000000000000000000000000000

# Contract Addresses (Actualizar después de despliegue)
RESCUE_ADDRESS=
PRESALE_ADDRESS=
MULTITOKEN_ADDRESS=
REFERRAL_ADDRESS=
BHT_ADDRESS=

# Etherscan API (para verificación)
ETHERSCAN_API_KEY=your_etherscan_key
```

---

## 8. Contacto de Emergencia

En caso de problemas críticos durante el despliegue:

1. **STOP**: No continuar con transacciones
2. **REVISAR**: Volver a este checklist
3. **EJECUTAR**: Script de verificación
4. **DOCUMENTAR**: Capturar logs y errores
5. **ESCALAR**: Contactar al equipo técnico

---

**Fecha última actualización**: Diciembre 2025  
**Versión**: 1.0  
**Mantenedor**: Bashood Dev Team
