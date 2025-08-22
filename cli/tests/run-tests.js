#!/usr/bin/env node

const { spawn } = require('child_process');
const chalk = require('chalk');
const path = require('path');

const testSuites = [
  {
    name: 'Unit Tests',
    path: 'tests/unit/*.test.js',
    description: 'Core functionality and logic'
  },
  {
    name: 'Integration Tests', 
    path: 'tests/integration/*.test.js',
    description: 'CLI commands and workflows'
  },
  {
    name: 'UX Tests',
    path: 'tests/ux/*.test.js', 
    description: 'User experience and accessibility'
  }
];

async function runTestSuite(suite) {
  console.log(chalk.cyan(`\n🧪 Running ${suite.name}`));
  console.log(chalk.gray(`   ${suite.description}\n`));
  
  return new Promise((resolve) => {
    const jest = spawn('npx', ['jest', suite.path, '--verbose'], {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    
    jest.on('close', (code) => {
      if (code === 0) {
        console.log(chalk.green(`✅ ${suite.name} passed\n`));
      } else {
        console.log(chalk.red(`❌ ${suite.name} failed\n`));
      }
      resolve(code === 0);
    });
  });
}

async function runAllTests() {
  console.log(chalk.bold.blue('🎯 AppSec Gym Test Suite\n'));
  console.log(chalk.gray('Testing quality, errors, and user experience...\n'));
  
  let allPassed = true;
  
  for (const suite of testSuites) {
    const passed = await runTestSuite(suite);
    if (!passed) allPassed = false;
  }
  
  console.log(chalk.bold(allPassed ? 
    chalk.green('🎉 All tests passed!') : 
    chalk.red('💥 Some tests failed')
  ));
  
  process.exit(allPassed ? 0 : 1);
}

// Allow running specific test types
const testType = process.argv[2];
if (testType) {
  const suite = testSuites.find(s => s.name.toLowerCase().includes(testType.toLowerCase()));
  if (suite) {
    runTestSuite(suite).then(passed => {
      process.exit(passed ? 0 : 1);
    });
  } else {
    console.log(chalk.red(`Unknown test type: ${testType}`));
    console.log(chalk.gray('Available types: unit, integration, ux'));
    process.exit(1);
  }
} else {
  runAllTests();
}