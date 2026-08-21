$ErrorActionPreference = "Stop"

$taskName = "GILD Social Metrics Sync"
$dashboardDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$node = (Get-Command node).Source
$script = Join-Path $dashboardDir "sync-socials.mjs"

$action = New-ScheduledTaskAction `
  -Execute $node `
  -Argument "`"$script`"" `
  -WorkingDirectory $dashboardDir

$trigger = New-ScheduledTaskTrigger `
  -Once `
  -At (Get-Date).AddMinutes(5) `
  -RepetitionInterval (New-TimeSpan -Hours 1) `
  -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Syncs GILD social metrics into public/dashboard/social-data.json every hour." `
  -Force | Out-Null

Write-Output "Installed scheduled task: $taskName"
