const { exec } = require('child_process');
const path = require('path');
const fs = require('fs-extra');

const CLI_PATH = path.join(__dirname, '../../src/index.js');

function runCLI(args = '') {
  return new Promise((resolve, reject) => {
    exec(`node "${CLI_PATH}" ${args}`, (error, stdout, stderr) => {
      resolve({ error, stdout, stderr });
    });
  });
}

describe('CLI Integration Tests', () => {
  beforeEach(() => {
    // Clean workspace
    const workspace = path.join(process.env.HOME, '.appsec-gym-test');
    fs.removeSync(workspace);
  });

  describe('Basic commands', () => {
    test('should show version', async () => {
      const { stdout } = await runCLI('--version');
      expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/);
    });

    test('should show help', async () => {
      const { stdout } = await runCLI('--help');
      expect(stdout).toContain('Interactive security training');
      expect(stdout).toContain('start');
      expect(stdout).toContain('check');
      expect(stdout).toContain('hint');
    });

    test('should list challenges', async () => {
      const { stdout } = await runCLI('list');
      expect(stdout).toContain('Available Challenges');
      expect(stdout).toContain('SQL Injection');
      expect(stdout).toContain('XSS');
      expect(stdout).toContain('beginner');
      expect(stdout).toContain('intermediate');
    });

    test('should show progress', async () => {
      const { stdout } = await runCLI('progress');
      expect(stdout).toContain('AppSec Gym Progress');
      expect(stdout).toContain('Completed:');
      expect(stdout).toContain('Started:');
    });

    test('should show status when no challenge active', async () => {
      const { stdout } = await runCLI('status');
      expect(stdout).toContain('No active challenge');
    });
  });

  describe('Challenge workflow', () => {
    test('should start a challenge', async () => {
      const { stdout } = await runCLI('start sql-injection-basic');
      expect(stdout).toContain('SQL Injection Vulnerability');
      expect(stdout).toContain('vulnerable.js');
      expect(stdout).toContain('Your Task:');
    });

    test('should show hint for active challenge', async () => {
      await runCLI('start sql-injection-basic');
      const { stdout } = await runCLI('hint');
      expect(stdout).toContain('Hint');
      expect(stdout).toContain('user input');
    });

    test('should check solution', async () => {
      await runCLI('start sql-injection-basic');
      const { stdout } = await runCLI('check');
      // Should fail since we haven't fixed it
      expect(stdout).toContain('vulnerable');
    });

    test('should handle invalid challenge ID', async () => {
      const { stdout, stderr } = await runCLI('start invalid-challenge');
      expect(stdout + stderr).toContain('not found');
    });
  });

  describe('Error handling', () => {
    test('should handle check without active challenge', async () => {
      const { stdout, stderr } = await runCLI('check');
      expect(stdout + stderr).toContain('No active challenge');
    });

    test('should handle hint without active challenge', async () => {
      const { stdout } = await runCLI('hint');
      expect(stdout).toContain('No active challenge');
    });

    test('should handle next at last challenge', async () => {
      // Start last challenge
      await runCLI('start xxe-parser');
      const { stdout } = await runCLI('next');
      expect(stdout).toContain('completed all');
    });
  });
});