<#
-------------------------------------------------------------------------------
bootstrap.ps1 - install the tools Desktop Starter App Builder needs (Windows)

Purpose
  Detects the Windows version and processor architecture, checks which
  prerequisites are already installed at an acceptable version, prints a plan
  table, asks for confirmation, and then installs only what is missing with
  winget (the Windows Package Manager). It finishes by running the builder's
  read-only `doctor` command when Bun is available.

  Works in Windows PowerShell 5.1 and PowerShell 7.

Usage (from the repository root)
  powershell -ExecutionPolicy Bypass -File scripts\bootstrap.ps1 [--base electron|tauri|all]
             [--mobile] [--e2e] [--yes] [--dry-run] [--help]

  --base      Which app base to prepare for (default: all).
  --mobile    Also prepare Tauri Android tooling (iOS needs macOS).
  --e2e       Also install tauri-driver for Tauri end-to-end tests.
  --yes       Do not ask questions; treat every prompt as answered "yes".
  --dry-run   Print the plan and the exact commands, change nothing.

Safety rules this script follows
  * Installers started by winget may add their own folders to PATH; that is
    the installer's normal behaviour. This script itself changes only the
    user-level variables JAVA_HOME, ANDROID_HOME and NDK_HOME, and only after
    printing them and getting a "yes" (or --yes).
  * Visual Studio Build Tools asks for administrator rights (a UAC prompt).
  * Running it twice is safe: tools that are already present are skipped.
-------------------------------------------------------------------------------
#>
$ErrorActionPreference = 'Stop'

$MinBun = [version]'1.3.0'
$MinNode = [version]'22.17.0'
$MinRust = [version]'1.90.0'
$RepoRoot = Split-Path -Parent $PSScriptRoot

# --- Arguments (GNU style, to match bootstrap.sh) ----------------------------

$Base = 'all'
$Mobile = $false
$PackageManager = 'bun'
# Inside a generated app, default to the app's own base and targets from project-plan.json.
$PlanFile = Join-Path $RepoRoot 'project-plan.json'
if (Test-Path $PlanFile) {
  $PlanText = Get-Content -Raw $PlanFile
  if ($PlanText -match '"base": "tauri"') { $Base = 'tauri' }
  if ($PlanText -match '"base": "electron"') { $Base = 'electron' }
  # Only the "targets" array decides mobile ("uiTheme": "ios" is a look, not a target).
  if (($PlanText -replace '\s', '') -match '"targets":\[[^\]]*"(android|ios)"') { $Mobile = $true }
  if ($PlanText -match '"packageManager": "npm"') { $PackageManager = 'npm' }
}
$E2E = $false
$AssumeYes = $false
$DryRun = $false

function Show-Usage {
  $text = Get-Content -LiteralPath $PSCommandPath -TotalCount 32
  $text | Where-Object { $_ -notmatch '^(<#|#>|-{10,})' } | ForEach-Object { Write-Host $_ }
}

$i = 0
while ($i -lt $args.Count) {
  $a = [string]$args[$i]
  switch -Regex ($a) {
    '^--?base$' {
      if ($i + 1 -ge $args.Count) { Write-Host 'error: --base needs a value (electron, tauri or all)'; exit 2 }
      $Base = [string]$args[$i + 1]; $i += 2; break
    }
    '^--?base=' { $Base = $a.Substring($a.IndexOf('=') + 1); $i += 1; break }
    '^--?mobile$' { $Mobile = $true; $i += 1; break }
    '^--?e2e$' { $E2E = $true; $i += 1; break }
    '^(--?yes|-y)$' { $AssumeYes = $true; $i += 1; break }
    '^--?dry-?run$' { $DryRun = $true; $i += 1; break }
    '^(--?help|-h|/\?)$' { Show-Usage; exit 0 }
    default { Write-Host "error: unknown argument '$a' (see --help)"; exit 2 }
  }
}
if (@('electron', 'tauri', 'all') -notcontains $Base) {
  Write-Host 'error: --base must be electron, tauri or all'
  exit 2
}
function Want-Electron { return ($Base -eq 'electron' -or $Base -eq 'all') }
function Want-Tauri { return ($Base -eq 'tauri' -or $Base -eq 'all') }

