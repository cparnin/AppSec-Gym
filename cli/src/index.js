#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const package = require('../package.json');

const InteractiveMenu = require('./utils/menu');
const ChallengeManager = require('./core/challengeManager');
const ProgressTracker = require('./core/progressTracker');
const EditorLauncher = require('./utils/editor');

const program = new Command();

// Initialize core components
const challengeManager = new ChallengeManager();
const progressTracker = new ProgressTracker();
const editorLauncher = new EditorLauncher();
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
      
      // Try to open in editor
      const opened = await editorLauncher.openFile(result.filePath);
      if (!opened) {
        console.log(chalk.gray(`\nTip: ${editorLauncher.getOpenCommand(result.filePath)}`));
      }
      
      console.log(chalk.gray('\nRun "appsec-gym check" when you\'ve fixed it!'));
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
  // First-run setup: Configure editor
  if (!editorLauncher.preferredEditor) {
    console.clear();
    console.log(chalk.cyan('🎯 Welcome to AppSec Gym!\n'));
    console.log(chalk.white('Let\'s set up your preferred editor first.\n'));
    
    console.log(chalk.gray('Detecting available editors...'));
    
    // Add timeout for editor detection
    const availableEditors = await Promise.race([
      editorLauncher.detectAvailableEditors(),
      new Promise(resolve => setTimeout(() => resolve([]), 3000))
    ]);
    
    const inquirer = require('inquirer');
    
    // Always show editor choices, even if detection failed
    const choices = [];
    
    if (availableEditors.length > 0) {
      choices.push(...availableEditors.map(e => ({ 
        name: `${e.name} (detected)`, 
        value: e.command 
      })));
      choices.push(new inquirer.Separator());
    }
    
    // Always offer common editors as options
    choices.push(
      { name: 'VS Code', value: 'code' },
      { name: 'Vim', value: 'vim' },
      { name: 'Nano', value: 'nano' },
      new inquirer.Separator(),
      { name: 'I\'ll open files manually', value: 'manual' }
    );
    
    const { editor } = await inquirer.prompt([
      {
        type: 'list',
        name: 'editor',
        message: 'Which editor would you like to use?',
        choices: choices
      }
    ]);
    
    if (editor && editor !== 'manual') {
      editorLauncher.savePreferredEditor(editor);
      console.log(chalk.green(`\n✅ Great! We'll use ${editor} to open challenge files.\n`));
    } else {
      console.log(chalk.yellow('\n📝 No problem! We\'ll show you the file paths to open manually.\n'));
    }
    
    await menu.pauseForUser('Press Enter to start training...');
  }
  
  let running = true;
  
  while (running) {
    try {
      const action = await menu.showMainMenu();
      
      switch (action) {
        case 'open-editor':
          const currentForEdit = challengeManager.getCurrentChallenge();
          if (currentForEdit && currentForEdit.filePath) {
            const opened = await editorLauncher.openFile(currentForEdit.filePath);
            if (!opened) {
              console.log(chalk.yellow('\nCopy this command to open the file:'));
              console.log(chalk.white(`  ${editorLauncher.getOpenCommand(currentForEdit.filePath)}\n`));
              await menu.pauseForUser();
            }
          }
          break;
          
        case 'start':
        case 'start-beginner':
          const current = challengeManager.getCurrentChallenge();
          const challengeId = current?.id || challengeManager.getAllChallenges()[0].id;
          const result = await challengeManager.startChallenge(challengeId);
          progressTracker.markChallengeStarted(challengeId);
          console.clear();
          console.log(result.instructions);
          
          // Try to open in editor
          const opened = await editorLauncher.openFile(result.filePath);
          if (!opened) {
            console.log(chalk.gray(`\nTip: ${editorLauncher.getOpenCommand(result.filePath)}`));
          }
          
          console.log(chalk.yellow('\n📝 Edit the file, then return here and select "Check your solution"'));
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
          console.clear();
          console.log(chalk.cyan('⚙️  Settings\n'));
          
          const availableEditors = await editorLauncher.detectAvailableEditors();
          if (availableEditors.length > 0) {
            console.log(chalk.green('Detected editors:'));
            availableEditors.forEach(e => console.log(`  - ${e.name} (${e.command})`));
            
            const inquirer = require('inquirer');
            const { editor } = await inquirer.prompt([
              {
                type: 'list',
                name: 'editor',
                message: 'Select your preferred editor:',
                choices: [
                  ...availableEditors.map(e => ({ name: e.name, value: e.command })),
                  { name: 'None (manually open files)', value: null }
                ]
              }
            ]);
            
            if (editor) {
              editorLauncher.savePreferredEditor(editor);
              console.log(chalk.green(`\n✅ Set ${editor} as your default editor`));
            }
          } else {
            console.log(chalk.yellow('No editors detected. Files will need to be opened manually.'));
          }
          
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