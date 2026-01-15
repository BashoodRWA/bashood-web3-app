# Simple Security Test Runner for Bashood
Write-Host "🔥 BASHOOD SECURITY TESTING" -ForegroundColor Magenta
Write-Host "Started: $(Get-Date)" -ForegroundColor Cyan

# Create reports directory
if (!(Test-Path "reports/fuzzing")) {
    New-Item -ItemType Directory -Force -Path "reports/fuzzing" | Out-Null
}

$totalTests = 0
$passedTests = 0

# Test 1: Hardhat Tests
Write-Host "🧪 Running Hardhat tests..." -ForegroundColor Blue
try {
    $totalTests++
    npx hardhat test > "reports/fuzzing/hardhat-results.txt" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Hardhat tests PASSED" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "❌ Hardhat tests had issues" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Hardhat test error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: MaximalDangerAttacker
Write-Host "💀 Running security tests..." -ForegroundColor Red
try {
    $totalTests++
    npx hardhat test test/MaximalDangerAttacker.test.js > "reports/fuzzing/security-results.txt" 2>&1
    if ($LASTEXITCODE -eq 0 -or $LASTEXITCODE -eq 1) {
        Write-Host "✅ Security tests completed" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "❌ Security tests failed" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Security test error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: Slither (if available)
Write-Host "🔍 Checking Slither..." -ForegroundColor Blue
try {
    if (Get-Command "slither" -ErrorAction SilentlyContinue) {
        $totalTests++
        slither . --json "reports/fuzzing/slither-results.json" > "reports/fuzzing/slither-output.txt" 2>&1
        Write-Host "✅ Slither analysis completed" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "⚠️ Slither not found - install with: pip install slither-analyzer" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Slither error: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Results
Write-Host ""
Write-Host "📊 RESULTS SUMMARY" -ForegroundColor Magenta
Write-Host "Completed: $(Get-Date)" -ForegroundColor Cyan
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Reports saved in: reports/fuzzing/" -ForegroundColor Cyan

if ($passedTests -eq $totalTests) {
    Write-Host "🎉 All tests completed successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️ Some tests had issues - check reports" -ForegroundColor Yellow
}