# --- Helpers -----------------------------------------------------------------

function Confirm-Step([string]$Question) {
  if ($AssumeYes) { Write-Host "$Question [y/N] y (--yes)"; return $true }
  $reply = Read-Host "$Question [y/N]"
  return ($reply -eq 'y' -or $reply -eq 'Y' -or $reply -eq 'yes')
}

# Reloads PATH from the registry so tools installed a moment ago are found.
function Update-SessionPath {
  $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $user = [Environment]::GetEnvironmentVariable('Path', 'User')
  $extra = @("$HOME\.bun\bin", "$HOME\.cargo\bin") | Where-Object { Test-Path $_ }
  $env:Path = (@($machine, $user) + $extra | Where-Object { $_ }) -join ';'
}

function Test-Command([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

# Runs "<cmd> <args>" and returns the first dotted version number, or $null.
function Get-ToolVersion([string]$Name, [string[]]$Arguments) {
  if (-not (Test-Command $Name)) { return $null }
  try {
    $out = (& $Name @Arguments 2>$null | Out-String)
  } catch {
    return $null
  }
  $m = [regex]::Match($out, '\d+(\.\d+)+')
  if ($m.Success) { return $m.Value }
  return $null
}

function Test-VersionAtLeast([string]$Found, [version]$Minimum) {
  if (-not $Found) { return $false }
  $parts = $Found.Split('.')
  while ($parts.Count -lt 3) { $parts += '0' }
  $v = [version]("{0}.{1}.{2}" -f $parts[0], $parts[1], $parts[2])
  return ($v -ge $Minimum)
}

# --- Plan state --------------------------------------------------------------

$Rows = New-Object System.Collections.ArrayList
$Steps = New-Object System.Collections.ArrayList
$Manual = New-Object System.Collections.ArrayList
$EnvVars = New-Object System.Collections.ArrayList

function Add-Row([string]$Tool, [string]$Found, [string]$Action) {
  if (-not $Found) { $Found = '-' }
  [void]$Rows.Add([pscustomobject]@{ Tool = $Tool; Found = $Found; Action = $Action })
}
# A step is data (Kind + parameters), not a script block, so it runs in the
# script's own scope and can call the helper functions defined here.
function Add-Step([string]$Description, [string]$Shown, [string]$Kind, [string]$Target, [string[]]$Arguments) {
  [void]$Steps.Add([pscustomobject]@{
      Description = $Description; Shown = $Shown; Kind = $Kind; Target = $Target; Arguments = $Arguments
    })
}
function Add-Manual([string]$Text) { [void]$Manual.Add($Text) }
function Add-EnvVar([string]$Name, [string]$Value) {
  $current = [Environment]::GetEnvironmentVariable($Name, 'User')
  if ($current -ne $Value) {
    [void]$EnvVars.Add([pscustomobject]@{ Name = $Name; Value = $Value; Current = $current })
  }
}

function Invoke-Winget([string]$Id, [string]$Override) {
  $wingetArgs = @('install', '--id', $Id, '-e', '--source', 'winget',
    '--accept-package-agreements', '--accept-source-agreements')
  if ($Override) { $wingetArgs += @('--override', $Override) }
  & winget @wingetArgs
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "winget install $Id exited with code $LASTEXITCODE."
  }
  Update-SessionPath
}

function Add-WingetStep([string]$Description, [string]$Id, [string]$Override) {
  $shown = "winget install --id $Id -e --source winget --accept-package-agreements --accept-source-agreements"
  if ($Override) { $shown += " --override `"$Override`"" }
  Add-Step $Description $shown 'winget' $Id @($Override)
}

function Add-NativeStep([string]$Description, [string]$Exe, [string[]]$Arguments) {
  Add-Step $Description "$Exe $($Arguments -join ' ')" 'native' $Exe $Arguments
}

function Invoke-Native([string]$Exe, [string[]]$Arguments) {
  Update-SessionPath
  & $Exe @Arguments
  if ($LASTEXITCODE -ne 0) { Write-Warning "$Exe exited with code $LASTEXITCODE." }
}

# --- Platform detection ------------------------------------------------------

$osVersion = [Environment]::OSVersion.Version
$arch = $env:PROCESSOR_ARCHITECTURE
if ($env:PROCESSOR_ARCHITEW6432) { $arch = $env:PROCESSOR_ARCHITEW6432 }
Update-SessionPath

$HaveWinget = Test-Command 'winget'

# --- Checks ------------------------------------------------------------------

function Check-Git {
  $v = Get-ToolVersion 'git' @('--version')
  if ($v) { Add-Row 'Git' $v 'ok'; return }
  Add-Row 'Git (includes Git Bash)' $null 'install with winget'
  Add-WingetStep 'Install Git' 'Git.Git' $null
}

function Check-Bun {
  $v = Get-ToolVersion 'bun' @('--version')
  if (-not $v) {
    Add-Row "Bun >= $MinBun" $null 'install with winget'
    Add-WingetStep 'Install Bun' 'Oven-sh.Bun' $null
  } elseif (Test-VersionAtLeast $v $MinBun) {
    Add-Row "Bun >= $MinBun" $v 'ok'
  } else {
    Add-Row "Bun >= $MinBun" $v 'upgrade (bun upgrade)'
    Add-NativeStep 'Upgrade Bun' 'bun' @('upgrade')
  }
}

function Check-Node {
  $v = Get-ToolVersion 'node' @('--version')
  if (Test-VersionAtLeast $v $MinNode) { Add-Row "Node.js >= $MinNode" $v 'ok'; return }
  Add-Row "Node.js >= $MinNode" $v 'install Node.js LTS with winget'
  Add-WingetStep 'Install Node.js LTS' 'OpenJS.NodeJS.LTS' $null
}

function Check-BuildTools {
  $programFilesX86 = ${env:ProgramFiles(x86)}
  if (-not $programFilesX86) { $programFilesX86 = 'C:\Program Files (x86)' }
  $vswhere = [IO.Path]::Combine($programFilesX86, 'Microsoft Visual Studio\Installer\vswhere.exe')
  $withVc = $null
  $anyVs = $null
  if (Test-Path $vswhere) {
    $withVc = & $vswhere -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property displayName |
      Select-Object -First 1
    $anyVs = & $vswhere -products * -property displayName | Select-Object -First 1
  }
  if ($withVc) {
    Add-Row 'C++ Build Tools (Desktop development with C++)' $withVc 'ok'
  } elseif ($anyVs) {
    Add-Row 'C++ Build Tools (Desktop development with C++)' "$anyVs without C++" 'manual'
    Add-Manual ("Open the Visual Studio Installer, choose Modify on '$anyVs', tick " +
      "'Desktop development with C++' and install.")
  } else {
    Add-Row 'C++ Build Tools (Desktop development with C++)' $null 'install with winget (admin prompt)'
    Add-WingetStep 'Install Visual Studio Build Tools with the C++ workload' 'Microsoft.VisualStudio.BuildTools' `
      '--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended'
  }
}

function Check-WebView2 {
  $keys = @(
    'HKLM:\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'HKLM:\SOFTWARE\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}',
    'HKCU:\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}'
  )
  $found = $null
  foreach ($k in $keys) {
    $p = Get-ItemProperty -Path $k -Name pv -ErrorAction SilentlyContinue
    if ($p -and $p.pv -and $p.pv -ne '0.0.0.0') { $found = $p.pv; break }
  }
  if ($found) { Add-Row 'WebView2 runtime' $found 'ok'; return }
  Add-Row 'WebView2 runtime' $null 'install with winget'
  Add-WingetStep 'Install the WebView2 runtime' 'Microsoft.EdgeWebView2Runtime' $null
}

