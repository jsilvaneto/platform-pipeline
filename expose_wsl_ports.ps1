# Script PowerShell para liberar acesso da Rede Wi-Fi / Celular ao Wallet no WSL2
# Execute como Administrador no Windows

$ErrorActionPreference = "SilentlyContinue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   LIBERANDO ACESSO DA REDE LOCAL AO WALLET (WSL2)        " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Obtém o IP interno do WSL
$wslIp = (wsl hostname -I).Split(" ")[0].Trim()

if (-not $wslIp) {
    Write-Host "[!] Não foi possível identificar o IP do WSL. Certifique-se de que o WSL está em execução." -ForegroundColor Red
    Exit 1
}

Write-Host "[+] IP interno do WSL detectado: $wslIp" -ForegroundColor Green

# 2. Configura o PortProxy no Windows para portas 8000 (Backend) e 5173 (Frontend)
Write-Host "[+] Criando regras de redirecionamento de portas (PortProxy)..." -ForegroundColor Yellow
netsh interface portproxy delete v4tov4 listenport=8000 listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=8000 listenaddress=0.0.0.0 connectport=8000 connectaddress=$wslIp

netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wslIp

# 3. Libera as portas no Firewall do Windows
Write-Host "[+] Liberando portas 8000 e 5173 no Firewall do Windows..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Wallet WSL Backend (8000)" | Out-Null
netsh advfirewall firewall add rule name="Wallet WSL Backend (8000)" dir=in action=allow protocol=TCP localport=8000 | Out-Null

netsh advfirewall firewall delete rule name="Wallet WSL Frontend (5173)" | Out-Null
netsh advfirewall firewall add rule name="Wallet WSL Frontend (5173)" dir=in action=allow protocol=TCP localport=5173 | Out-Null

# 4. Obtém o IP da máquina na rede local
$lanIp = ((Get-NetRoute -DestinationPrefix "0.0.0.0/0" | Sort-Object RouteMetric | Select-Object -First 1) | ForEach-Object { Get-NetIPAddress -InterfaceIndex $_.InterfaceIndex -AddressFamily IPv4 }).IPAddress

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  [✓] CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
Write-Host "----------------------------------------------------------" -ForegroundColor Green
Write-Host "  Agora o seu celular na mesma rede Wi-Fi pode acessar:" -ForegroundColor White
Write-Host "  ➜ Backend API: http://${lanIp}:8000" -ForegroundColor Cyan
Write-Host "  ➜ Frontend:    http://${lanIp}:5173" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""
Pause
