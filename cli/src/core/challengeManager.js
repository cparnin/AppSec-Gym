const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const chalk = require('chalk');
const SecurityValidator = require('./securityValidator');

class ChallengeManager {
  constructor(challengesPath, workspacePath) {
    this.challengesPath = challengesPath || path.join(__dirname, '../../../challenges');
    this.workspacePath = workspacePath || path.join(process.env.HOME, '.appsec-gym', 'workspace');
    this.currentChallenge = null;
    this.challenges = [];
    this.securityValidator = new SecurityValidator();
    this.loadChallenges();
    this.loadCurrentChallenge();
  }

  loadChallenges() {
    try {
      const challenges = [];

      // Recursively scan the challenges directory for YAML files
      const scanDirectory = (dir) => {
        if (!fs.existsSync(dir)) {
          return;
        }

        const items = fs.readdirSync(dir);

        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);

          if (stat.isDirectory()) {
            scanDirectory(itemPath);
          } else if (item.endsWith('.yaml') || item.endsWith('.yml')) {
            try {
              const content = fs.readFileSync(itemPath, 'utf8');
              const challenge = yaml.parse(content);

              // Validate challenge structure
              if (challenge.id && challenge.title && challenge.category) {
                challenges.push(challenge);
              }
            } catch (error) {
              console.warn(`Failed to load challenge from ${itemPath}:`, error.message);
            }
          }
        }
      };

      scanDirectory(this.challengesPath);
      this.challenges = challenges.sort((a, b) => {
        // Sort by difficulty, then by title
        const difficultyOrder = { beginner: 1, intermediate: 2, advanced: 3 };
        const aDiff = difficultyOrder[a.difficulty] || 2;
        const bDiff = difficultyOrder[b.difficulty] || 2;

        if (aDiff !== bDiff) {
          return aDiff - bDiff;
        }

        return a.title.localeCompare(b.title);
      });