function Check-Rust {
  $v = Get-ToolVersion 'rustc' @('--version')
  if (-not $v) {
    Add-Row "Rust >= $MinRust (rustup, MSVC)" $null 'install with winget'
    Add-WingetStep 'Install rustup' 'Rustlang.Rustup' $null
    Add-NativeStep 'Make the MSVC stable toolchain the default' 'rustup' @('default', 'stable-msvc')
    return
  }
  $hostLine = $null
  try { $hostLine = (& rustc -vV 2>$null | Select-String '^host:' | Select-Object -First 1) } catch { $hostLine = $null }
  $isMsvc = ($hostLine -and ($hostLine.ToString() -match 'msvc'))
  if ((Test-VersionAtLeast $v $MinRust) -and $isMsvc) {
    Add-Row "Rust >= $MinRust (rustup, MSVC)" $v 'ok'
  } elseif (Test-Command 'rustup') {
    Add-Row "Rust >= $MinRust (rustup, MSVC)" $v 'rustup update stable + default stable-msvc'
    Add-NativeStep 'Update the stable toolchain' 'rustup' @('update', 'stable')
    Add-NativeStep 'Make the MSVC stable toolchain the default' 'rustup' @('default', 'stable-msvc')
  } else {
    Add-Row "Rust >= $MinRust (rustup, MSVC)" $v 'manual'
    Add-Manual 'Rust was not installed with rustup. Uninstall it, then install rustup (winget install --id Rustlang.Rustup).'
  }
}

