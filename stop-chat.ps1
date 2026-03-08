$ErrorActionPreference = 'SilentlyContinue'
$port = 8765
$stopped = New-Object System.Collections.Generic.HashSet[int]

function Stop-ProcessTree {
    param([int]$Pid)

    if ($Pid -le 0 -or $stopped.Contains($Pid)) {
        return
    }

    $null = $stopped.Add($Pid)
    taskkill /PID $Pid /T /F | Out-Null
}

Write-Host 'Closing Ollama chat web server...' -ForegroundColor Cyan

$portOwners = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty OwningProcess -Unique

foreach ($pid in $portOwners) {
    if ($pid) {
        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host ("Stopping process on port {0}: {1} (PID {2})" -f $port, $proc.ProcessName, $pid) -ForegroundColor Yellow
        }
        Stop-ProcessTree -Pid $pid
    }
}

$processMatches = Get-CimInstance Win32_Process |
    Where-Object {
        ($_.CommandLine -match 'ollama-chat-web\\start-chat\.bat') -or
        ($_.CommandLine -match 'http\.server\s+8765')
    }

foreach ($proc in $processMatches) {
    Write-Host ("Stopping related process: {0} (PID {1})" -f $proc.Name, $proc.ProcessId) -ForegroundColor Yellow
    Stop-ProcessTree -Pid $proc.ProcessId
}

if ($stopped.Count -eq 0) {
    Write-Host 'No running start-chat service found.' -ForegroundColor Green
} else {
    Write-Host 'Chat web service closed.' -ForegroundColor Green
}

Pause
