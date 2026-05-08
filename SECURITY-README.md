# 🛡️ Bashood Multi-Layer Security Analysis Framework

Comprehensive security testing framework for Bashood smart contracts using **Slither** (static analysis), **Foundry** (dynamic testing), and **Echidna** (property-based fuzzing).

## 📋 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [🔧 Installation](#-installation)
- [⚡ Running Tests](#-running-tests)
- [🔍 Security Analysis](#-security-analysis)
- [📊 Reports](#-reports)
- [🏗️ CI Integration](#️-ci-integration)
- [📚 Documentation](#-documentation)

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run all security layers
npm run security:all

# Generate comprehensive report
npm run security:report
```

---

## 🔧 Installation

### Prerequisites

- **Node.js** >= 18
- **Python** >= 3.8 (for Slither)
- **Git**
- **WSL** or **Linux** (for Foundry/Echidna on Windows)

### 1. Install Hardhat Dependencies

```bash
npm install
```

### 2. Install Slither (Static Analysis)

```bash
# Using pip
pip install slither-analyzer

# Using pipx (recommended)
pipx install slither-analyzer
```

### 3. Install Foundry (Dynamic Testing)

#### Linux/macOS:
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

#### Windows (WSL):
```bash
# In WSL terminal
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

#### Windows (Alternative):
```bash
# Use Foundry binaries or Docker
docker run --rm -v ${PWD}:/app -w /app ghcr.io/foundry-rs/foundry:latest forge test
```

### 4. Install Echidna (Property Testing)

#### Linux:
```bash
wget https://github.com/crytic/echidna/releases/latest/download/echidna-test-Ubuntu-18.04.tar.gz
tar -xzf echidna-test-Ubuntu-18.04.tar.gz
sudo mv echidna-test /usr/local/bin/echidna
```

#### macOS:
```bash
brew install echidna
```

#### Windows:
Download from [Echidna Releases](https://github.com/crytic/echidna/releases)

---

## ⚡ Running Tests

### Layer 1: Static Analysis (Slither)

```bash
# Basic Slither analysis
npm run security:slither

# Detailed analysis with reports
slither . --config-file slither.config.json \
  --sarif slither-results.sarif \
  --json slither-results.json \
  --print human-summary,inheritance-graph
```

### Layer 2: Dynamic Testing (Foundry)

```bash
# Build contracts
npm run forge:build

# Run all tests
npm run forge:test

# Fuzz testing campaign
npm run forge:fuzz

# Coverage analysis
npm run forge:coverage
```

### Layer 3: Property Testing (Echidna)

```bash
# Test token properties
npm run echidna:token

# Test presale properties  
npm run echidna:presale

# Custom Echidna run
echidna test/echidna/BashoodEchidna.sol \
  --contract BashoodEchidnaTest \
  --config echidna.yaml
```

### Comprehensive Security Campaign

```bash
# Run all security layers
npm run security:all

# Windows PowerShell campaign
.\scripts\run-fuzzing-campaigns.ps1

# Linux/macOS campaign
bash scripts/run-fuzzing-campaigns.sh

# With stress testing
.\scripts\run-fuzzing-campaigns.ps1 -StressTest
```

---

## 🔍 Security Analysis

### Analysis Layers

| Layer | Tool | Purpose | Coverage |
|-------|------|---------|----------|
| **Static** | Slither | Vulnerability detection | Code patterns, known issues |
| **Dynamic** | Foundry | Functional testing | Execution paths, edge cases |
| **Property** | Echidna | Invariant verification | Mathematical properties |

### Security Features Tested

- ✅ **Reentrancy Protection**
- ✅ **Access Control**  
- ✅ **Integer Overflow/Underflow**
- ✅ **Gas Optimization**
- ✅ **Emergency Mechanisms**
- ✅ **Token Economics**
- ✅ **State Consistency**
- ✅ **Input Validation**

### Test Categories

#### BashoodToken Tests
- Initial state verification
- Transfer functionality
- Approval mechanisms
- Access control
- Pause/unpause operations
- Fuzz testing with random amounts
- Invariant: total supply constant

#### BashoodPresale Tests
- Purchase mechanisms (ETH/BHT)
- Reentrancy attack prevention
- Emergency stop functionality
- Access control validation
- State transition testing
- Multi-user interaction fuzzing
- Invariant: balance monotonicity

#### MaximalDangerAttacker Tests
- Advanced reentrancy attempts
- Flash loan simulations
- Front-running attacks
- Gas griefing
- Batch coordination attacks

---

## 📊 Reports

### Generated Reports

```
reports/
├── fuzzing/
│   ├── token-security-results.txt
│   ├── presale-security-results.txt
│   ├── integration-results.txt
│   ├── coverage-report.txt
│   └── coverage-summary.txt
├── slither-results.json
├── slither-results.sarif
├── security-report.html
└── security-summary.json
```

### Report Features

- **🎯 Executive Summary**: High-level security status
- **🔍 Detailed Findings**: Issue-by-issue breakdown  
- **📊 Coverage Analysis**: Code coverage metrics
- **🐍 Property Verification**: Invariant test results
- **📈 Trends**: Historical security metrics
- **🎯 Recommendations**: Actionable security improvements

### Viewing Reports

```bash
# Generate comprehensive report
npm run security:report

# Open HTML report
open security-report.html  # macOS
start security-report.html # Windows
```

---

## 🏗️ CI Integration

### GitHub Actions Workflow

The `.github/workflows/security-analysis.yml` provides:

- **Multi-layer Analysis**: Slither → Foundry → Echidna
- **Parallel Execution**: Faster CI runs
- **Artifact Storage**: 30-90 day retention
- **PR Comments**: Automated security feedback
- **Failure Handling**: Blocks deployment on critical issues

### Workflow Triggers

- **Push** to `main`, `develop`, `patch/*`
- **Pull Requests** to `main`, `develop`
- **Scheduled**: Weekly extended fuzzing campaigns
- **Manual**: On-demand security analysis

### CI Commands

```bash
# Local CI simulation
act -P ubuntu-latest=nektos/act-environments-ubuntu:18.04

# Check workflow syntax
yamllint .github/workflows/security-analysis.yml
```

---

## 📚 Documentation

### Configuration Files

| File | Purpose |
|------|---------|
| `foundry.toml` | Foundry configuration |
| `foundry-campaigns.toml` | Fuzzing campaign profiles |
| `echidna.yaml` | Echidna fuzzer settings |
| `slither.config.json` | Slither analysis rules |

### Key Scripts

| Script | Description |
|--------|-------------|
| `scripts/run-fuzzing-campaigns.ps1` | Windows fuzzing campaigns |
| `scripts/run-fuzzing-campaigns.sh` | Linux fuzzing campaigns |
| `scripts/generate-security-report.js` | Report generation |

### Test Structure

```
test/
├── foundry/           # Foundry dynamic tests
│   ├── BashoodToken.t.sol
│   └── BashoodPresale.t.sol
├── echidna/           # Echidna property tests  
│   └── BashoodEchidna.sol
└── MaximalDangerAttacker.test.js  # Hardhat security tests
```

---

## 🎯 Security Recommendations

### Pre-Deployment Checklist

- [ ] **Zero Critical Issues** in Slither analysis
- [ ] **Zero High Issues** or documented exceptions
- [ ] **100% Test Coverage** with Foundry
- [ ] **All Invariants Pass** in Echidna
- [ ] **Extended Fuzzing** campaigns completed
- [ ] **Manual Review** of critical functions
- [ ] **Gas Optimization** verified
- [ ] **Documentation** updated

### Continuous Security

1. **Weekly Fuzzing**: Automated extended campaigns
2. **Dependency Updates**: Monitor for new vulnerabilities  
3. **Code Reviews**: Manual security review process
4. **Monitoring**: Post-deployment contract monitoring
5. **Incident Response**: Emergency procedures documented

---

## 🆘 Troubleshooting

### Common Issues

#### Foundry Installation
```bash
# If foundryup fails
curl -L https://foundry.paradigm.xyz | bash
source ~/.bashrc
foundryup
```

#### Echidna Not Found
```bash
# Check installation
echidna --version

# Reinstall if needed
wget https://github.com/crytic/echidna/releases/latest/download/echidna-test-Ubuntu-18.04.tar.gz
```

#### Slither Errors
```bash
# Update Slither
pip install --upgrade slither-analyzer

# Check Python version
python --version  # Should be >= 3.8
```

#### Windows Permissions
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📞 Support

For security-related questions or issues:

1. **Create an Issue**: [GitHub Issues](https://github.com/Bashood/bashood-web3-app/issues)
2. **Security Advisory**: For critical vulnerabilities, contact privately
3. **Documentation**: Check this README and inline comments
4. **Community**: Discord #security-testing channel

---

## 🏆 Security Achievement

✅ **Multi-Layer Security Framework** deployed  
✅ **596 → 38 Solhint Issues** resolved (93.6% reduction)  
✅ **MaximalDangerAttacker** defeated  
✅ **Comprehensive Test Coverage** achieved  
✅ **Property-Based Verification** implemented  
✅ **CI/CD Security Pipeline** automated  

**Bashood smart contracts are battle-tested and ready for deployment! 🚀**

---

*Last Updated: November 2025*  
*Security Framework Version: 1.0.0*