function Add-RustTargets([string]$Label, [string[]]$Targets) {
  if (-not (Test-Command 'rustup')) {
    Add-Row $Label $null 'add after rustup is installed'
    Add-NativeStep "Add Rust targets: $($Targets -join ' ')" 'rustup' (@('target', 'add') + $Targets)
    return
  }
  $installed = @()
  try { $installed = @(& rustup target list --installed 2>$null) } catch { $installed = @() }
  $missing = @($Targets | Where-Object { $installed -notcontains $_ })
  if ($missing.Count -eq 0) { Add-Row $Label 'installed' 'ok'; return }
  Add-Row $Label "missing $($missing.Count)" 'rustup target add'
  Add-NativeStep "Add Rust targets: $($missing -join ' ')" 'rustup' (@('target', 'add') + $missing)
}

function Check-Android {
  $studio = 'C:\Program Files\Android\Android Studio'
  $sdk = [IO.Path]::Combine([string]$env:LOCALAPPDATA, 'Android\Sdk')
  if (Test-Path ([IO.Path]::Combine($studio, 'bin'))) {
    Add-Row 'Android Studio' 'installed' 'ok'
  } else {
    Add-Row 'Android Studio' $null 'install with winget'
    Add-WingetStep 'Install Android Studio' 'Google.AndroidStudio' $null
  }
  $ndkDir = [IO.Path]::Combine($sdk, 'ndk')
  if ((Test-Path ([IO.Path]::Combine($sdk, 'platform-tools'))) -and (Test-Path $ndkDir)) {
    Add-Row 'Android SDK + NDK' $sdk 'ok'
  } else {
    Add-Row 'Android SDK + NDK' $null 'manual (Android Studio SDK Manager)'
    Add-Manual ('In Android Studio open the SDK Manager and install: Android SDK Platform, Android SDK Platform-Tools, ' +
      'NDK (Side by side), Android SDK Build-Tools and Android SDK Command-line Tools. Then run this script again ' +
      'with --mobile so it can set NDK_HOME.')
  }
  Add-EnvVar 'JAVA_HOME' ([IO.Path]::Combine($studio, 'jbr'))
  Add-EnvVar 'ANDROID_HOME' $sdk
  if (Test-Path $ndkDir) {
    $ver = Get-ChildItem -Name $ndkDir | Select-Object -Last 1
    if ($ver) { Add-EnvVar 'NDK_HOME' ([IO.Path]::Combine($ndkDir, $ver)) }
  }
  Add-Row 'JAVA_HOME / ANDROID_HOME / NDK_HOME' "$($EnvVars.Count) to set" 'user environment variables (shown below)'
  Add-RustTargets 'Rust Android targets' @('aarch64-linux-android', 'armv7-linux-androideabi', 'i686-linux-android', 'x86_64-linux-android')
}

