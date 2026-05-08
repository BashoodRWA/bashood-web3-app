param(
    [string]$contractsDir = "contracts"
)

Get-ChildItem -Path $contractsDir -Filter "*.sol" | ForEach-Object {
    $path = $_.FullName
    $text = Get-Content $path -Raw
    # Find SPDX occurrence
    $idx = $text.IndexOf('SPDX-License-Identifier')
    if ($idx -ge 0) {
        # backtrack to start of the line
        $startLine = $text.LastIndexOf("\n", $idx)
        if ($startLine -lt 0) { $startLine = 0 } else { $startLine = $startLine + 1 }
        $clean = $text.Substring($startLine)
    } else {
        # If SPDX not found, attempt to find 'pragma solidity'
        $idx2 = $text.IndexOf('pragma solidity')
        if ($idx2 -ge 0) {
            $startLine = $text.LastIndexOf("\n", $idx2)
            if ($startLine -lt 0) { $startLine = 0 } else { $startLine = $startLine + 1 }
            $clean = $text.Substring($startLine)
        } else {
            $clean = $text
        }
    }
    # Replace common HTML entities
    $clean = $clean -replace '&nbsp;', ' '
    $clean = $clean -replace '&lt;', '<'
    $clean = $clean -replace '&gt;', '>'
    $clean = $clean -replace '&amp;', '&'
    # Remove stray backticks and artifacts
    $clean = $clean -replace '`{3}',''
    $clean = $clean -replace '```plaintext',''
    # Trim leading/trailing whitespace
    $clean = $clean.TrimStart("`r`n", ' ', "\t")
    Set-Content -Path $path -Value $clean -Encoding UTF8
    Write-Output "Sanitized: $path"
}
