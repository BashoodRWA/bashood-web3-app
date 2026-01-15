#!/bin/bash
# Comprehensive Fuzzing Campaign Runner for Bashood Smart Contracts
# This script runs multiple fuzzing campaigns with different configurations

set -e

echo "🔥 BASHOOD COMPREHENSIVE FUZZING CAMPAIGNS 🔥"
echo "=============================================="
echo "🕐 Started: $(date)"
echo ""

# Create output directories
mkdir -p reports/fuzzing
mkdir -p forge-out

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to run a fuzzing campaign
run_campaign() {
    local campaign_name=$1
    local profile=$2
    local description=$3
    
    echo -e "${BLUE}🚀 Starting Campaign: $campaign_name${NC}"
    echo -e "${YELLOW}📋 Description: $description${NC}"
    echo "⏰ Started: $(date)"
    
    # Run the campaign
    FOUNDRY_PROFILE=$profile forge test --gas-report > reports/fuzzing/$campaign_name-results.txt 2>&1
    
    # Check results
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Campaign $campaign_name completed successfully${NC}"
    else
        echo -e "${RED}❌ Campaign $campaign_name failed${NC}"
    fi
    
    echo "⏰ Finished: $(date)"
    echo "----------------------------------------"
    echo ""
}

# Function to run fuzz tests specifically
run_fuzz_campaign() {
    local campaign_name=$1
    local profile=$2
    local description=$3
    local runs=$4
    
    echo -e "${BLUE}🔥 Starting Fuzz Campaign: $campaign_name${NC}"
    echo -e "${YELLOW}📋 Description: $description${NC}"
    echo -e "${YELLOW}🎯 Fuzz Runs: $runs${NC}"
    echo "⏰ Started: $(date)"
    
    # Run fuzz testing
    FOUNDRY_PROFILE=$profile forge test --match-test "testFuzz" --runs $runs -vvv > reports/fuzzing/$campaign_name-fuzz-results.txt 2>&1
    
    # Check results
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Fuzz Campaign $campaign_name completed successfully${NC}"
    else
        echo -e "${RED}❌ Fuzz Campaign $campaign_name failed${NC}"
    fi
    
    echo "⏰ Finished: $(date)"
    echo "----------------------------------------"
    echo ""
}

# Function to run invariant tests
run_invariant_campaign() {
    local campaign_name=$1
    local profile=$2
    local description=$3
    local runs=$4
    
    echo -e "${BLUE}🛡️ Starting Invariant Campaign: $campaign_name${NC}"
    echo -e "${YELLOW}📋 Description: $description${NC}"
    echo -e "${YELLOW}🎯 Invariant Runs: $runs${NC}"
    echo "⏰ Started: $(date)"
    
    # Run invariant testing
    FOUNDRY_PROFILE=$profile forge test --match-test "invariant" --runs $runs -vvv > reports/fuzzing/$campaign_name-invariant-results.txt 2>&1
    
    # Check results
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Invariant Campaign $campaign_name completed successfully${NC}"
    else
        echo -e "${RED}❌ Invariant Campaign $campaign_name failed${NC}"
    fi
    
    echo "⏰ Finished: $(date)"
    echo "----------------------------------------"
    echo ""
}

# ==================== CAMPAIGN EXECUTION ====================

echo "🏗️ Building contracts..."
forge build

echo ""
echo "📊 Starting fuzzing campaigns..."
echo ""

# Campaign 1: Token Security
run_campaign "token-security" "token-security" "Comprehensive token security testing with extended fuzzing"
run_fuzz_campaign "token-security-fuzz" "token-security" "Token-specific fuzz testing" 100000

# Campaign 2: Presale Security  
run_campaign "presale-security" "presale-security" "Presale contract security with reentrancy focus"
run_fuzz_campaign "presale-security-fuzz" "presale-security" "Presale-specific fuzz testing" 50000

# Campaign 3: Integration Testing
run_campaign "integration" "integration" "Multi-contract interaction testing"
run_fuzz_campaign "integration-fuzz" "integration" "Integration fuzz testing" 25000

# Campaign 4: Stress Testing
echo -e "${RED}⚠️ Warning: Stress testing campaign will take significant time${NC}"
read -p "Do you want to run stress testing? (y/N): " run_stress
if [[ $run_stress =~ ^[Yy]$ ]]; then
    run_campaign "stress" "stress" "Extreme load and stress testing"
    run_fuzz_campaign "stress-fuzz" "stress" "Stress fuzz testing" 200000
else
    echo "⏭️ Skipping stress testing campaign"
fi

# Campaign 5: Property Verification
run_campaign "property" "property" "Mathematical property verification"
run_invariant_campaign "property-invariant" "property" "Property invariant testing" 5000

# ==================== COVERAGE ANALYSIS ====================

echo "📊 Generating coverage reports..."
FOUNDRY_PROFILE=default forge coverage --report lcov > reports/fuzzing/coverage-report.txt
forge coverage --report summary > reports/fuzzing/coverage-summary.txt

# ==================== RESULTS SUMMARY ====================

echo ""
echo "📋 FUZZING CAMPAIGNS SUMMARY"
echo "============================"
echo "🕐 Completed: $(date)"
echo ""

# Count results
total_campaigns=0
successful_campaigns=0
failed_campaigns=0

for result_file in reports/fuzzing/*-results.txt; do
    if [ -f "$result_file" ]; then
        total_campaigns=$((total_campaigns + 1))
        campaign_name=$(basename "$result_file" -results.txt)
        
        if grep -q "test result: ok" "$result_file"; then
            echo -e "✅ $campaign_name: ${GREEN}PASSED${NC}"
            successful_campaigns=$((successful_campaigns + 1))
        else
            echo -e "❌ $campaign_name: ${RED}FAILED${NC}"
            failed_campaigns=$((failed_campaigns + 1))
        fi
    fi
done

echo ""
echo "📊 Final Statistics:"
echo "   Total Campaigns: $total_campaigns"
echo -e "   Successful: ${GREEN}$successful_campaigns${NC}"
echo -e "   Failed: ${RED}$failed_campaigns${NC}"

# Check if any critical failures
if [ $failed_campaigns -gt 0 ]; then
    echo ""
    echo -e "${RED}⚠️ Some campaigns failed. Review the results before deployment.${NC}"
    exit 1
else
    echo ""
    echo -e "${GREEN}🎉 All fuzzing campaigns completed successfully!${NC}"
fi

echo ""
echo "📁 Results saved in: reports/fuzzing/"
echo "🏁 Fuzzing campaigns completed!"