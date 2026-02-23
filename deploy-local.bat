@echo off
echo ================================================
echo DESPLIEGUE EN RED LOCAL DE HARDHAT
echo ================================================
echo.
echo Esta opción despliega en tu computadora (no en internet)
echo Las cuentas ya tienen ETH (no necesitas faucets)
echo.
echo PASO 1: Abrir terminal nueva y ejecutar:
echo    npx hardhat node
echo.
echo PASO 2: Dejar esa terminal abierta (servidor corriendo)
echo.
echo PASO 3: En OTRA terminal, desplegar:
echo    npx hardhat run scripts/deploy-bashood-complete.js --network localhost
echo.
echo ================================================
pause

echo Iniciando nodo local de Hardhat...
npx hardhat node
