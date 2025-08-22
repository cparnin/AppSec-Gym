const inquirer = require('inquirer');
const chalk = require('chalk');

class InteractiveMenu {
  constructor(challengeManager, progressTracker) {
    this.challengeManager = challengeManager;
    this.progressTracker = progressTracker;
  }

  async showMainMenu() {
    console.clear();
    this.showHeader();
    
    const currentChallenge = this.challengeManager.getCurrentChallenge();
    const progress = this.progressTracker.getProgress();
    
    if (currentChallenge) {
      console.log(chalk.cyan(`Current Challenge: ${currentChallenge.title}`));
      console.log(chalk.gray(`Category: ${currentChallenge.category} | Difficulty: ${currentChallenge.difficulty}`));
      console.log(chalk.yellow(`Status: ${currentChallenge.status || 'Not started'}\n`));
    } else {
      console.log(chalk.gray('No challenge selected\n'));
    }

    const choices = this.getMenuChoices(currentChallenge);
    
    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices,
        pageSize: 10
      }
    ]);

    return action;
  }

  getMenuChoices(currentChallenge) {
    const choices = [];

    if (currentChallenge) {
      if (currentChallenge.status === 'in_progress') {
        choices.push(
          { name: chalk.green('Check your solution'), value: 'check' },
          { name: chalk.yellow('Get a hint'), value: 'hint' },
          { name: chalk.blue('Show challenge again'), value: 'show' },
          new inquirer.Separator()
        );
      } else if (currentChallenge.status === 'completed') {
        choices.push(
          { name: chalk.green('Continue to next challenge'), value: 'next' },
          { name: chalk.blue('Review solution'), value: 'review' },
          new inquirer.Separator()
        );
      } else {
        choices.push(
          { name: chalk.green('Start this challenge'), value: 'start' },
          { name: chalk.yellow('Get challenge info'), value: 'info' },
          new inquirer.Separator()
        );
      }
    } else {
      choices.push(
        { name: chalk.green('Start training (beginner mode)'), value: 'start-beginner' },
        { name: chalk.blue('Choose a specific topic'), value: 'choose-topic' },
        new inquirer.Separator()
      );
    }

    // Always available options
    choices.push(
      { name: 'Browse all challenges', value: 'list' },
      { name: 'View your progress', value: 'progress' },
      { name: 'Settings', value: 'settings' },
      new inquirer.Separator(),
      { name: chalk.gray('Exit'), value: 'exit' }
    );

    return choices;
  }

  showHeader() {
    console.log(chalk.blue('╔════════════════════════════════════════╗'));
    console.log(chalk.blue('║') + chalk.white.bold('        🏋️  AppSec Gym v0.1.0         ') + chalk.blue('║'));
    console.log(chalk.blue('║') + chalk.gray('      Security Training That Works      ') + chalk.blue('║'));
    console.log(chalk.blue('╚════════════════════════════════════════╝'));
    console.log();
  }

  async selectChallenge() {
    const challenges = this.challengeManager.getAllChallenges();
    const categories = [...new Set(challenges.map(c => c.category))];

    const { category } = await inquirer.prompt([
      {
        type: 'list',
        name: 'category',
        message: 'Select a category:',
        choices: [
          ...categories.map(cat => ({
            name: `${cat} (${challenges.filter(c => c.category === cat).length} challenges)`,
            value: cat
          })),
          new inquirer.Separator(),
          { name: chalk.gray('← Back'), value: 'back' }
        ]
      }
    ]);

    if (category === 'back') return null;

    const categoryChallenges = challenges.filter(c => c.category === category);
    
    const { challenge } = await inquirer.prompt([
      {
        type: 'list',
        name: 'challenge',
        message: 'Select a challenge:',
        choices: [
          ...categoryChallenges.map(c => ({
            name: `${this.getChallengeIcon(c)} ${c.title} [${c.difficulty}]`,
            value: c.id
          })),
          new inquirer.Separator(),
          { name: chalk.gray('← Back'), value: 'back' }
        ]
      }
    ]);

    return challenge !== 'back' ? challenge : null;
  }

  getChallengeIcon(challenge) {
    const progress = this.progressTracker.getChallengeProgress(challenge.id);
    if (progress?.completed) return chalk.green('✓');
    if (progress?.started) return chalk.yellow('○');
    return chalk.gray('○');
  }

  async confirmExit() {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to exit?',
        default: false
      }
    ]);
    return confirm;
  }

  showSuccess(message) {
    console.log(chalk.green.bold(`\n✅ ${message}\n`));
  }

  showError(message) {
    console.log(chalk.red.bold(`\n❌ ${message}\n`));
  }

  showHint(hint, hintNumber, totalHints) {
    console.log(chalk.yellow(`\n💡 Hint ${hintNumber}/${totalHints}:`));
    console.log(chalk.white(hint));
  }

  async pauseForUser(message = 'Press Enter to continue...') {
    await inquirer.prompt([
      {
        type: 'input',
        name: 'continue',
        message: chalk.gray(message),
        prefix: ''
      }
    ]);
  }
}

module.exports = InteractiveMenu;