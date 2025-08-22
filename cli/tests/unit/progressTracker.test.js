const ProgressTracker = require('../../src/core/progressTracker');
const fs = require('fs-extra');
const path = require('path');

describe('ProgressTracker', () => {
  let progressTracker;
  const testDataPath = path.join(__dirname, '../fixtures/test-progress.json');

  beforeEach(() => {
    // Clean test data
    fs.removeSync(testDataPath);
    progressTracker = new ProgressTracker(testDataPath);
  });

  afterEach(() => {
    fs.removeSync(testDataPath);
  });

  describe('Progress tracking', () => {
    test('should initialize with default progress', () => {
      const progress = progressTracker.getProgress();
      
      expect(progress.stats.totalCompleted).toBe(0);
      expect(progress.stats.totalStarted).toBe(0);
      expect(progress.stats.currentStreak).toBe(0);
      expect(progress.challenges).toEqual({});
    });

    test('should track challenge start', () => {
      progressTracker.markChallengeStarted('sql-injection-basic');
      
      const progress = progressTracker.getProgress();
      expect(progress.stats.totalStarted).toBe(1);
      expect(progress.challenges['sql-injection-basic'].started).toBe(true);
      expect(progress.challenges['sql-injection-basic'].attempts).toBe(1);
    });

    test('should track challenge completion', () => {
      progressTracker.markChallengeStarted('sql-injection-basic');
      progressTracker.markChallengeCompleted('sql-injection-basic');
      
      const progress = progressTracker.getProgress();
      expect(progress.stats.totalCompleted).toBe(1);
      expect(progress.challenges['sql-injection-basic'].completed).toBe(true);
    });

    test('should track hints used', () => {
      progressTracker.recordHintUsed('sql-injection-basic');
      progressTracker.recordHintUsed('sql-injection-basic');
      
      const challenge = progressTracker.getChallengeProgress('sql-injection-basic');
      expect(challenge.hints).toBe(2);
    });

    test('should increment attempts on restart', () => {
      progressTracker.markChallengeStarted('sql-injection-basic');
      progressTracker.markChallengeStarted('sql-injection-basic');
      progressTracker.markChallengeStarted('sql-injection-basic');
      
      const challenge = progressTracker.getChallengeProgress('sql-injection-basic');
      expect(challenge.attempts).toBe(3);
    });
  });

  describe('Persistence', () => {
    test('should save and load progress', () => {
      progressTracker.markChallengeStarted('test-challenge');
      progressTracker.markChallengeCompleted('test-challenge');
      
      // Create new instance to test loading
      const newTracker = new ProgressTracker(testDataPath);
      const progress = newTracker.getProgress();
      
      expect(progress.stats.totalCompleted).toBe(1);
      expect(progress.challenges['test-challenge'].completed).toBe(true);
    });

    test('should handle corrupted save file', () => {
      // Write invalid JSON
      fs.writeFileSync(testDataPath, 'invalid json {{{');
      
      // Should fall back to default
      const tracker = new ProgressTracker(testDataPath);
      const progress = tracker.getProgress();
      
      expect(progress.stats.totalCompleted).toBe(0);
    });
  });

  describe('Streak tracking', () => {
    test('should track daily streak', () => {
      // Mock today's activity
      progressTracker.markChallengeCompleted('challenge1');
      
      const progress = progressTracker.getProgress();
      expect(progress.stats.currentStreak).toBeGreaterThanOrEqual(1);
    });

    test('should update longest streak', () => {
      progressTracker.progress.stats.currentStreak = 5;
      progressTracker.progress.stats.longestStreak = 3;
      progressTracker.updateStreak();
      
      expect(progressTracker.progress.stats.longestStreak).toBe(5);
    });
  });

  describe('Reset', () => {
    test('should clear all progress', () => {
      progressTracker.markChallengeStarted('challenge1');
      progressTracker.markChallengeCompleted('challenge1');
      
      progressTracker.reset();
      
      const progress = progressTracker.getProgress();
      expect(progress.stats.totalCompleted).toBe(0);
      expect(progress.challenges).toEqual({});
    });
  });
});