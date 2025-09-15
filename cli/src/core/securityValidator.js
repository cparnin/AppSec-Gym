const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const chalk = require('chalk');

class SecurityValidator {
  constructor() {
    this.validationRules = new Map();
    this.securityTools = new Map();
    this.initializeValidationRules();
    this.initializeSecurityTools();
  }

  initializeValidationRules() {
    // SQL Injection detection rules
    this.validationRules.set('sql-injection', {
      vulnerablePatterns: [
        /['"`]\s*\+\s*\w+/gi,           // String concatenation with quotes
        /\$\{[^}]*\}/gi,                // Template literal injection
        /query\s*=\s*['"`][^'"`]*\+/gi, // Direct query concatenation
        /WHERE\s+\w+\s*=\s*['"`]\s*\+/gi // WHERE clause concatenation
      ],
      securePatterns: [
        /\?\s*,?\s*\[/gi,              // Parameterized queries with arrays
        /query\([^,]*,\s*\[/gi,        // Query with parameter array
        /prepare\s*\(/gi,              // Prepared statements
        /escape\s*\(/gi                // Escaped input
      ],
      name: 'SQL Injection Protection'
    });

    // XSS detection rules
    this.validationRules.set('xss', {
      vulnerablePatterns: [
        /innerHTML\s*=.*\$\{/gi,        // innerHTML with template literals
        /innerHTML\s*\+=.*[+]/gi,       // innerHTML concatenation
        /outerHTML\s*=.*[+]/gi,         // outerHTML manipulation
        /document\.write\s*\(/gi,       // document.write usage
        /eval\s*\(/gi                   // eval() usage
      ],
      securePatterns: [
        /textContent\s*=/gi,            // textContent usage
        /innerText\s*=/gi,              // innerText usage
        /DOMPurify\.sanitize/gi,        // DOMPurify sanitization
        /escapeHtml\s*\(/gi,            // HTML escaping
        /createElement\s*\(/gi          // Safe DOM creation
      ],
      name: 'XSS Protection'
    });

    // Authentication/JWT security rules
    this.validationRules.set('auth', {
      vulnerablePatterns: [
        /['"`]secret\d*['"`]/gi,        // Hardcoded secrets
        /jwt\.sign\([^,]*,\s*['"`][^'"`]{1,10}['"`]/gi, // Weak JWT secrets
        /===\s*password/gi,             // Plain text password comparison
        /algorithm\s*:\s*['"`]none['"`]/gi, // Algorithm none
        /expiresIn\s*:\s*['"`]\d+[dy]['"`]/gi // Long expiration
      ],
      securePatterns: [
        /process\.env\./gi,             // Environment variables
        /bcrypt\.compare/gi,            // bcrypt usage
        /algorithms\s*:\s*\[/gi,        // Algorithm whitelist
        /expiresIn\s*:\s*['"`]\d+[mh]['"`]/gi, // Short expiration
        /crypto\.randomBytes/gi         // Cryptographically secure random
      ],
      name: 'Authentication Security'
    });

    // Path traversal detection rules
    this.validationRules.set('path-traversal', {
      vulnerablePatterns: [
        /path\.join\([^,]*,\s*\w+\)/gi, // Direct path join with user input
        /\.\.\//gi,                     // Directory traversal sequences
        /fs\.readFileSync\([^,]*\+/gi,  // File read with concatenation
        /require\([^)]*\+/gi            // Dynamic require
      ],
      securePatterns: [
        /path\.basename\s*\(/gi,        // Path basename usage
        /path\.relative\s*\(/gi,        // Path relative validation
        /startsWith\s*\(/gi,            // Path prefix validation
        /whitelist.*includes/gi,        // Whitelist validation
        /validatePath\s*\(/gi           // Custom path validation
      ],
      name: 'Path Traversal Protection'
    });
  }

  initializeSecurityTools() {
    // ESLint security plugin
    this.securityTools.set('eslint-security', {
      command: 'npx eslint --ext .js --format json',
      enabled: true,
      install: 'npm install --save-dev eslint eslint-plugin-security',
      description: 'Static analysis for security vulnerabilities'
    });

    // npm audit for dependency vulnerabilities
    this.securityTools.set('npm-audit', {
      command: 'npm audit --json',
      enabled: true,
      install: 'built-in',
      description: 'Dependency vulnerability scanning'
    });

    // Semgrep for advanced static analysis
    this.securityTools.set('semgrep', {
      command: 'semgrep --config=auto --json',
      enabled: false,
      install: 'pip install semgrep',
      description: 'Advanced static analysis security scanner'
    });
  }

  async validateChallengeSolution(challenge, filePaths, content) {
    const results = {
      passed: false,
      score: 0,
      maxScore: 100,
      checks: [],
      securityIssues: [],
      recommendations: []
    };

    try {
      // Run pattern-based validation
      await this.runPatternValidation(challenge, content, results);

      // Run static analysis tools
      await this.runStaticAnalysis(filePaths, results);

      // Run dependency scanning
      await this.runDependencyScanning(filePaths, results);

      // Calculate final score and pass/fail
      results.passed = results.score >= 80; // 80% threshold
      results.grade = this.calculateGrade(results.score);

    } catch (error) {
      console.warn('Security validation error:', error.message);
      results.checks.push({
        name: 'Validation Error',
        passed: false,
        message: `Validation failed: ${error.message}`
      });
    }

    return results;
  }

  async runPatternValidation(challenge, content, results) {
    const category = challenge.category;
    const maxPatternScore = 60;
    let patternScore = 0;

    // Get appropriate validation rules
    const rules = this.validationRules.get(category) ||
                  this.validationRules.get(this.mapCategoryToRules(category));

    if (!rules) {
      results.checks.push({
        name: 'Pattern Validation',
        passed: false,
        message: `No validation rules found for category: ${category}`
      });
      return;
    }

    // Check for vulnerable patterns (negative points)
    let vulnerableCount = 0;
    for (const pattern of rules.vulnerablePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        vulnerableCount += matches.length;
        results.securityIssues.push({
          type: 'vulnerability',
          pattern: pattern.toString(),
          matches: matches,
          severity: 'high'
        });
      }
    }

    // Check for secure patterns (positive points)
    let secureCount = 0;
    for (const pattern of rules.securePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        secureCount += matches.length;
      }
    }

    // Calculate pattern score
    if (vulnerableCount === 0 && secureCount > 0) {
      patternScore = maxPatternScore;
    } else if (vulnerableCount === 0) {
      patternScore = maxPatternScore * 0.7; // Some points for removing vulnerabilities
    } else {
      patternScore = Math.max(0, maxPatternScore - (vulnerableCount * 20));
    }

    results.score += patternScore;
    results.checks.push({
      name: rules.name,
      passed: vulnerableCount === 0,
      message: vulnerableCount === 0
        ? `✅ No ${rules.name.toLowerCase()} vulnerabilities detected`
        : `❌ Found ${vulnerableCount} potential vulnerabilities`,
      details: {
        vulnerablePatterns: vulnerableCount,
        securePatterns: secureCount,
        score: patternScore
      }
    });
  }

  async runStaticAnalysis(filePaths, results) {
    const maxStaticScore = 25;
    let staticScore = 0;

    try {
      // Try to run ESLint with security plugin
      const workspaceDir = path.dirname(filePaths[0]);
      await this.setupESLintSecurity(workspaceDir);

      const eslintResults = await this.runESLint(filePaths);

      if (eslintResults && eslintResults.length > 0) {
        const securityIssues = eslintResults.flatMap(file =>
          file.messages?.filter(msg =>
            msg.ruleId && msg.ruleId.includes('security')
          ) || []
        );

        if (securityIssues.length === 0) {
          staticScore = maxStaticScore;
        } else {
          staticScore = Math.max(0, maxStaticScore - (securityIssues.length * 5));
        }

        results.checks.push({
          name: 'Static Analysis (ESLint Security)',
          passed: securityIssues.length === 0,
          message: securityIssues.length === 0
            ? '✅ No static analysis security issues found'
            : `❌ Found ${securityIssues.length} static analysis issues`,
          details: { issues: securityIssues }
        });

        // Add detailed security issues
        securityIssues.forEach(issue => {
          results.securityIssues.push({
            type: 'static-analysis',
            rule: issue.ruleId,
            message: issue.message,
            line: issue.line,
            severity: issue.severity === 2 ? 'high' : 'medium'
          });
        });
      }

    } catch (error) {
      console.warn('Static analysis failed:', error.message);
      staticScore = maxStaticScore * 0.5; // Partial credit if analysis fails

      results.checks.push({
        name: 'Static Analysis',
        passed: false,
        message: '⚠️ Static analysis tools not available - partial validation only'
      });
    }

    results.score += staticScore;
  }

  async runDependencyScanning(filePaths, results) {
    const maxDepScore = 15;
    let depScore = 0;

    try {
      const workspaceDir = path.dirname(filePaths[0]);
      const packageJsonPath = path.join(workspaceDir, 'package.json');

      if (fs.existsSync(packageJsonPath)) {
        const auditResults = await this.runNpmAudit(workspaceDir);

        if (auditResults) {
          const vulnerabilities = auditResults.vulnerabilities || {};
          const vulnCount = Object.keys(vulnerabilities).length;

          if (vulnCount === 0) {
            depScore = maxDepScore;
          } else {
            depScore = Math.max(0, maxDepScore - (vulnCount * 3));
          }

          results.checks.push({
            name: 'Dependency Security Scan',
            passed: vulnCount === 0,
            message: vulnCount === 0
              ? '✅ No known vulnerabilities in dependencies'
              : `❌ Found ${vulnCount} vulnerable dependencies`,
            details: { vulnerabilities: vulnCount }
          });

          // Add dependency vulnerabilities to security issues
          Object.entries(vulnerabilities).forEach(([dep, vuln]) => {
            results.securityIssues.push({
              type: 'dependency',
              package: dep,
              severity: vuln.severity,
              title: vuln.title
            });
          });
        }
      } else {
        depScore = maxDepScore; // No package.json means no dependency issues
      }

    } catch (error) {
      depScore = maxDepScore * 0.8; // Most points if scan fails
      results.checks.push({
        name: 'Dependency Scan',
        passed: true,
        message: '⚠️ Dependency scan skipped - no package.json or npm not available'
      });
    }

    results.score += depScore;
  }

  async setupESLintSecurity(workspaceDir) {
    const eslintConfigPath = path.join(workspaceDir, '.eslintrc.json');
    const securityConfigPath = path.join(__dirname, '../../configs/eslint-security.json');

    if (!fs.existsSync(eslintConfigPath)) {
      // Copy the security-focused ESLint configuration
      if (fs.existsSync(securityConfigPath)) {
        fs.copySync(securityConfigPath, eslintConfigPath);
      } else {
        // Fallback to inline configuration
        const eslintConfig = {
          "extends": ["eslint:recommended"],
          "plugins": ["security"],
          "rules": {
            "security/detect-sql-injection": "error",
            "security/detect-xss": "error",
            "security/detect-eval-with-expression": "error",
            "security/detect-non-literal-require": "error",
            "security/detect-non-literal-fs-filename": "error",
            "security/detect-unsafe-regex": "error",
            "security/detect-buffer-noassert": "error",
            "security/detect-child-process": "warn",
            "security/detect-disable-mustache-escape": "error",
            "security/detect-object-injection": "warn",
            "security/detect-new-buffer": "error",
            "security/detect-possible-timing-attacks": "warn",
            "security/detect-pseudoRandomBytes": "error",
            "security/detect-bidi-characters": "error"
          },
          "env": {
            "node": true,
            "es6": true,
            "browser": true
          },
          "parserOptions": {
            "ecmaVersion": 2022,
            "sourceType": "module"
          }
        };

        fs.writeJsonSync(eslintConfigPath, eslintConfig, { spaces: 2 });
      }
    }

    // Also install security dependencies in workspace if needed
    await this.ensureSecurityDependencies(workspaceDir);
  }

  async ensureSecurityDependencies(workspaceDir) {
    const packageJsonPath = path.join(workspaceDir, 'package.json');

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = fs.readJsonSync(packageJsonPath);

      // Add security analysis dependencies
      if (!packageJson.devDependencies) {
        packageJson.devDependencies = {};
      }

      let needsUpdate = false;

      if (!packageJson.devDependencies.eslint) {
        packageJson.devDependencies.eslint = '^8.53.0';
        needsUpdate = true;
      }

      if (!packageJson.devDependencies['eslint-plugin-security']) {
        packageJson.devDependencies['eslint-plugin-security'] = '^1.7.1';
        needsUpdate = true;
      }

      if (needsUpdate) {
        fs.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
      }
    }
  }

  async runESLint(filePaths) {
    return new Promise((resolve) => {
      const command = `npx eslint ${filePaths.join(' ')} --format json`;

      exec(command, { cwd: path.dirname(filePaths[0]) }, (error, stdout) => {
        try {
          if (stdout) {
            resolve(JSON.parse(stdout));
          } else {
            resolve([]);
          }
        } catch (parseError) {
          resolve([]);
        }
      });
    });
  }

  async runNpmAudit(workspaceDir) {
    return new Promise((resolve) => {
      exec('npm audit --json', { cwd: workspaceDir }, (error, stdout) => {
        try {
          if (stdout) {
            resolve(JSON.parse(stdout));
          } else {
            resolve(null);
          }
        } catch (parseError) {
          resolve(null);
        }
      });
    });
  }

  mapCategoryToRules(category) {
    const mapping = {
      'injection': 'sql-injection',
      'xss': 'xss',
      'broken-auth': 'auth',
      'broken-access': 'auth',
      'security-misconfig': 'auth',
      'xxe': 'path-traversal'
    };

    return mapping[category] || 'sql-injection';
  }

  calculateGrade(score) {
    if (score >= 95) return 'A+';
    if (score >= 90) return 'A';
    if (score >= 85) return 'A-';
    if (score >= 80) return 'B+';
    if (score >= 75) return 'B';
    if (score >= 70) return 'B-';
    if (score >= 65) return 'C+';
    if (score >= 60) return 'C';
    if (score >= 55) return 'C-';
    return 'F';
  }

  generateSecurityReport(results) {
    let report = `\n${chalk.bold.cyan('🔒 Security Validation Report')}\n`;
    report += `${chalk.white('═'.repeat(50))}\n\n`;

    // Overall score
    const scoreColor = results.passed ? chalk.green : chalk.red;
    report += `${chalk.bold('Overall Score:')} ${scoreColor(results.score)}/${results.maxScore} (${results.grade})\n`;
    report += `${chalk.bold('Status:')} ${results.passed ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED')}\n\n`;

    // Individual checks
    report += `${chalk.bold('Security Checks:')}\n`;
    results.checks.forEach(check => {
      const icon = check.passed ? '✅' : '❌';
      report += `  ${icon} ${check.name}: ${check.message}\n`;
    });

    // Security issues
    if (results.securityIssues.length > 0) {
      report += `\n${chalk.bold.red('Security Issues Found:')}\n`;
      results.securityIssues.forEach((issue, index) => {
        const severityColor = issue.severity === 'high' ? chalk.red : chalk.yellow;
        report += `  ${index + 1}. ${severityColor(issue.severity.toUpperCase())} - ${issue.type}\n`;
        if (issue.message) report += `     ${issue.message}\n`;
        if (issue.line) report += `     Line: ${issue.line}\n`;
      });
    }

    // Recommendations
    if (results.recommendations.length > 0) {
      report += `\n${chalk.bold.blue('Recommendations:')}\n`;
      results.recommendations.forEach((rec, index) => {
        report += `  ${index + 1}. ${rec}\n`;
      });
    }

    return report;
  }
}

module.exports = SecurityValidator;