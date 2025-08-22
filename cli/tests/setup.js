// Global test setup
const fs = require('fs-extra');
const path = require('path');

// Clean up test directories before each test run
beforeAll(() => {
  const testDirs = [
    path.join(__dirname, 'fixtures'),
    path.join(process.env.HOME, '.appsec-gym-test')
  ];
  
  testDirs.forEach(dir => {
    try {
      fs.removeSync(dir);
      fs.ensureDirSync(dir);
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});

// Increase timeout for slower operations
jest.setTimeout(10000);