function Check-E2E {
  if (-not (Want-Tauri)) { return }
  if ((Test-Command 'tauri-driver') -or (Test-Path "$HOME\.cargo\bin\tauri-driver.exe")) {
    Add-Row 'tauri-driver' 'installed' 'ok'
  } else {
    Add-Row 'tauri-driver' $null 'cargo install tauri-driver --locked'
    Add-NativeStep 'Install tauri-driver' 'cargo' @('install', 'tauri-driver', '--locked')
  }
  if (Test-Command 'msedgedriver') {
    Add-Row 'msedgedriver.exe' 'on PATH' 'ok (must match the Edge version)'
  } else {
    Add-Row 'msedgedriver.exe' $null 'manual'
    Add-Manual ('Tauri end-to-end tests need msedgedriver.exe matching your Edge version on PATH. The Tauri docs ' +
      'download it with: cargo install --git https://github.com/chippers/msedgedriver-tool ; then ' +
      '& "$HOME\.cargo\bin\msedgedriver-tool.exe" ; put the downloaded msedgedriver.exe in a folder on PATH.')
  }
}

Check-Git
# Apps generated for npm run their scripts with Node.js instead of Bun.
if ($PackageManager -eq 'npm') { Check-Node } else { Check-Bun; if (Want-Electron) { Check-Node } }
if (Want-Tauri) {
  Check-BuildTools
  Check-WebView2
  Check-Rust
}
if ($Mobile) {
  if (Want-Tauri) {
    Check-Android
    Add-Manual 'iOS apps can only be built on macOS; run scripts/bootstrap.sh --mobile on a Mac for iOS tooling.'
  } else {
    Write-Warning '--mobile applies to Tauri only; ignored for --base electron.'
  }
}
if ($E2E) { Check-E2E }

# --- Show the plan -----------------------------------------------------------

Write-Host ''
Write-Host 'Desktop Starter App Builder bootstrap'
Write-Host "Host: Windows $osVersion ($arch), PowerShell $($PSVersionTable.PSVersion)"
Write-Host ("Base: {0}   mobile: {1}   e2e: {2}" -f $Base, $(if ($Mobile) { 'yes' } else { 'no' }), $(if ($E2E) { 'yes' } else { 'no' }))
if ($osVersion.Major -eq 10 -and $osVersion.Build -lt 17763) {
  Write-Warning 'Bun needs Windows 10 version 1809 (build 17763) or newer.'
}
Write-Host ''
Write-Host ('{0,-48} {1,-28} {2}' -f 'TOOL', 'FOUND', 'ACTION')
Write-Host ('{0,-48} {1,-28} {2}' -f '----', '-----', '------')
foreach ($r in $Rows) {
  $found = [string]$r.Found
  if ($found.Length -gt 28) { $found = $found.Substring(0, 28) }
  Write-Host ('{0,-48} {1,-28} {2}' -f $r.Tool, $found, $r.Action)
}
Write-Host 

$usesWinget = @($Steps | Where-Object { $_.Shown -like 'winget *' }).Count -gt 0
if ($usesWinget -and -not $HaveWinget) {
  Write-Host 'winget is not available. Install "App Installer" from the Microsoft Store (it provides winget),'
  Write-Host 'then run this script again.'
  if (-not $DryRun) { exit 1 }
  Write-Host ''
}

if ($Steps.Count -gt 0) {
  Write-Host 'Commands that will run, in order:'
  $n = 1
  foreach ($s in $Steps) {
    Write-Host ("  {0}. {1}" -f $n, $s.Description)
    Write-Host ("     {0}" -f $s.Shown)
    $n += 1
  }
  Write-Host ''
}
if ($EnvVars.Count -gt 0) {
  Write-Host 'User environment variables that will be offered (equivalent commands):'
  foreach ($e in $EnvVars) {
    Write-Host ("  [System.Environment]::SetEnvironmentVariable(`"{0}`", `"{1}`", `"User`")" -f $e.Name, $e.Value)
  }
  Write-Host ''
}

