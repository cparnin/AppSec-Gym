const fs = require('fs-extra');
const path = require('path');
const yaml = require('yaml');
const chalk = require('chalk');

class ChallengeManager {
  constructor(challengesPath, workspacePath) {
    this.challengesPath = challengesPath || path.join(__dirname, '../../../challenges');
    this.workspacePath = workspacePath || path.join(process.env.HOME, '.appsec-gym', 'workspace');
    this.currentChallenge = null;
    this.loadCurrentChallenge();
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
    // For now, return mock data. Later we'll scan the challenges directory
    return [
      {
        id: 'sql-injection-basic',
        title: 'Basic SQL Injection',
        category: 'injection',
        difficulty: 'beginner',
        description: 'Fix a login function vulnerable to SQL injection'
      },
      {
        id: 'xss-stored',
        title: 'Stored XSS in Comments',
        category: 'xss',
        difficulty: 'beginner',
        description: 'Sanitize user comments to prevent XSS attacks'
      },
      {
        id: 'jwt-weak-secret',
        title: 'Weak JWT Secret',
        category: 'auth',
        difficulty: 'intermediate',
        description: 'Fix JWT implementation with weak secret'
      },
      {
        id: 'path-traversal',
        title: 'Path Traversal in File Server',
        category: 'injection',
        difficulty: 'intermediate',
        description: 'Prevent directory traversal attacks'
      },
      {
        id: 'xxe-parser',
        title: 'XXE in XML Parser',
        category: 'xxe',
        difficulty: 'advanced',
        description: 'Secure XML parsing against XXE attacks'
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

    // For now, create a sample vulnerable file
    const vulnerableCode = this.getSampleVulnerableCode(challengeId);
    const filePath = path.join(challengeWorkspace, 'vulnerable.js');
    fs.writeFileSync(filePath, vulnerableCode);

    // Update current challenge
    this.currentChallenge = {
      ...challenge,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      workspacePath: challengeWorkspace,
      filePath: filePath
    };
    this.saveCurrentChallenge();

    return {
      challenge: this.currentChallenge,
      instructions: this.getInstructions(challengeId),
      filePath: filePath
    };
  }

  getSampleVulnerableCode(challengeId) {
    const samples = {
      'sql-injection-basic': `// TODO: Fix the SQL injection vulnerability in this login function
const mysql = require('mysql');

function login(username, password) {
  // VULNERABILITY: User input is directly concatenated into SQL query
  const query = "SELECT * FROM users WHERE username = '" + username + 
                "' AND password = '" + password + "'";
  
  return db.query(query);
}

module.exports = { login };`,

      'xss-stored': `// TODO: Fix the XSS vulnerability in this comment handler
function displayComment(comment) {
  // VULNERABILITY: User input is rendered without sanitization
  document.getElementById('comments').innerHTML += 
    '<div class="comment">' + comment.text + '</div>';
}

module.exports = { displayComment };`,

      'jwt-weak-secret': `// TODO: Fix the weak JWT secret vulnerability
const jwt = require('jsonwebtoken');

// VULNERABILITY: Hardcoded weak secret
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
    const instructions = {
      'sql-injection-basic': `
${chalk.bold('SQL Injection Vulnerability')}

${chalk.yellow('The Problem:')}
The login function is vulnerable to SQL injection. An attacker could bypass 
authentication by entering specially crafted input like:
  Username: admin' --
  Password: anything

${chalk.green('Your Task:')}
Fix the SQL injection vulnerability by using parameterized queries or prepared 
statements instead of string concatenation.

${chalk.blue('Files to edit:')}
  vulnerable.js

${chalk.gray('Run "appsec-gym check" when you think you\'ve fixed it!')}`,

      'xss-stored': `
${chalk.bold('Cross-Site Scripting (XSS) Vulnerability')}

${chalk.yellow('The Problem:')}
User comments are displayed without sanitization, allowing attackers to inject
malicious scripts that will execute in other users' browsers.

${chalk.green('Your Task:')}
Sanitize user input before displaying it. Either escape HTML characters or use
a safe rendering method.

${chalk.blue('Files to edit:')}
  vulnerable.js

${chalk.gray('Run "appsec-gym check" when you think you\'ve fixed it!')}`,

      'jwt-weak-secret': `
${chalk.bold('Weak JWT Secret Vulnerability')}

${chalk.yellow('The Problem:')}
The JWT secret is hardcoded and weak, making it easy for attackers to forge
valid tokens and impersonate users.

${chalk.green('Your Task:')}
Use a strong, randomly generated secret stored in environment variables, not
hardcoded in the source code.

${chalk.blue('Files to edit:')}
  vulnerable.js

${chalk.gray('Run "appsec-gym check" when you think you\'ve fixed it!')}`
    };

    return instructions[challengeId] || instructions['sql-injection-basic'];
  }

  async checkSolution() {
    if (!this.currentChallenge) {
      throw new Error('No active challenge');
    }

    // For now, do a simple check based on the challenge
    const filePath = this.currentChallenge.filePath;
    const content = fs.readFileSync(filePath, 'utf8');
    
    const checks = {
      'sql-injection-basic': () => {
        // Check if they're using parameterized queries
        if (content.includes('?') && !content.includes("' +")) {
          return { passed: true, message: 'Great! You fixed the SQL injection by using parameterized queries.' };
        }
        if (content.includes('mysql.escape') || content.includes('connection.escape')) {
          return { passed: true, message: 'Good! You fixed it by escaping user input.' };
        }
        return { passed: false, message: 'Still vulnerable. Try using parameterized queries with ? placeholders.' };
      },
      'xss-stored': () => {
        if (content.includes('textContent') || content.includes('innerText')) {
          return { passed: true, message: 'Excellent! Using textContent prevents XSS attacks.' };
        }
        if (content.includes('escapeHtml') || content.includes('DOMPurify')) {
          return { passed: true, message: 'Great! You sanitized the input properly.' };
        }
        return { passed: false, message: 'Still vulnerable. Try using textContent instead of innerHTML.' };
      },
      'jwt-weak-secret': () => {
        if (content.includes('process.env') && !content.includes('secret123')) {
          return { passed: true, message: 'Perfect! Using environment variables for secrets is the right approach.' };
        }
        return { passed: false, message: 'Still vulnerable. Store the secret in an environment variable.' };
      }
    };

    const checkFn = checks[this.currentChallenge.id] || checks['sql-injection-basic'];
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

    const hints = {
      'sql-injection-basic': [
        'Look for where user input (username and password) is being concatenated directly into the SQL query.',
        'Consider using parameterized queries with ? placeholders instead of string concatenation.',
        'Example: "SELECT * FROM users WHERE username = ? AND password = ?"'
      ],
      'xss-stored': [
        'The vulnerability is in how the comment text is added to the page.',
        'innerHTML interprets HTML tags. Consider using textContent instead.',
        'textContent treats everything as plain text, preventing script execution.'
      ],
      'jwt-weak-secret': [
        'The secret should not be hardcoded in the source code.',
        'Use process.env to read the secret from environment variables.',
        'Example: const SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString(\'hex\')'
      ]
    };

    const challengeHints = hints[this.currentChallenge.id] || hints['sql-injection-basic'];
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