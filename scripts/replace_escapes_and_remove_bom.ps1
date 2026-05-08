param([string]$dir = "contracts")
Get-ChildItem -Path $dir -Filter "*.sol" | ForEach-Object {
    $path = $_.FullName
    $raw = [System.IO.File]::ReadAllBytes($path)
    # remove UTF8 BOM if present
    if ($raw.Length -ge 3 -and $raw[0] -eq 0xEF -and $raw[1] -eq 0xBB -and $raw[2] -eq 0xBF) {
        $raw = $raw[3..($raw.Length-1)]
    }
    $s = [System.Text.Encoding]::UTF8.GetString($raw)
    # Replace literal escape sequences like \n with actual newlines
    $s = $s -replace "\\r\\n", "`r`n"
    $s = $s -replace "\\n", "`r`n"
    $s = $s -replace "\\t", "\t"
    # Replace HTML entities left over
    $s = $s -replace '&nbsp;', ' '
    $s = $s -replace '&lt;', '<'
    $s = $s -replace '&gt;', '>'
    $s = $s -replace '&amp;', '&'
    # Trim leading/trailing whitespace
    $s = $s.TrimStart()
    [System.IO.File]::WriteAllText($path, $s, [System.Text.Encoding]::UTF8)
    Write-Output "Processed $path"
}
