@echo off
echo ================================================
echo DESPLEGANDO BASHOOD EN RED LOCAL
echo ================================================
echo.
echo IMPORTANTE: El nodo local debe estar corriendo
echo Si ves error de conexion, abre otra terminal y ejecuta:
echo    npx hardhat node
echo.
echo Presiona cualquier tecla para continuar...
pause >nul

npx hardhat run scripts/deploy-bashood-complete.cjs --network localhost

echo.
echo ================================================
echo DEPLOYMENT COMPLETADO
echo ================================================
pause
