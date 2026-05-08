# Bashood Fuzzing Campaigns - PowerShell Version
# Comprehensive security testing with Foundry and Echidna

param(
    [switch]$StressTest = $false,
    [switch]$SkipEchidna = $false,
    [string]$Profile = "default"
)

# Color functions
function Write-ColorOutput($ForegroundColor, $Message) {
    $fc = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $ForegroundColor
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $fc
}

function Write-Success($Message) { Write-ColorOutput Green "✅ $Message" }
function Write-Error($Message) { Write-ColorOutput Red "❌ $Message" }
function Write-Warning($Message) { Write-ColorOutput Yellow "⚠️ $Message" }
function Write-Info($Message) { Write-ColorOutput Blue "ℹ️ $Message" }

Write-ColorOutput Magenta @"
🔥 BASHOOD COMPREHENSIVE FUZZING CAMPAIGNS 🔥
==============================================
🕐 Started: $(Get-Date)

"@

# Create output directories
$null = New-Item -ItemType Directory -Force -Path "reports\fuzzing"
$null = New-Item -ItemType Directory -Force -Path "forge-out"

# Function to run a campaign
function Run-Campaign {
    param(
        [string]$CampaignName,
        [string]$Profile,
        [string]$Description,
        [string]$TestPattern = ""
    )
    
    Write-Info "🚀 Starting Campaign: $CampaignName"
    Write-Warning "📋 Description: $Description"
    Write-Output "⏰ Started: $(Get-Date)"
    
    try {
        $env:FOUNDRY_PROFILE = $Profile
        
        if ($TestPattern) {
            forge test --match-test $TestPattern --gas-report | Out-File "reports\fuzzing\$CampaignName-results.txt" -Encoding UTF8
        } else {
            forge test --gas-report | Out-File "reports\fuzzing\$CampaignName-results.txt" -Encoding UTF8
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Campaign $CampaignName completed successfully"
        } else {
            Write-Error "Campaign $CampaignName failed"
            return $false
        }
    }
    catch {
        Write-Error "Campaign $CampaignName failed with exception: $($_.Exception.Message)"
        return $false
    }
    finally {
        Write-Output "⏰ Finished: $(Get-Date)"
        Write-Output "----------------------------------------"
        Write-Output ""
    }
    
    return $true
}

# Function to run fuzz campaign
function Run-FuzzCampaign {
    param(
        [string]$CampaignName,
        [string]$Profile,
        [string]$Description,
        [int]$Runs
    )
    
    Write-Info "🔥 Starting Fuzz Campaign: $CampaignName"
    Write-Warning "📋 Description: $Description"
    Write-Warning "🎯 Fuzz Runs: $Runs"
    Write-Output "⏰ Started: $(Get-Date)"
    
    try {
        $env:FOUNDRY_PROFILE = $Profile
        forge test --match-test "testFuzz" --runs $Runs -vvv | Out-File "reports\fuzzing\$CampaignName-fuzz-results.txt" -Encoding UTF8
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Fuzz Campaign $CampaignName completed successfully"
        } else {
            Write-Error "Fuzz Campaign $CampaignName failed"
            return $false
        }
    }
    catch {
        Write-Error "Fuzz Campaign $CampaignName failed with exception: $($_.Exception.Message)"
        return $false
    }
    finally {
        Write-Output "⏰ Finished: $(Get-Date)"
        Write-Output "----------------------------------------"
        Write-Output ""
    }
    
    return $true
}

# Function to run Echidna
function Run-EchidnaCampaign {
    param(
        [string]$Contract,
        [string]$Description
    )
    
    if ($SkipEchidna) {
        Write-Warning "Skipping Echidna campaign for $Contract"
        return $true
    }
    
    Write-Info "🐍 Starting Echidna Campaign: $Contract"
    Write-Warning "📋 Description: $Description"
    Write-Output "⏰ Started: $(Get-Date)"
    
    try {
        if (Get-Command "echidna" -ErrorAction SilentlyContinue) {
            echidna "test\echidna\BashoodEchidna.sol" --contract $Contract --config echidna.yaml | Out-File "reports\fuzzing\echidna-$Contract-results.txt" -Encoding UTF8
            Write-Success "Echidna campaign for $Contract completed"
        } else {
            Write-Warning "Echidna not found. Skipping Echidna testing."
            Write-Warning "Install Echidna from: https://github.com/crytic/echidna"
            return $true
        }
    }
    catch {
        Write-Error "Echidna campaign failed: $($_.Exception.Message)"
        return $false
    }
    finally {
        Write-Output "⏰ Finished: $(Get-Date)"
        Write-Output "----------------------------------------"
        Write-Output ""
    }
    
    return $true
}

