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

## Testing

```bash
# Run tests
npm test

# Development mode with auto-reload
npm run dev
```

## Project Structure

```
cli/
├── src/
│   ├── index.js          # Main entry point
│   ├── commands/         # Individual command handlers
│   ├── core/            
│   │   ├── challengeManager.js  # Challenge loading/validation
│   │   └── progressTracker.js   # User progress tracking
│   └── utils/
│       └── menu.js              # Interactive menu system
├── package.json
└── README.md
```