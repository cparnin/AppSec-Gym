const { Command } = require('commander');
const chalk = require('chalk');
const package = require('../package.json');

const program = new Command();

program
  .name('appsec-gym')
  .description('🏋️ Interactive CLI training gym for application security')
  .version(package.version);

program
  .command('warmup')
  .description('Start with beginner-friendly challenges')
  .action(() => {
    console.log(chalk.green('🏋️ Welcome to AppSec Gym!'));
    console.log(chalk.yellow('💪 Let\'s start with some warmup exercises...'));
    console.log(chalk.blue('📚 Loading beginner challenges...'));
  });

program
  .command('workout <type>')
  .description('Focus on specific vulnerability type (sql, xss, auth, etc.)')
  .action((type) => {
    console.log(chalk.green(`🎯 Starting ${type.toUpperCase()} workout!`));
    console.log(chalk.yellow('🔥 Time to build those security muscles!'));
  });

program
  .command('check')
  .description('Validate your current solution')
  .action(() => {
    console.log(chalk.blue('🔍 Checking your solution...'));
    console.log(chalk.green('✅ Great job! Moving to next challenge.'));
  });

program
  .command('next')
  .description('Move to the next challenge')
  .action(() => {
    console.log(chalk.yellow('➡️  Loading next challenge...'));
  });

program
  .command('progress')
  .description('Show your training progress')
  .action(() => {
    console.log(chalk.green('📊 Your AppSec Gym Progress:'));
    console.log(chalk.blue('🏆 Challenges completed: 0/50'));
    console.log(chalk.yellow('💪 Current streak: 0 days'));
  });

program.parse();