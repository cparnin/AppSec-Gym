# AppSec Gym CLI

## Quick Development Setup

```bash
# From the cli directory:
npm install

# Run interactive mode
node src/index.js

# Or create an alias for easier use:
alias appsec-gym="node $(pwd)/src/index.js"

# Now you can use:
appsec-gym
appsec-gym list
appsec-gym start
```

## Project Structure

```
cli/
├── src/
│   ├── index.js          # Main entry point
│   ├── core/            
│   │   ├── challengeManager.js  # Challenge loading/validation
│   │   └── progressTracker.js   # User progress tracking
│   └── utils/
│       ├── menu.js              # Interactive menu system
│       └── editor.js            # VS Code/Vim integration
├── tests/
│   ├── unit/            # Core functionality tests
│   ├── integration/     # CLI command tests  
│   ├── ux/             # User experience tests
│   └── run-tests.js    # Test runner
├── package.json
├── jest.config.js
└── README.md
```

## Testing

```bash
# Run all tests
npm test

# Run specific test types  
npm run test:unit
npm run test:integration
npm run test:ux
```
