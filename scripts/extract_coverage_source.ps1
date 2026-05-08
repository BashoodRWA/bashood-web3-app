param(
    [string]$inputHtml,
    [string]$outputSol
)

$content = Get-Content $inputHtml -Raw
$start = $content.IndexOf('<pre><table class="coverage">')
$end = $content.IndexOf('</table></pre>')
if ($start -lt 0 -or $end -lt 0) { Write-Output 'markers not found'; exit 1 }
$block = $content.Substring($start, $end-$start)
# remove the left column blocks that contain line numbers
$block2 = [regex]::Replace($block, '(?s)<tr>.*?<td class="line-count quiet">.*?</td>', '')
# strip remaining tags
$block2 = [regex]::Replace($block2, '<[^>]+>', '')
$lines = $block2 -split "`n" | ForEach-Object { $_.TrimEnd() } | Where-Object { $_ -ne '' }
Set-Content -Path $outputSol -Value ($lines -join "`n")
Write-Output "Wrote $outputSol with $($lines.Count) lines"
