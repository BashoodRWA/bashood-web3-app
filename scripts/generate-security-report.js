#!/usr/bin/env node

/**
 * Security Report Generator
 * Combines results from Slither, Foundry, and Echidna into comprehensive security report
 */

const fs = require('fs');
const path = require('path');

class SecurityReportGenerator {
    constructor() {
        this.reportData = {
            timestamp: new Date().toISOString(),
            slither: null,
            foundry: null,
            echidna: null,
            summary: {
                totalIssues: 0,
                criticalIssues: 0,
                highIssues: 0,
                mediumIssues: 0,
                lowIssues: 0,
                testsPassed: 0,
                testsFailed: 0,
                propertiesVerified: 0,
                propertiesFailed: 0
            }
        };
    }

    /**
     * Parse Slither JSON results
     */
    parseSlitherResults() {
        const slitherPath = 'slither-results.json';
        
        if (fs.existsSync(slitherPath)) {
            try {
                const slitherData = JSON.parse(fs.readFileSync(slitherPath, 'utf8'));
                
                this.reportData.slither = {
                    version: slitherData.version,
                    detectors: slitherData.results.detectors || [],
                    printers: slitherData.results.printers || []
                };

                // Count issues by severity
                slitherData.results.detectors.forEach(detector => {
                    this.reportData.summary.totalIssues++;
                    
                    switch(detector.impact.toLowerCase()) {
                        case 'critical':
                            this.reportData.summary.criticalIssues++;
                            break;
                        case 'high':
                            this.reportData.summary.highIssues++;
                            break;
                        case 'medium':
                            this.reportData.summary.mediumIssues++;
                            break;
                        case 'low':
                            this.reportData.summary.lowIssues++;
                            break;
                    }
                });

                console.log(`✅ Parsed Slither results: ${this.reportData.summary.totalIssues} issues found`);
                
            } catch (error) {
                console.error('❌ Error parsing Slither results:', error.message);
            }
        } else {
            console.log('⚠️ Slither results file not found');
        }
    }

    /**
     * Parse Foundry test results
     */
    parseFoundryResults() {
        const foundryPath = 'foundry-test-results.txt';
        
        if (fs.existsSync(foundryPath)) {
            try {
                const foundryData = fs.readFileSync(foundryPath, 'utf8');
                
                // Parse test results with regex
                const passedMatch = foundryData.match(/(\d+) passing/);
                const failedMatch = foundryData.match(/(\d+) failing/);
                
                this.reportData.foundry = {
                    output: foundryData,
                    passed: passedMatch ? parseInt(passedMatch[1]) : 0,
                    failed: failedMatch ? parseInt(failedMatch[1]) : 0
                };

                this.reportData.summary.testsPassed = this.reportData.foundry.passed;
                this.reportData.summary.testsFailed = this.reportData.foundry.failed;

                console.log(`✅ Parsed Foundry results: ${this.reportData.foundry.passed} passed, ${this.reportData.foundry.failed} failed`);
                
            } catch (error) {
                console.error('❌ Error parsing Foundry results:', error.message);
            }
        } else {
            console.log('⚠️ Foundry results file not found');
        }
    }

    /**
     * Parse Echidna fuzzing results
     */
    parseEchidnaResults() {
        const echidnaPaths = [
            'echidna-reports/token-results.txt',
            'echidna-reports/presale-results.txt'
        ];
        
        this.reportData.echidna = {
            results: []
        };

        echidnaPaths.forEach(filePath => {
            if (fs.existsSync(filePath)) {
                try {
                    const echidnaData = fs.readFileSync(filePath, 'utf8');
                    
                    // Parse property results
                    const passedProps = (echidnaData.match(/PASSED/g) || []).length;
                    const failedProps = (echidnaData.match(/FAILED/g) || []).length;
                    
                    this.reportData.echidna.results.push({
                        file: path.basename(filePath),
                        output: echidnaData,
                        passed: passedProps,
                        failed: failedProps
                    });

                    this.reportData.summary.propertiesVerified += passedProps;
                    this.reportData.summary.propertiesFailed += failedProps;

                    console.log(`✅ Parsed ${filePath}: ${passedProps} passed, ${failedProps} failed`);
                    
                } catch (error) {
                    console.error(`❌ Error parsing ${filePath}:`, error.message);
                }
            }
        });
    }