function Show-Manual {
  if ($Manual.Count -gt 0) {
    Write-Host ''
    Write-Host 'Manual steps (this script cannot do these for you):'
    foreach ($m in $Manual) { Write-Host "  - $m" }
  }
}

function Invoke-Doctor {
  Update-SessionPath
  # Inside a generated app (no cli folder) the app's own scripts/doctor.mjs reads project-plan.json.
  if (-not (Test-Path (Join-Path $RepoRoot 'cli/main.ts'))) {
    $Runner = 'bun'
    if ($PackageManager -eq 'npm') { $Runner = 'node' }
    if (-not (Test-Command $Runner)) {
      Write-Host ''
      Write-Host "$Runner is not on PATH yet, so the doctor check was skipped. Open a new terminal and run: $Runner scripts/doctor.mjs"
      return
    }
    Write-Host ''
    Write-Host "Running: $Runner scripts/doctor.mjs"
    Push-Location $RepoRoot
    try {
      & $Runner 'scripts/doctor.mjs'
      if ($LASTEXITCODE -ne 0) { Write-Warning 'doctor reported missing tools (see above).' }
    } finally {
      Pop-Location
    }
    return
  }
  if (-not (Test-Command 'bun')) {
    Write-Host ''
    Write-Host 'Bun is not on PATH yet, so the doctor check was skipped. Open a new terminal and run:'
    Write-Host '  .\start.ps1 doctor --base tauri   (or --base electron)'
    return
  }
  $bases = @($Base)
  if ($Base -eq 'all') { $bases = @('electron', 'tauri') }
  foreach ($b in $bases) {
    Write-Host ''
    Write-Host "Running: bun cli/main.ts doctor --base $b"
    Push-Location $RepoRoot
    try {
      & bun 'cli/main.ts' 'doctor' '--base' $b
      if ($LASTEXITCODE -ne 0) { Write-Warning "doctor reported missing tools for $b (see above)." }
    } finally {
      Pop-Location
    }
  }
}

if ($Steps.Count -eq 0 -and $EnvVars.Count -eq 0) {
  Write-Host 'Nothing to install.'
  Show-Manual
  if (-not $DryRun) { Invoke-Doctor }
  exit 0
}

if ($DryRun) {
  Show-Manual
  Write-Host ''
  Write-Host 'Dry run: nothing was changed.'
  exit 0
}

if (-not (Confirm-Step 'Proceed with the steps above?')) {
  Write-Host 'Nothing was changed.'
  exit 0
}

# --- Execute -----------------------------------------------------------------

foreach ($s in $Steps) {
  Write-Host ''
  Write-Host "==> $($s.Description)"
  if ($s.Kind -eq 'winget') {
    Invoke-Winget $s.Target ($s.Arguments | Select-Object -First 1)
  } else {
    Invoke-Native $s.Target $s.Arguments
  }
}

if ($EnvVars.Count -gt 0) {
  Write-Host ''
  Write-Host 'These user environment variables are needed for Android builds:'
  foreach ($e in $EnvVars) {
    $was = if ($e.Current) { " (currently $($e.Current))" } else { '' }
    Write-Host ("  {0} = {1}{2}" -f $e.Name, $e.Value, $was)
  }
  if (Confirm-Step 'Set them for your Windows user account?') {
    foreach ($e in $EnvVars) {
      [System.Environment]::SetEnvironmentVariable($e.Name, $e.Value, 'User')
      Set-Item -Path "Env:\$($e.Name)" -Value $e.Value
    }
    Write-Host 'Set. Restart open terminals and editors so they see the new values.'
  } else {
    Write-Host 'Not changed. Set them yourself with the commands shown above.'
  }
}

Show-Manual
Invoke-Doctor
