# Kill lingering Ollama processes and free the default Ollama port if needed.
$ErrorActionPreference = 'SilentlyContinue'

Write-Host 'Checking Ollama processes...' -ForegroundColor Cyan
$ollamaProcesses = Get-Process -Name 'ollama'

if ($ollamaProcesses) {
    foreach ($process in $ollamaProcesses) {
        Write-Host ("Stopping ollama PID {0}" -f $process.Id) -ForegroundColor Yellow
        Stop-Process -Id $process.Id -Force
    }
} else {
    Write-Host 'No ollama process found.' -ForegroundColor Green
}

$defaultPort = 11434
$portOwners = Get-NetTCPConnection -LocalPort $defaultPort -State Listen -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

if ($portOwners) {
    foreach ($pid in $portOwners) {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host ("Stopping process on port {0}: {1} (PID {2})" -f $defaultPort, $proc.ProcessName, $pid) -ForegroundColor Yellow
        } else {
            Write-Host ("Stopping unknown process on port {0}: PID {1}" -f $defaultPort, $pid) -ForegroundColor Yellow
        }
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
} else {
    Write-Host ("No listening process found on port {0}." -f $defaultPort) -ForegroundColor Green
}

Write-Host 'Done.' -ForegroundColor Cyan
Pause
