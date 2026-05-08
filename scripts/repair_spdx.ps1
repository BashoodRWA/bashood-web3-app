param([string]$dir = "contracts")
Get-ChildItem -Path $dir -Filter "*.sol" | ForEach-Object {
    $p = $_.FullName
    $s = Get-Content $p -Raw
    $idx = $s.IndexOf('SPDX-License-Identifier')
    if ($idx -ge 0) {
        # find start of line
        $lineStart = $s.LastIndexOf("`n", $idx)
        if ($lineStart -lt 0) { $start = 0 } else { $start = $lineStart + 1 }
        $new = $s.Substring($start)
        Set-Content -Path $p -Value $new -Encoding UTF8
        Write-Output "Repaired $p"
    } else {
        Write-Output "No SPDX in $p"
    }
}
