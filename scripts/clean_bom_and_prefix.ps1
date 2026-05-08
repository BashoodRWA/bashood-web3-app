param([string]$dir = "contracts")
Get-ChildItem -Path $dir -Filter "*.sol" | ForEach-Object {
    $path = $_.FullName
    $bytes = [System.IO.File]::ReadAllBytes($path)
    # Remove UTF-8 BOM if present
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
        $bytes = $bytes[3..($bytes.Length-1)]
    }
    $text = [System.Text.Encoding]::UTF8.GetString($bytes)
    $idx = $text.IndexOf('// SPDX')
    if ($idx -ge 0) {
        $text2 = $text.Substring($idx)
    } else {
        $text2 = $text
    }
    # Normalize CRLF to LF (hardhat accepts both but keep consistent)
    $text2 = $text2 -replace "\r\n","\n"
    [System.IO.File]::WriteAllText($path, $text2, [System.Text.Encoding]::UTF8)
    Write-Output "Cleaned $path"
}
