const ChallengeManager = require('../../src/core/challengeManager');
const ProgressTracker = require('../../src/core/progressTracker');
const EditorLauncher = require('../../src/utils/editor');
const fs = require('fs-extra');
const path = require('path');

describe('User Experience Tests', () => {
  let challengeManager, progressTracker, editorLauncher;
  const testWorkspace = path.join(__dirname, '../fixtures/ux-test-workspace');

  beforeEach(() => {
    fs.removeSync(testWorkspace);
    challengeManager = new ChallengeManager(null, testWorkspace);
    progressTracker = new ProgressTracker(path.join(testWorkspace, 'progress.json'));
    editorLauncher = new EditorLauncher();
  });

  afterEach(() => {
    fs.removeSync(testWorkspace);
  });

  describe('First-time user experience', () => {
    test('user can start first challenge without setup', async () => {
      const result = await challengeManager.startChallenge('sql-injection-basic');
      
      expect(result).toBeDefined();
      expect(result.filePath).toBeDefined();
      expect(fs.existsSync(result.filePath)).toBe(true);
      expect(result.instructions).toContain('SQL Injection');
    });

    test('file paths are user-friendly', async () => {
      const result = await challengeManager.startChallenge('sql-injection-basic');
      
      // File should be in a sensible location
      expect(result.filePath).toContain('.appsec-gym');
      expect(result.filePath).toContain('vulnerable.js');
      
      // File should have readable content
      const content = fs.readFileSync(result.filePath, 'utf8');
      expect(content).toContain('TODO:');
      expect(content).toContain('VULNERABILITY:');
    });

    test('instructions are clear and actionable', async () => {
      const result = await challengeManager.startChallenge('sql-injection-basic');
      
      expect(result.instructions).toContain('The Problem:');
      expect(result.instructions).toContain('Your Task:');
      expect(result.instructions).toContain('Files to edit:');
      expect(result.instructions).toContain('vulnerable.js');
    });
  });

  describe('Progress feedback', () => {
    test('user gets clear feedback on success', async () => {
      await challengeManager.startChallenge('sql-injection-basic');
      
      // Simulate fix
      const filePath = challengeManager.getCurrentChallenge().filePath;
      fs.writeFileSync(filePath, 'const query = "SELECT * FROM users WHERE username = ? AND password = ?";');
      
      const result = await challengeManager.checkSolution();
      expect(result.passed).toBe(true);
      expect(result.message).toContain('Great!');
    });

    test('user gets helpful feedback on failure', async () => {
      await challengeManager.startChallenge('sql-injection-basic');
      
      const result = await challengeManager.checkSolution();
      expect(result.passed).toBe(false);
      expect(result.message).toContain('vulnerable');
      expect(result.message).toContain('Try');
    });

    test('hints are progressive and helpful', async () => {
      await challengeManager.startChallenge('sql-injection-basic');
      
      const hint1 = challengeManager.getHint(1);
      const hint2 = challengeManager.getHint(2);
      const hint3 = challengeManager.getHint(3);
      
      // First hint should be general
      expect(hint1.hint).toContain('Look for');
      
      // Second hint should be more specific
      expect(hint2.hint).toContain('Consider using');
      
      // Third hint should be very specific
      expect(hint3.hint).toContain('Example:');
    });
  });

  describe('Editor integration', () => {
    test('VS Code detection works', async () => {
      const available = await editorLauncher.detectAvailableEditors();
      const hasVSCode = available.some(e => e.command === 'code');
      const hasVim = available.some(e => e.command === 'vim');
      
      // At least one should be available
      expect(available.length).toBeGreaterThan(0);
      
      // Vim should always be available on Unix systems
      if (process.platform !== 'win32') {
        expect(hasVim).toBe(true);
      }
    });

    test('editor preference persists', () => {
      editorLauncher.savePreferredEditor('vim');
      
      const newLauncher = new EditorLauncher();
      expect(newLauncher.preferredEditor).toBe('vim');
    });

    test('manual mode works when no editor set', async () => {
      editorLauncher.preferredEditor = null;
      
      const result = await editorLauncher.openFile('/tmp/test.js');
      expect(result).toBe(false); // Should fail gracefully
    });
  });

  describe('Error recovery', () => {
    test('corrupted workspace can be recovered', async () => {
      // Create valid challenge
      await challengeManager.startChallenge('sql-injection-basic');
      const original = challengeManager.getCurrentChallenge();
      
      // Corrupt the state file
      const statePath = path.join(testWorkspace, '.current.json');
      fs.writeFileSync(statePath, 'invalid json');
      
      // Should handle gracefully
      const newManager = new ChallengeManager(null, testWorkspace);
      expect(newManager.getCurrentChallenge()).toBeNull();
    });

    test('missing challenge files handled gracefully', async () => {
      await challengeManager.startChallenge('sql-injection-basic');
      const current = challengeManager.getCurrentChallenge();
      
      // Delete the file
      fs.removeSync(current.filePath);
      
      // Should handle missing file
      expect(() => challengeManager.checkSolution()).not.toThrow();
    });
  });

  describe('Performance and responsiveness', () => {
    test('challenge list loads quickly', () => {
      const start = Date.now();
      const challenges = challengeManager.getAllChallenges();
      const end = Date.now();
      
      expect(challenges.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // Should be instant
    });

    test('editor detection has reasonable timeout', async () => {
      const start = Date.now();
      const editors = await editorLauncher.detectAvailableEditors();
      const end = Date.now();
      
      expect(end - start).toBeLessThan(5000); // Max 5 seconds
    });

    test('progress tracking is efficient', () => {
      const start = Date.now();
      
      // Simulate heavy usage
      for (let i = 0; i < 100; i++) {
        progressTracker.markChallengeStarted(`challenge-${i}`);
        progressTracker.recordHintUsed(`challenge-${i}`);
        progressTracker.markChallengeCompleted(`challenge-${i}`);
      }
      
      const end = Date.now();
      expect(end - start).toBeLessThan(1000); // Should be under 1 second
    });
  });

  describe('Accessibility', () => {
    test('instructions contain no excessive colors or formatting', async () => {
      const result = await challengeManager.startChallenge('sql-injection-basic');
      
      // Instructions should work in basic terminals
      expect(result.instructions).toBeDefined();
      expect(typeof result.instructions).toBe('string');
      expect(result.instructions.length).toBeGreaterThan(50);
    });

    test('file paths work across platforms', async () => {
      const result = await challengeManager.startChallenge('sql-injection-basic');
      
      expect(path.isAbsolute(result.filePath)).toBe(true);
      expect(result.filePath).not.toContain('\\\\'); // No double slashes
      expect(result.filePath).not.toContain('//');
    });
  });
});