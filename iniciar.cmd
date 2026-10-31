@echo off
rem Doble clic para arrancar todo. Cierra esta ventana para detenerlo.
cd /d "%~dp0"
node tools\dev.mjs
pause
