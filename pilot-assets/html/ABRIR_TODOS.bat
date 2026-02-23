@echo off
echo ====================================================
echo ABRIENDO DOCUMENTOS PARA CONVERSION A PDF
echo ====================================================
echo.
echo Presiona Ctrl+P en cada ventana para guardar como PDF
echo.
pause

start "" "index.html"
timeout /t 2 /nobreak >nul
start "" "01_PROPUESTA_TOKENIZACION.html"
timeout /t 2 /nobreak >nul
start "" "02_DUE_DILIGENCE_CHECKLIST.html"
timeout /t 2 /nobreak >nul
start "" "03_GUION_LLAMADA.html"
timeout /t 2 /nobreak >nul
start "" "04_TERMINOS_CONTRACTUALES_BORRADOR.html"

echo.
echo ====================================================
echo DOCUMENTOS ABIERTOS EN EL NAVEGADOR
echo ====================================================
echo.
echo INSTRUCCIONES:
echo 1. En cada ventana, presiona Ctrl+P
echo 2. Selecciona "Guardar como PDF"
echo 3. Guarda con el mismo nombre del archivo
echo.
pause
