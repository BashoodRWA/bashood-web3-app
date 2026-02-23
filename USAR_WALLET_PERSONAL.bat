@echo off
echo ================================================
echo COMO USAR TU PROPIA WALLET DE METAMASK
echo ================================================
echo.
echo Si quieres usar tu wallet personal (0x0370C18DD149355057CDDD3E636CcF5C97Bf098e)
echo en lugar de la de Hardhat, necesitas:
echo.
echo 1. Exportar la CLAVE PRIVADA desde MetaMask:
echo    - Abrir MetaMask
echo    - Click en los 3 puntos (...)
echo    - "Detalles de la cuenta"
echo    - "Mostrar clave privada"
echo    - Introducir contraseña
echo    - COPIAR la clave privada
echo.
echo 2. Reemplazar en el archivo .env:
echo    PRIVATE_KEY=tu_clave_privada_de_metamask
echo.
echo 3. La dirección pública se derivará automáticamente
echo.
echo ================================================
echo IMPORTANTE - SEGURIDAD:
echo ================================================
echo.
echo ❌ SI TU WALLET TIENE ETH REAL EN MAINNET:
echo    - NO exportes la clave privada
echo    - Crea una wallet NUEVA solo para testnet
echo    - Mantén separadas testnet y mainnet
echo.
echo ✅ OPCIÓN SEGURA:
echo    - Usar la wallet de Hardhat para testnet (ya configurada)
echo    - Crear wallet nueva en MetaMask SOLO para testnet
echo    - NO usar tu wallet principal
echo.
echo ================================================
pause
