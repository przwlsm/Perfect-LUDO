# Builds a sideloadable release APK on Windows using the local Android SDK.
#
#   npm run apk                          # build for every device (slower, first time)
#   npm run apk -- -Install              # build, then install on the USB-connected phone
#   npm run apk -- -Arch arm64-v8a -Install   # fast rebuild for your own 64-bit test phone only
#
# The default (`all`) covers every CPU a real phone might have, including
# 32-bit-only armeabi-v7a devices, which are common among older/budget
# Android phones. Skipping that arch is a real bug, not an optimisation: the
# resulting APK simply refuses to install on those devices (no compatible
# native library), which is why this defaults to the safe, complete set.
#
# Why the drive mapping: the native (C++) build writes object files whose
# names include the full project path, and Windows refuses paths over 260
# characters. Mapping the parent folder to a drive letter keeps every
# generated path short. No admin rights are needed for `subst`.
param(
  [switch]$Install,
  [string]$Drive = 'L:',
  [ValidateSet('all', 'arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64')]
  [string]$Arch = 'all'
)
$architectures = if ($Arch -eq 'all') { 'armeabi-v7a,arm64-v8a,x86,x86_64' } else { $Arch }
$ErrorActionPreference = 'Stop'

$project = Split-Path -Parent $PSScriptRoot
$parent = Split-Path -Parent $project
$name = Split-Path -Leaf $project

# Tooling: Android Studio's bundled JDK and the SDK it installed.
if (-not $env:JAVA_HOME) { $env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr' }
if (-not $env:ANDROID_HOME) { $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk" }
$env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
if (-not (Test-Path "$env:JAVA_HOME\bin\java.exe")) { throw "JDK not found at $env:JAVA_HOME. Install Android Studio or set JAVA_HOME." }
if (-not (Test-Path "$env:ANDROID_HOME\platform-tools")) { throw "Android SDK not found at $env:ANDROID_HOME. Set ANDROID_HOME." }

# Generate the native project once; re-run `npx expo prebuild --clean` after changing app.json.
if (-not (Test-Path "$project\android\gradlew.bat")) {
  Push-Location $project
  try { $env:CI = '1'; npx expo prebuild --platform android --no-install; if ($LASTEXITCODE) { throw 'prebuild failed' } }
  finally { Pop-Location }
}
Set-Content -Encoding ascii "$project\android\local.properties" ("sdk.dir=" + $env:ANDROID_HOME.Replace('\', '\\'))

# Faster, lighter build: more JVM memory, and only the CPU real phones use.
$props = "$project\android\gradle.properties"
$text = Get-Content $props -Raw
$text = $text -replace 'org\.gradle\.jvmargs=.*', 'org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1536m'
$text = $text -replace 'reactNativeArchitectures=.*', "reactNativeArchitectures=$architectures"
Set-Content -Encoding ascii $props $text

if (-not (Test-Path "$Drive\")) { subst $Drive $parent }
$short = "$Drive\$name"
if (-not (Test-Path "$short\android\gradlew.bat")) { throw "$Drive does not map to $parent; remove it with 'subst $Drive /D' and retry." }

Push-Location "$short\android"
try {
  .\gradlew.bat assembleRelease --console=plain
  if ($LASTEXITCODE) { throw 'Gradle build failed (see output above)' }
} finally { Pop-Location }

$apk = Get-ChildItem -Recurse "$project\android\app\build\outputs\apk\release" -Filter *.apk | Select-Object -First 1
Write-Host "`nAPK: $($apk.FullName) ($([math]::Round($apk.Length / 1MB, 1)) MB)"
if ($Install) {
  adb install -r $apk.FullName
}
