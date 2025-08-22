const ChallengeManager = require('../../src/core/challengeManager');
const fs = require('fs-extra');
const path = require('path');

describe('ChallengeManager', () => {
  let challengeManager;
  const testWorkspace = path.join(__dirname, '../fixtures/test-workspace');

  beforeEach(() => {
    // Clean test workspace
    fs.removeSync(testWorkspace);
    challengeManager = new ChallengeManager(null, testWorkspace);
  });

  afterEach(() => {
    // Cleanup
    fs.removeSync(testWorkspace);
  });

  describe('startChallenge', () => {
    test('should create vulnerable file in workspace', async () => {
      const result = await challengeManager.startChallenge('sql-injection-basic');
      
      expect(result).toBeDefined();
      expect(result.filePath).toContain('vulnerable.js');
      expect(fs.existsSync(result.filePath)).toBe(true);
      
      const content = fs.readFileSync(result.filePath, 'utf8');
      expect(content).toContain('SQL injection vulnerability');
    });

    test('should track current challenge state', async () => {
      await challengeManager.startChallenge('sql-injection-basic');
      const current = challengeManager.getCurrentChallenge();
      
      expect(current).toBeDefined();
      expect(current.id).toBe('sql-injection-basic');
      expect(current.status).toBe('in_progress');
    });

    test('should throw error for invalid challenge', async () => {
      await expect(challengeManager.startChallenge('invalid-challenge'))
        .rejects.toThrow('Challenge invalid-challenge not found');
    });
  });

  describe('checkSolution', () => {
    test('should detect fixed SQL injection', async () => {
      await challengeManager.startChallenge('sql-injection-basic');
      
      // Simulate fixing the vulnerability
      const filePath = challengeManager.getCurrentChallenge().filePath;
      const fixedCode = `
        function login(username, password) {
          const query = "SELECT * FROM users WHERE username = ? AND password = ?";
          return db.query(query, [username, password]);
        }
      `;
      fs.writeFileSync(filePath, fixedCode);
      
      const result = await challengeManager.checkSolution();
      expect(result.passed).toBe(true);
      expect(result.message).toContain('fixed');
    });

    test('should detect unfixed vulnerability', async () => {
      await challengeManager.startChallenge('sql-injection-basic');
      
      const result = await challengeManager.checkSolution();
      expect(result.passed).toBe(false);
      expect(result.message).toContain('vulnerable');
    });

    test('should throw error when no active challenge', async () => {
      await expect(challengeManager.checkSolution())
        .rejects.toThrow('No active challenge');
    });
  });

  describe('getHint', () => {
    test('should return progressive hints', async () => {
      await challengeManager.startChallenge('sql-injection-basic');
      
      const hint1 = challengeManager.getHint(1);
      const hint2 = challengeManager.getHint(2);
      const hint3 = challengeManager.getHint(3);
      
      expect(hint1.hintNumber).toBe(1);
      expect(hint2.hintNumber).toBe(2);
      expect(hint3.hintNumber).toBe(3);
      expect(hint1.hint).not.toBe(hint2.hint);
    });

    test('should cap hints at maximum available', async () => {
      await challengeManager.startChallenge('sql-injection-basic');
      
      const hint = challengeManager.getHint(999);
      expect(hint.hintNumber).toBe(999);
      expect(hint.totalHints).toBe(3);
      // Should return last hint
      expect(hint.hint).toContain('Example:');
    });
  });

  describe('moveToNext', () => {
    test('should advance to next challenge', async () => {
      await challengeManager.startChallenge('sql-injection-basic');
      
      const result = await challengeManager.moveToNext();
      expect(result).toBeDefined();
      expect(result.challenge.id).toBe('xss-stored');
    });

    test('should return null at last challenge', async () => {
      // Start last challenge
      const challenges = challengeManager.getAllChallenges();
      const lastChallenge = challenges[challenges.length - 1];
      await challengeManager.startChallenge(lastChallenge.id);
      
      const result = await challengeManager.moveToNext();
      expect(result).toBeNull();
    });
  });
});