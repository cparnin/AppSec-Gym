const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

class ProgressTracker {
  constructor(dataPath) {
    this.dataPath = dataPath || path.join(process.env.HOME, '.appsec-gym', 'progress.json');
    this.progress = this.loadProgress();
  }

  loadProgress() {
    if (fs.existsSync(this.dataPath)) {
      try {
        return fs.readJsonSync(this.dataPath);
      } catch (error) {
        return this.getDefaultProgress();
      }
    }
    return this.getDefaultProgress();
  }

  getDefaultProgress() {
    return {
      startedAt: new Date().toISOString(),
      challenges: {},
      stats: {
        totalCompleted: 0,
        totalStarted: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivity: null
      }
    };
  }

  saveProgress() {
    fs.ensureDirSync(path.dirname(this.dataPath));
    fs.writeJsonSync(this.dataPath, this.progress, { spaces: 2 });
  }

  markChallengeStarted(challengeId) {
    if (!this.progress.challenges[challengeId]) {
      this.progress.challenges[challengeId] = {
        started: true,
        startedAt: new Date().toISOString(),
        completed: false,
        attempts: 0,
        hints: 0
      };
      this.progress.stats.totalStarted++;
    }
    this.progress.challenges[challengeId].attempts++;
    this.progress.stats.lastActivity = new Date().toISOString();
    this.saveProgress();
  }

  markChallengeCompleted(challengeId) {
    if (!this.progress.challenges[challengeId]) {
      this.progress.challenges[challengeId] = {
        started: true,
        startedAt: new Date().toISOString()
      };
    }
    
    this.progress.challenges[challengeId].completed = true;
    this.progress.challenges[challengeId].completedAt = new Date().toISOString();
    
    if (!this.progress.challenges[challengeId].completed) {
      this.progress.stats.totalCompleted++;
    }
    
    this.updateStreak();
    this.progress.stats.lastActivity = new Date().toISOString();
    this.saveProgress();
  }

  recordHintUsed(challengeId) {
    if (!this.progress.challenges[challengeId]) {
      this.markChallengeStarted(challengeId);
    }
    this.progress.challenges[challengeId].hints++;
    this.saveProgress();
  }

  updateStreak() {
    const today = new Date().toDateString();
    const lastActivity = this.progress.stats.lastActivity ? 
      new Date(this.progress.stats.lastActivity).toDateString() : null;
    
    if (lastActivity === today) {
      // Already updated today
      return;
    }
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (lastActivity === yesterday.toDateString()) {
      // Continuing streak
      this.progress.stats.currentStreak++;
    } else {
      // Streak broken
      this.progress.stats.currentStreak = 1;
    }
    
    if (this.progress.stats.currentStreak > this.progress.stats.longestStreak) {
      this.progress.stats.longestStreak = this.progress.stats.currentStreak;
    }
  }

  getChallengeProgress(challengeId) {
    return this.progress.challenges[challengeId] || null;
  }

  getProgress() {
    return this.progress;
  }

  getFormattedProgress() {
    const stats = this.progress.stats;
    const challenges = Object.keys(this.progress.challenges);
    
    const output = [];
    output.push(chalk.bold.cyan('\n📊 Your AppSec Gym Progress\n'));
    output.push(chalk.white('═'.repeat(40)));
    
    output.push(chalk.green(`\n✅ Completed: ${stats.totalCompleted} challenges`));
    output.push(chalk.yellow(`🏃 Started: ${stats.totalStarted} challenges`));
    output.push(chalk.blue(`🔥 Current streak: ${stats.currentStreak} days`));
    output.push(chalk.magenta(`🏆 Longest streak: ${stats.longestStreak} days`));
    
    if (challenges.length > 0) {
      output.push(chalk.white('\n\nChallenge Details:'));
      output.push(chalk.white('─'.repeat(40)));
      
      challenges.forEach(id => {
        const challenge = this.progress.challenges[id];
        const status = challenge.completed ? chalk.green('✓ Completed') : chalk.yellow('○ In Progress');
        const attempts = chalk.gray(`${challenge.attempts} attempts`);
        const hints = challenge.hints > 0 ? chalk.gray(`${challenge.hints} hints used`) : '';
        
        output.push(`  ${status} ${id}`);
        output.push(`    ${attempts} ${hints}`);
      });
    }
    
    if (stats.lastActivity) {
      const lastDate = new Date(stats.lastActivity);
      const timeAgo = this.getTimeAgo(lastDate);
      output.push(chalk.gray(`\nLast activity: ${timeAgo}`));
    }
    
    return output.join('\n');
  }

  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    
    return date.toLocaleDateString();
  }

  reset() {
    this.progress = this.getDefaultProgress();
    this.saveProgress();
  }
}

module.exports = ProgressTracker;