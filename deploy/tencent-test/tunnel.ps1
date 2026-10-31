param([int]$LocalPort = 3300)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$values = @{}
Get-Content -LiteralPath (Join-Path $repoRoot '.env') | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith('#') -and $line.Contains('=')) {
    $parts = $line.Split('=', 2)
    $values[$parts[0].Trim()] = $parts[1].Trim().Trim('"').Trim("'")
  }
}
$serverAddress = $values['SSH_IP']
$sshUser = $values['SSH_USER']
$sshPort = if ($values['SSH_PORT']) { $values['SSH_PORT'] } else { '22' }
if (-not $serverAddress -or -not $sshUser) { throw 'SSH_IP and SSH_USER are required in the root .env' }
Write-Host "Cloud test admin: http://127.0.0.1:${LocalPort}/admin"
Write-Host 'Keep this terminal open. Press Ctrl+C to close the tunnel.'
# OpenSSH prompts for the password securely; never put it on the command line.
& ssh -N -p $sshPort -o ExitOnForwardFailure=yes -o ServerAliveInterval=30 -o ServerAliveCountMax=3 -L ('127.0.0.1:{0}:127.0.0.1:18080' -f $LocalPort) ('{0}@{1}' -f $sshUser, $serverAddress)
exit $LASTEXITCODE