# ==================== CAMPAIGN EXECUTION ====================

Write-Output "🏗️ Building contracts..."
try {
    forge build
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Build failed!"
        exit 1
    }
    Write-Success "Build completed successfully"
} catch {
    Write-Error "Build failed with exception: $($_.Exception.Message)"
    exit 1
}

Write-Output ""
Write-Output "📊 Starting fuzzing campaigns..."
Write-Output ""

$successfulCampaigns = 0
$totalCampaigns = 0

# Campaign 1: Token Security
$totalCampaigns++
if (Run-Campaign "token-security" "token-security" "Comprehensive token security testing") {
    $successfulCampaigns++
}

$totalCampaigns++
if (Run-FuzzCampaign "token-security-fuzz" "token-security" "Token-specific fuzz testing" 10000) {
    $successfulCampaigns++
}

# Campaign 2: Presale Security
$totalCampaigns++
if (Run-Campaign "presale-security" "presale-security" "Presale contract security with reentrancy focus") {
    $successfulCampaigns++
}

$totalCampaigns++
if (Run-FuzzCampaign "presale-security-fuzz" "presale-security" "Presale-specific fuzz testing" 5000) {
    $successfulCampaigns++
}

# Campaign 3: Integration Testing
$totalCampaigns++
if (Run-Campaign "integration" "integration" "Multi-contract interaction testing") {
    $successfulCampaigns++
}

# Campaign 4: Stress Testing (Optional)
if ($StressTest) {
    Write-Warning "⚠️ Running stress testing campaign - this will take significant time"
    $totalCampaigns++
    if (Run-Campaign "stress" "stress" "Extreme load and stress testing") {
        $successfulCampaigns++
    }
    
    $totalCampaigns++
    if (Run-FuzzCampaign "stress-fuzz" "stress" "Stress fuzz testing" 50000) {
        $successfulCampaigns++
    }
} else {
    Write-Warning "⏭️ Skipping stress testing (use -StressTest flag to enable)"
}

# Campaign 5: Echidna Property Testing
$totalCampaigns++
if (Run-EchidnaCampaign "BashoodTokenEchidnaTest" "Token property verification") {
    $successfulCampaigns++
}

$totalCampaigns++
if (Run-EchidnaCampaign "BashoodEchidnaTest" "Presale property verification") {
    $successfulCampaigns++
}

# ==================== COVERAGE ANALYSIS ====================

Write-Output "📊 Generating coverage reports..."
try {
    $env:FOUNDRY_PROFILE = "default"
    forge coverage --report lcov | Out-File "reports\fuzzing\coverage-report.txt" -Encoding UTF8
    forge coverage --report summary | Out-File "reports\fuzzing\coverage-summary.txt" -Encoding UTF8
    Write-Success "Coverage reports generated"
} catch {
    Write-Error "Failed to generate coverage reports: $($_.Exception.Message)"
}

# ==================== RESULTS SUMMARY ====================

Write-Output ""
Write-ColorOutput Magenta @"
📋 FUZZING CAMPAIGNS SUMMARY
============================
🕐 Completed: $(Get-Date)

"@

$failedCampaigns = $totalCampaigns - $successfulCampaigns

Write-Output "📊 Final Statistics:"
Write-Output "   Total Campaigns: $totalCampaigns"
Write-Success "   Successful: $successfulCampaigns"

if ($failedCampaigns -gt 0) {
    Write-Error "   Failed: $failedCampaigns"
    Write-Output ""
    Write-Error "⚠️ Some campaigns failed. Review the results before deployment."
    
    # Show failed campaigns
    Write-Output ""
    Write-Output "Failed campaign logs:"
    Get-ChildItem "reports\fuzzing\*-results.txt" | ForEach-Object {
        $content = Get-Content $_.FullName -Raw
        if ($content -notmatch "test result: ok") {
            Write-Error "❌ $($_.BaseName)"
        }
    }
    
    exit 1
} else {
    Write-Output "   Failed: 0"
    Write-Output ""
    Write-Success "🎉 All fuzzing campaigns completed successfully!"
}

Write-Output ""
Write-Output "📁 Results saved in: reports\fuzzing\"
Write-Success "🏁 Fuzzing campaigns completed!"

# Generate final report
Write-Output ""
Write-Output "📊 Generating comprehensive security report..."
try {
    node scripts\generate-security-report.js
    Write-Success "Security report generated"
} catch {
    Write-Warning "Failed to generate security report: $($_.Exception.Message)"
}