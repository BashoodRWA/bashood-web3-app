# Copies all .js test files to .cjs to force CommonJS execution when package.json sets "type": "module"
$testDir = Join-Path $PSScriptRoot "..\test"
if (-Not (Test-Path $testDir)) {
    Write-Host "No test directory found at $testDir"
    exit 1
}
Get-ChildItem -Path $testDir -Filter *.js -Recurse | ForEach-Object {
    $src = $_.FullName
    $dest = [System.IO.Path]::ChangeExtension($src, '.cjs')
    Copy-Item -Path $src -Destination $dest -Force
    Write-Host "Copied $src -> $dest"
}
Write-Host "Done copying test files to .cjs"
