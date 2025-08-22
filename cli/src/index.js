#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const package = require('../package.json');

const InteractiveMenu = require('./utils/menu');
const ChallengeManager = require('./core/challengeManager');
const ProgressTracker = require('./core/progressTracker');

const program = new Command();

// Initialize core components
const challengeManager = new ChallengeManager();
const progressTracker = new ProgressTracker();
const menu = new InteractiveMenu(challengeManager, progressTracker);

program
  .name('appsec-gym')
  .description('Interactive security training for developers')
  .version(package.version);

// Main command - launches interactive mode
program
  .action(async () => {
    await runInteractiveMode();
  });

// Direct commands for power users
program
  .command('start [challenge-id]')
  .description('Start a new challenge')
  .action(async (challengeId) => {
    try {
      if (!challengeId) {
        // Start first challenge or resume current
        const current = challengeManager.getCurrentChallenge();
        if (current && current.status === 'in_progress') {
          console.log(chalk.yellow(`Resuming: ${current.title}`));
          console.log(chalk.gray(`Edit: ${current.filePath}`));
          return;
        }
        
        // Start first challenge
        const challenges = challengeManager.getAllChallenges();
        challengeId = challenges[0].id;
      }
      
      const result = await challengeManager.startChallenge(challengeId);
      progressTracker.markChallengeStarted(challengeId);
      
      console.log(result.instructions);
      console.log(chalk.green(`\n📁 Challenge files created in:`));
      console.log(chalk.white(`   ${result.filePath}\n`));
      console.log(chalk.gray('Edit the file and run "appsec-gym check" when ready!'));
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

program
  .command('check')
  .description('Check if you fixed the vulnerability')
  .action(async () => {
    try {
      const result = await challengeManager.checkSolution();
      
      if (result.passed) {
        progressTracker.markChallengeCompleted(challengeManager.getCurrentChallenge().id);
        menu.showSuccess(result.message);
        console.log(chalk.gray('\nRun "appsec-gym next" to continue to the next challenge!'));
      } else {
        menu.showError(result.message);
        console.log(chalk.gray('\nNeed help? Run "appsec-gym hint"'));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

program
  .command('hint')
  .description('Get a hint for the current challenge')
  .action(() => {
    try {
      const current = challengeManager.getCurrentChallenge();
      if (!current) {
        console.log(chalk.yellow('No active challenge. Run "appsec-gym start" to begin!'));
        return;
      }
      
      const progress = progressTracker.getChallengeProgress(current.id) || { hints: 0 };
      const hintData = challengeManager.getHint(progress.hints + 1);
      
      progressTracker.recordHintUsed(current.id);
      menu.showHint(hintData.hint, hintData.hintNumber, hintData.totalHints);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

program
  .command('next')
  .description('Move to the next challenge')
  .action(async () => {
    try {
      const result = await challengeManager.moveToNext();
      if (result) {
        progressTracker.markChallengeStarted(result.challenge.id);
        console.log(result.instructions);
        console.log(chalk.green(`\n📁 Challenge files created in:`));
        console.log(chalk.white(`   ${result.filePath}\n`));
      } else {
        console.log(chalk.green('🎉 Congratulations! You\'ve completed all available challenges!'));
        console.log(chalk.gray('Check back soon for more challenges.'));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
    }
  });

program
  .command('status')
  .description('Show current challenge status')
  .action(() => {
    const current = challengeManager.getCurrentChallenge();
    if (current) {
      console.log(chalk.cyan(`\nCurrent Challenge: ${current.title}`));
      console.log(chalk.gray(`Category: ${current.category}`));
      console.log(chalk.gray(`Difficulty: ${current.difficulty}`));
      console.log(chalk.gray(`Status: ${current.status}`));
      if (current.filePath) {
        console.log(chalk.gray(`File: ${current.filePath}`));
      }
    } else {
      console.log(chalk.yellow('No active challenge. Run "appsec-gym start" to begin!'));
    }
  });

program
  .command('progress')
  .description('Show your training progress')
  .action(() => {
    console.log(progressTracker.getFormattedProgress());
  });

program
  .command('list')
  .description('List all available challenges')
  .action(() => {
    const challenges = challengeManager.getAllChallenges();
    const categories = [...new Set(challenges.map(c => c.category))];
    
    console.log(chalk.bold.cyan('\n📚 Available Challenges\n'));
    
    categories.forEach(category => {
      console.log(chalk.yellow(`\n${category.toUpperCase()}`));
      console.log(chalk.gray('─'.repeat(40)));
      
      challenges
        .filter(c => c.category === category)
        .forEach(challenge => {
          const progress = progressTracker.getChallengeProgress(challenge.id);
          const status = progress?.completed ? chalk.green('✓') : 
                        progress?.started ? chalk.yellow('○') : 
                        chalk.gray('○');
          
          console.log(`  ${status} ${challenge.title} [${challenge.difficulty}]`);
          console.log(chalk.gray(`    ${challenge.description}`));
        });
    });
    
    console.log(chalk.gray('\n\nRun "appsec-gym start <challenge-id>" to begin a specific challenge'));
  });

program
  .command('reset')
  .description('Reset all progress and start over')
  .action(async () => {
    const inquirer = require('inquirer');
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to reset all progress?',
        default: false
      }
    ]);
    
    if (confirm) {
      progressTracker.reset();
      console.log(chalk.green('Progress reset. Ready to start fresh!'));
    }
  });

// Interactive mode
async function runInteractiveMode() {
  let running = true;
  
  while (running) {
    try {
      const action = await menu.showMainMenu();
      
      switch (action) {
        case 'start':
        case 'start-beginner':
          const current = challengeManager.getCurrentChallenge();
          const challengeId = current?.id || challengeManager.getAllChallenges()[0].id;
          const result = await challengeManager.startChallenge(challengeId);
          progressTracker.markChallengeStarted(challengeId);
          console.clear();
          console.log(result.instructions);
          console.log(chalk.green(`\n📁 Challenge files created in:`));
          console.log(chalk.white(`   ${result.filePath}\n`));
          await menu.pauseForUser();
          break;
          
        case 'check':
          const checkResult = await challengeManager.checkSolution();
          if (checkResult.passed) {
            progressTracker.markChallengeCompleted(challengeManager.getCurrentChallenge().id);
            menu.showSuccess(checkResult.message);
          } else {
            menu.showError(checkResult.message);
          }
          await menu.pauseForUser();
          break;
          
        case 'hint':
          const hintCurrent = challengeManager.getCurrentChallenge();
          const hintProgress = progressTracker.getChallengeProgress(hintCurrent.id) || { hints: 0 };
          const hintData = challengeManager.getHint(hintProgress.hints + 1);
          progressTracker.recordHintUsed(hintCurrent.id);
          menu.showHint(hintData.hint, hintData.hintNumber, hintData.totalHints);
          await menu.pauseForUser();
          break;
          
        case 'next':
          const nextResult = await challengeManager.moveToNext();
          if (nextResult) {
            progressTracker.markChallengeStarted(nextResult.challenge.id);
            console.clear();
            console.log(nextResult.instructions);
            console.log(chalk.green(`\n📁 Challenge files created in:`));
            console.log(chalk.white(`   ${nextResult.filePath}\n`));
          } else {
            console.log(chalk.green('🎉 Congratulations! You\'ve completed all available challenges!'));
          }
          await menu.pauseForUser();
          break;
          
        case 'list':
        case 'choose-topic':
          const selected = await menu.selectChallenge();
          if (selected) {
            const startResult = await challengeManager.startChallenge(selected);
            progressTracker.markChallengeStarted(selected);
            console.clear();
            console.log(startResult.instructions);
            console.log(chalk.green(`\n📁 Challenge files created in:`));
            console.log(chalk.white(`   ${startResult.filePath}\n`));
            await menu.pauseForUser();
          }
          break;
          
        case 'progress':
          console.clear();
          console.log(progressTracker.getFormattedProgress());
          await menu.pauseForUser();
          break;
          
        case 'show':
        case 'info':
          const showCurrent = challengeManager.getCurrentChallenge();
          if (showCurrent) {
            console.clear();
            console.log(challengeManager.getInstructions(showCurrent.id));
            if (showCurrent.filePath) {
              console.log(chalk.green(`\n📁 Files located at:`));
              console.log(chalk.white(`   ${showCurrent.filePath}\n`));
            }
            await menu.pauseForUser();
          }
          break;
          
        case 'settings':
          console.log(chalk.gray('Settings coming soon...'));
          await menu.pauseForUser();
          break;
          
        case 'exit':
          if (await menu.confirmExit()) {
            console.log(chalk.gray('Thanks for training with AppSec Gym! 💪'));
            running = false;
          }
          break;
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      await menu.pauseForUser();
    }
  }
  
  process.exit(0);
}

// Parse arguments
if (process.argv.length === 2) {
  // No arguments, run interactive mode
  runInteractiveMode();
} else {
  program.parse(process.argv);
}