    /**
     * Generate comprehensive HTML report
     */
    generateHTMLReport() {
        const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🛡️ Bashood Security Analysis Report</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; text-align: center; margin-bottom: 30px; }
        h2 { color: #34495e; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        h3 { color: #2980b9; margin-top: 25px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; }
        .metric h4 { margin: 0 0 10px 0; font-size: 14px; opacity: 0.9; }
        .metric .value { font-size: 32px; font-weight: bold; }
        .critical { background: linear-gradient(135deg, #ff416c 0%, #ff4757 100%); }
        .high { background: linear-gradient(135deg, #ff9ff3 0%, #f368e0 100%); }
        .medium { background: linear-gradient(135deg, #feca57 0%, #ff9ff3 100%); }
        .low { background: linear-gradient(135deg, #48dbfb 0%, #0abde3 100%); }
        .success { background: linear-gradient(135deg, #1dd1a1 0%, #55a3ff 100%); }
        .section { margin: 30px 0; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; }
        .issue { background: #ffeaa7; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #fdcb6e; }
        .issue.high { background: #fab1a0; border-left-color: #e84393; }
        .issue.critical { background: #ff7675; border-left-color: #d63031; color: white; }
        pre { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 12px; }
        .timestamp { text-align: center; color: #7f8c8d; margin-bottom: 30px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🛡️ Bashood Smart Contract Security Analysis Report</h1>
        <div class="timestamp">Generated on: ${new Date(this.reportData.timestamp).toLocaleString()}</div>
        
        <div class="summary">
            <div class="metric critical">
                <h4>Critical Issues</h4>
                <div class="value">${this.reportData.summary.criticalIssues}</div>
            </div>
            <div class="metric high">
                <h4>High Issues</h4>
                <div class="value">${this.reportData.summary.highIssues}</div>
            </div>
            <div class="metric medium">
                <h4>Medium Issues</h4>
                <div class="value">${this.reportData.summary.mediumIssues}</div>
            </div>
            <div class="metric low">
                <h4>Low Issues</h4>
                <div class="value">${this.reportData.summary.lowIssues}</div>
            </div>
            <div class="metric success">
                <h4>Tests Passed</h4>
                <div class="value">${this.reportData.summary.testsPassed}</div>
            </div>
            <div class="metric success">
                <h4>Properties Verified</h4>
                <div class="value">${this.reportData.summary.propertiesVerified}</div>
            </div>
        </div>

        ${this.generateSlitherSection()}
        ${this.generateFoundrySection()}
        ${this.generateEchidnaSection()}
        ${this.generateRecommendationsSection()}

        <div class="footer">
            <p>This report was automatically generated by the Bashood Security Analysis Pipeline</p>
            <p>🔍 Slither • ⚡ Foundry • 🐍 Echidna</p>
        </div>
    </div>
</body>
</html>
        `;

        fs.writeFileSync('security-report.html', html);
        console.log('📊 Generated HTML security report: security-report.html');
    }

    generateSlitherSection() {
        if (!this.reportData.slither) {
            return `
            <div class="section">
                <h2>🔍 Static Analysis (Slither)</h2>
                <p>⚠️ No Slither results available</p>
            </div>
            `;
        }

        const issues = this.reportData.slither.detectors.map(detector => `
            <div class="issue ${detector.impact.toLowerCase()}">
                <strong>${detector.check}</strong> (${detector.impact})<br>
                ${detector.description}
                <pre>${JSON.stringify(detector.elements, null, 2)}</pre>
            </div>
        `).join('');

        return `
        <div class="section">
            <h2>🔍 Static Analysis (Slither)</h2>
            <p><strong>Version:</strong> ${this.reportData.slither.version}</p>
            <p><strong>Total Issues:</strong> ${this.reportData.slither.detectors.length}</p>
            
            ${issues || '<p>✅ No issues detected!</p>'}
        </div>
        `;
    }

    generateFoundrySection() {
        if (!this.reportData.foundry) {
            return `
            <div class="section">
                <h2>⚡ Dynamic Testing (Foundry)</h2>
                <p>⚠️ No Foundry results available</p>
            </div>
            `;
        }

        return `
        <div class="section">
            <h2>⚡ Dynamic Testing (Foundry)</h2>
            <p><strong>Tests Passed:</strong> ${this.reportData.foundry.passed}</p>
            <p><strong>Tests Failed:</strong> ${this.reportData.foundry.failed}</p>
            
            <h3>Test Output:</h3>
            <pre>${this.reportData.foundry.output.substring(0, 2000)}${this.reportData.foundry.output.length > 2000 ? '...' : ''}</pre>
        </div>
        `;
    }

    generateEchidnaSection() {
        if (!this.reportData.echidna || this.reportData.echidna.results.length === 0) {
            return `
            <div class="section">
                <h2>🐍 Property Testing (Echidna)</h2>
                <p>⚠️ No Echidna results available</p>
            </div>
            `;
        }

        const results = this.reportData.echidna.results.map(result => `
            <h3>📄 ${result.file}</h3>
            <p><strong>Properties Passed:</strong> ${result.passed}</p>
            <p><strong>Properties Failed:</strong> ${result.failed}</p>
            <pre>${result.output.substring(0, 1000)}${result.output.length > 1000 ? '...' : ''}</pre>
        `).join('');

        return `
        <div class="section">
            <h2>🐍 Property Testing (Echidna)</h2>
            <p><strong>Total Properties Verified:</strong> ${this.reportData.summary.propertiesVerified}</p>
            <p><strong>Total Properties Failed:</strong> ${this.reportData.summary.propertiesFailed}</p>
            
            ${results}
        </div>
        `;
    }

    generateRecommendationsSection() {
        const recommendations = [];
        
        if (this.reportData.summary.criticalIssues > 0) {
            recommendations.push('🚨 <strong>IMMEDIATE ACTION REQUIRED:</strong> Address all critical issues before deployment');
        }
        
        if (this.reportData.summary.highIssues > 0) {
            recommendations.push('⚠️ Review and fix all high-severity issues');
        }
        
        if (this.reportData.summary.testsFailed > 0) {
            recommendations.push('🧪 Fix all failing tests before deployment');
        }
        
        if (this.reportData.summary.propertiesFailed > 0) {
            recommendations.push('🐍 Investigate and resolve property violations');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('✅ All security checks passed! Consider additional manual review.');
        }

        return `
        <div class="section">
            <h2>🎯 Security Recommendations</h2>
            <ul>
                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                <li>📋 Conduct manual security review of critical functions</li>
                <li>🔄 Run extended fuzzing campaigns before mainnet deployment</li>
                <li>🏛️ Consider formal verification for critical invariants</li>
                <li>📊 Monitor contract behavior post-deployment</li>
            </ul>
        </div>
        `;
    }

    /**
     * Generate main report
     */
    async generate() {
        console.log('🚀 Starting security report generation...');
        
        this.parseSlitherResults();
        this.parseFoundryResults();
        this.parseEchidnaResults();
        
        // Generate reports
        this.generateHTMLReport();
        
        // Generate JSON summary
        fs.writeFileSync('security-summary.json', JSON.stringify(this.reportData, null, 2));
        console.log('📊 Generated JSON summary: security-summary.json');
        
        console.log('✅ Security report generation completed!');
        console.log(`📊 Summary: ${this.reportData.summary.totalIssues} issues, ${this.reportData.summary.testsPassed} tests passed, ${this.reportData.summary.propertiesVerified} properties verified`);
        
        // Exit with error code if critical issues found
        if (this.reportData.summary.criticalIssues > 0 || this.reportData.summary.testsFailed > 0) {
            console.log('❌ Critical issues or test failures detected!');
            process.exit(1);
        }
    }
}

// Run the report generator
const generator = new SecurityReportGenerator();
generator.generate().catch(error => {
    console.error('❌ Error generating security report:', error);
    process.exit(1);
});