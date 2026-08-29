@echo off
chcp 65001 > nul
title Configurar Acesso do Celular ao Wallet (WSL2)
echo ==========================================================
echo    CONFIGURANDO ACESSO DO CELULAR / REDE AO WALLET (WSL2)
echo ==========================================================
echo.

:: Verifica privilégios de Administrador
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] ATENCAO: Este arquivo precisa ser executado como Administrador!
    echo.
    echo     1. Va ate a pasta onde esta este arquivo no Windows.
    echo     2. Clique com o BOTAO DIREITO em "liberar_acesso_celular.bat".
    echo     3. Selecione "Executar como Administrador".
    echo.
    pause
    exit /b 1
)

:: Obtem o IP do WSL
for /f "tokens=1" %%i in ('wsl hostname -I') do set WSL_IP=%%i

if "%WSL_IP%"=="" (
    echo [!] Erro: WSL nao esta em execucao ou nao foi detectado.
    echo     Inicie o WSL com o ./start.sh antes de executar este script.
    echo.
    pause
    exit /b 1
)

echo [+] IP do WSL detectado: %WSL_IP%
echo.

:: Adiciona as regras de PortProxy no Windows
echo [+] Configurando redirecionamento de portas (PortProxy)...
netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=0.0.0.0 >nul 2>&1
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=%WSL_IP%

netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0 >nul 2>&1
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=%WSL_IP%

:: Libera as portas no Firewall do Windows
echo [+] Liberando portas 8000 e 5173 no Firewall do Windows...
netsh advfirewall firewall delete rule name="Wallet WSL Backend (8000)" >nul 2>&1
netsh advfirewall firewall add rule name="Wallet WSL Backend (8000)" dir=in action=allow protocol=TCP localport=8000 >nul 2>&1

netsh advfirewall firewall delete rule name="Wallet WSL Frontend (5173)" >nul 2>&1
netsh advfirewall firewall add rule name="Wallet WSL Frontend (5173)" dir=in action=allow protocol=TCP localport=5173 >nul 2>&1

echo.
echo ==========================================================
echo  [V] CONFIGURACAO CONCLUIDA COM SUCESSO!
echo ==========================================================
echo.
echo Regras ativas no Windows:
netsh interface portproxy show all
echo.
echo Teste no navegador do seu celular (no mesmo Wi-Fi):
echo ➜ http://192.168.15.4:5173          (Web App)
echo ➜ http://192.168.15.4:8000/api/health (API Backend)
echo.
pause