      // Silently load challenges
    } catch (error) {
      console.warn('Failed to load challenges:', error.message);
      this.challenges = this.getFallbackChallenges();
    }
  }

  loadCurrentChallenge() {
    const statePath = path.join(this.workspacePath, '.current.json');
    if (fs.existsSync(statePath)) {
      try {
        const state = fs.readJsonSync(statePath);
        this.currentChallenge = state.currentChallenge;
      } catch (error) {
        // Invalid state file, ignore
      }
    }
  }

  saveCurrentChallenge() {
    const statePath = path.join(this.workspacePath, '.current.json');
    fs.ensureDirSync(path.dirname(statePath));
    fs.writeJsonSync(statePath, {
      currentChallenge: this.currentChallenge,
      lastUpdated: new Date().toISOString()
    }, { spaces: 2 });
  }

  getCurrentChallenge() {
    return this.currentChallenge;
  }

  getAllChallenges() {
    return this.challenges;
  }

  getFallbackChallenges() {
    // Fallback challenges when YAML loading fails
    return [
      {
        id: 'sql-injection-basic',
        title: 'Basic SQL Injection',
        category: 'injection',
        difficulty: 'beginner',
        description: 'Fix a login function vulnerable to SQL injection'
      },
      {
        id: 'stored-xss-comments',
        title: 'Stored XSS in Comments',
        category: 'xss',
        difficulty: 'beginner',
        description: 'Sanitize user comments to prevent XSS attacks'
      },
      {
        id: 'jwt-vulnerabilities',
        title: 'JWT Authentication Vulnerabilities',
        category: 'broken-auth',
        difficulty: 'intermediate',
        description: 'Fix multiple critical vulnerabilities in JWT-based authentication'
      },
      {
        id: 'path-traversal-file-server',
        title: 'Path Traversal in File Server',
        category: 'injection',
        difficulty: 'intermediate',
        description: 'Secure a file server vulnerable to directory traversal attacks'
      }
    ];
  }

  async startChallenge(challengeId) {
    const challenge = this.getAllChallenges().find(c => c.id === challengeId);
    if (!challenge) {
      throw new Error(`Challenge ${challengeId} not found`);
    }

    // Create workspace directory
    const challengeWorkspace = path.join(this.workspacePath, 'current');
    fs.ensureDirSync(challengeWorkspace);

    // Create vulnerable files from challenge definition
    const filePaths = this.createChallengeFiles(challenge, challengeWorkspace);
    const mainFilePath = filePaths[0] || path.join(challengeWorkspace, 'vulnerable.js');

    // Update current challenge
    this.currentChallenge = {
      ...challenge,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      workspacePath: challengeWorkspace,
      filePath: mainFilePath,
      filePaths: filePaths
    };
    this.saveCurrentChallenge();

    return {
      challenge: this.currentChallenge,
      instructions: this.getInstructions(challengeId),
      filePath: mainFilePath,
      workspacePath: challengeWorkspace
    };
  }

  createChallengeFiles(challenge, workspaceDir) {
    const filePaths = [];

    try {
      if (challenge.vulnerable_code && challenge.vulnerable_code.files) {
        // Create files from YAML definition
        for (const file of challenge.vulnerable_code.files) {
          const filePath = path.join(workspaceDir, file.name);

          // Ensure directory exists
          fs.ensureDirSync(path.dirname(filePath));

          // Write file content
          fs.writeFileSync(filePath, file.content);
          filePaths.push(filePath);
        }
      } else {
        // Fallback to hardcoded vulnerable code
        const vulnerableCode = this.getSampleVulnerableCode(challenge.id);
        const filePath = path.join(workspaceDir, 'vulnerable.js');
        fs.writeFileSync(filePath, vulnerableCode);
        filePaths.push(filePath);
      }

      // Create package.json if it's a Node.js project
      if (challenge.vulnerable_code?.framework === 'express' ||
          challenge.vulnerable_code?.language === 'javascript') {
        this.createPackageJson(workspaceDir, challenge);
      }

    } catch (error) {
      console.warn('Error creating challenge files:', error.message);
      // Fallback to simple vulnerable file
      const vulnerableCode = this.getSampleVulnerableCode(challenge.id);
      const filePath = path.join(workspaceDir, 'vulnerable.js');
      fs.writeFileSync(filePath, vulnerableCode);
      filePaths.push(filePath);
    }

    return filePaths;
  }

  createPackageJson(workspaceDir, challenge) {
    const packageJsonPath = path.join(workspaceDir, 'package.json');

    if (!fs.existsSync(packageJsonPath)) {
      const dependencies = {};

      // Add common dependencies based on challenge content
      if (challenge.vulnerable_code?.framework === 'express') {
        dependencies.express = '^4.18.2';
      }

      const packageJson = {
        name: `appsec-gym-${challenge.id}`,
        version: '1.0.0',
        description: challenge.title,
        main: 'server.js',
        scripts: {
          start: 'node server.js',
          dev: 'nodemon server.js'
        },
        dependencies
      };

      // Add specific dependencies based on challenge requirements
      const content = JSON.stringify(challenge.vulnerable_code?.files || [], null, 2);
      if (content.includes('mysql')) {
        packageJson.dependencies.mysql2 = '^3.6.0';
      }
      if (content.includes('jwt')) {
        packageJson.dependencies.jsonwebtoken = '^9.0.2';
      }
      if (content.includes('bcrypt')) {
        packageJson.dependencies.bcrypt = '^5.1.0';
      }

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }
  }

  getSampleVulnerableCode(challengeId) {
    const samples = {
      'sql-injection-basic': `// TODO: Fix the SQL injection vulnerability in this login function
const mysql = require('mysql');

function login(username, password) {
  // BUG: User input is directly concatenated into SQL query
  const query = "SELECT * FROM users WHERE username = '" + username +
                "' AND password = '" + password + "'";

  return db.query(query);
}

module.exports = { login };`,

      'stored-xss-comments': `// TODO: Fix the XSS vulnerability in this comment handler
function displayComment(comment) {
  // BUG: User input is rendered without sanitization
  document.getElementById('comments').innerHTML +=
    '<div class="comment">' + comment.text + '</div>';
}

module.exports = { displayComment };`,

      'jwt-vulnerabilities': `// TODO: Fix the weak JWT secret vulnerability
const jwt = require('jsonwebtoken');

// BUG: Hardcoded weak secret
const SECRET = 'secret123';

function createToken(userId) {
  return jwt.sign({ userId }, SECRET, { expiresIn: '1h' });
}

function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { createToken, verifyToken };`
    };

    return samples[challengeId] || samples['sql-injection-basic'];
  }

  getInstructions(challengeId) {
    const challenge = this.getAllChallenges().find(c => c.id === challengeId);

    if (!challenge) {
      return chalk.red('Challenge not found');
    }

    let instructions = `${chalk.bold(challenge.title)}\n\n`;

    // Add description
    if (challenge.description) {
      instructions += `${chalk.gray(challenge.description)}\n\n`;
    }

    // Add learning objectives
    if (challenge.learning_objectives) {
      instructions += `${chalk.cyan('Learning Objectives:')}\n`;
      challenge.learning_objectives.forEach(obj => {
        instructions += `  • ${obj}\n`;
      });
      instructions += '\n';
    }

    // Add problem description from YAML or generate generic one
    if (challenge.problem_description) {
      instructions += `${chalk.yellow('The Problem:')}\n${challenge.problem_description}\n\n`;
    } else {
      instructions += `${chalk.yellow('The Problem:')}\nThis code contains security vulnerabilities that need to be fixed.\n\n`;
    }

    // Add task description
    if (challenge.task_description) {
      instructions += `${chalk.green('Your Task:')}\n${challenge.task_description}\n\n`;
    } else {
      instructions += `${chalk.green('Your Task:')}\nIdentify and fix the security vulnerabilities in the provided code.\n\n`;
    }

    // List files to edit
    if (challenge.vulnerable_code?.files) {
      instructions += `${chalk.blue('Files to edit:')}\n`;
      challenge.vulnerable_code.files.forEach(file => {
        instructions += `  • ${file.name}\n`;
      });
      instructions += '\n';
    }

    // Add attack vectors as examples
    if (challenge.attack_vectors && challenge.attack_vectors.length > 0) {
      instructions += `${chalk.red('Example Attack Vectors:')}\n`;
      challenge.attack_vectors.slice(0, 3).forEach(attack => {
        instructions += `  • ${attack.description}\n`;
        if (attack.payload) {
          instructions += `    Payload: ${chalk.gray(attack.payload)}\n`;
        }
      });
      instructions += '\n';
    }

    instructions += `${chalk.gray('Run "appsec-gym check" when you think you\'ve fixed it!')}`;

    return instructions;
  }

  async checkSolution() {
    if (!this.currentChallenge) {
      throw new Error('No active challenge');
    }

    const challenge = this.getAllChallenges().find(c => c.id === this.currentChallenge.id);
    if (!challenge) {
      throw new Error('Challenge definition not found');
    }

    // Check all files in the challenge
    const filePaths = this.currentChallenge.filePaths || [this.currentChallenge.filePath];
    let allContent = '';

    // Read all file contents for validation
    for (const filePath of filePaths) {
      if (fs.existsSync(filePath)) {
        allContent += fs.readFileSync(filePath, 'utf8') + '\n';
      }
    }

    try {
      // Use advanced security validation
      const validationResults = await this.securityValidator.validateChallengeSolution(
        challenge,
        filePaths,
        allContent
      );

      // Generate security report
      const securityReport = this.securityValidator.generateSecurityReport(validationResults);

      if (validationResults.passed) {
        this.currentChallenge.status = 'completed';
        this.currentChallenge.completedAt = new Date().toISOString();
        this.currentChallenge.score = validationResults.score;
        this.currentChallenge.grade = validationResults.grade;
        this.saveCurrentChallenge();

        return {
          passed: true,
          message: `🎉 Nice work! You've secured the code.\n\nGrade: ${validationResults.grade} (${validationResults.score}/100)\n${securityReport}`
        };
      } else {
        return {
          passed: false,
          message: `Security issues remain. Keep working on it!\n\nCurrent Score: ${validationResults.score}/100\n${securityReport}`
        };
      }

    } catch (error) {
      console.warn('Advanced validation failed, falling back to simple checks:', error.message);

      // Fallback to simple validation
      if (challenge.validation?.security_checks) {
        return this.runSecurityChecks(challenge, allContent);
      }

      return this.runLegacyChecks(this.currentChallenge.id, allContent);
    }
  }

  runSecurityChecks(challenge, content) {
    const results = [];
    let passed = true;
    let message = '';

    for (const check of challenge.validation.security_checks) {
      const regex = new RegExp(check.pattern, 'gim');
      const matches = content.match(regex);

      if (check.check.startsWith('no_') && matches) {
        // Negative check - should NOT match
        passed = false;
        results.push(`❌ ${check.message}`);
      } else if (!check.check.startsWith('no_') && !matches) {
        // Positive check - should match
        passed = false;
        results.push(`❌ ${check.message}`);
      } else {
        results.push(`✅ ${check.message}`);
      }
    }

    if (passed) {
      message = `Good work! You've fixed all security vulnerabilities.\n\n${results.join('\n')}`;
      this.currentChallenge.status = 'completed';
      this.currentChallenge.completedAt = new Date().toISOString();
      this.saveCurrentChallenge();
    } else {
      message = `Some security issues remain:\n\n${results.join('\n')}`;
    }

    return { passed, message };
  }

  runLegacyChecks(challengeId, content) {
    const checks = {
      'sql-injection-basic': () => {
        if (content.includes('?') && !content.includes("' +")) {
          return { passed: true, message: 'Good! You fixed the SQL injection by using parameterized queries.' };
        }
        if (content.includes('mysql.escape') || content.includes('connection.escape')) {
          return { passed: true, message: 'Fixed by escaping user input.' };
        }
        return { passed: false, message: 'Still vulnerable. Try using parameterized queries with ? placeholders.' };
      },
      'stored-xss-comments': () => {
        if (content.includes('textContent') || content.includes('innerText')) {
          return { passed: true, message: 'Good! Using textContent prevents XSS attacks.' };
        }
        if (content.includes('escapeHtml') || content.includes('DOMPurify')) {
          return { passed: true, message: 'Fixed by sanitizing the input properly.' };
        }
        return { passed: false, message: 'Still vulnerable. Try using textContent instead of innerHTML.' };
      },
      'jwt-vulnerabilities': () => {
        if (content.includes('process.env') && !content.includes('secret123')) {
          return { passed: true, message: 'Good! Using environment variables for secrets is the right approach.' };
        }
        return { passed: false, message: 'Still vulnerable. Store the secret in an environment variable.' };
      }
    };

    const checkFn = checks[challengeId] || checks['sql-injection-basic'];
    const result = checkFn();

    if (result.passed) {
      this.currentChallenge.status = 'completed';
      this.currentChallenge.completedAt = new Date().toISOString();
      this.saveCurrentChallenge();
    }

    return result;
  }

  getHint(hintNumber = 1) {
    if (!this.currentChallenge) {
      throw new Error('No active challenge');
    }

    const challenge = this.getAllChallenges().find(c => c.id === this.currentChallenge.id);
    let challengeHints = [];

    if (challenge?.hints && Array.isArray(challenge.hints)) {
      challengeHints = challenge.hints;
    } else {
      // Fallback to hardcoded hints
      const fallbackHints = {
        'sql-injection-basic': [
          'Look for where user input (username and password) is being concatenated directly into the SQL query.',
          'Consider using parameterized queries with ? placeholders instead of string concatenation.',
          'Example: "SELECT * FROM users WHERE username = ? AND password = ?"'
        ],
        'stored-xss-comments': [
          'The vulnerability is in how the comment text is added to the page.',
          'innerHTML interprets HTML tags. Consider using textContent instead.',
          'textContent treats everything as plain text, preventing script execution.'
        ],
        'jwt-vulnerabilities': [
          'The secret should not be hardcoded in the source code.',
          'Use process.env to read the secret from environment variables.',
          'Example: const SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString(\'hex\')'
        ],
        'path-traversal-file-server': [
          'User input is being used directly to construct file paths without validation.',
          'Use path.resolve() and check if the resolved path starts with the allowed directory.',
          'Consider implementing a whitelist of allowed files or directories.'
        ]
      };

      challengeHints = fallbackHints[this.currentChallenge.id] || fallbackHints['sql-injection-basic'];
    }

    const hint = challengeHints[Math.min(hintNumber - 1, challengeHints.length - 1)];

    return {
      hint,
      hintNumber,
      totalHints: challengeHints.length
    };
  }

  async moveToNext() {
    const challenges = this.getAllChallenges();
    const currentIndex = challenges.findIndex(c => c.id === this.currentChallenge?.id);
    
    if (currentIndex === -1 || currentIndex === challenges.length - 1) {
      return null; // No more challenges
    }

    const nextChallenge = challenges[currentIndex + 1];
    return this.startChallenge(nextChallenge.id);
  }
}

module.exports = ChallengeManager;