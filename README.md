<div align="center">
<img width="500" height="500" alt="AppSecGym" src="https://github.com/user-attachments/assets/e62adbd4-7656-48c3-b40d-236a72010afc" />

**Interactive CLI training for application security vulnerabilities**

Practice fixing real security issues in actual code

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

</div>

## What is AppSec Gym?

AppSec Gym is a command-line training tool where you practice fixing real security vulnerabilities in actual code using your favorite editor.

### Not Another Security Quiz!
- **Fix real code, not take quizzes** - Practice on actual vulnerable code files
- **Use your favorite editor** - VS Code, Vim, whatever you like
- **Learn by doing** - Fix the vulnerability, run tests, see if you got it right
- **Real vulnerability scenarios** - Practice on actual security issues

## Installation & Usage

```bash
# Clone and install
git clone https://github.com/cparnin/AppSec-Gym.git
cd AppSec-Gym/cli
npm install

# Start training (interactive mode)
node src/index.js

# Or use direct commands
node src/index.js list                    # See available challenges
node src/index.js start sql-injection-basic  # Start specific challenge
node src/index.js check                   # Validate your fix
node src/index.js hint                    # Get help
```

## How It Works

Once installed, running `node src/index.js` launches the interactive menu:

```
╔════════════════════════════════════════╗
║        🏋️  AppSec Gym v0.1.0         ║
║      Security Training That Works      ║
╚════════════════════════════════════════╝

Current Challenge: SQL Injection #1
Status: Not started

What would you like to do?
> Start this challenge
  Get a hint  
  Browse all challenges
  View your progress
  Exit
```

The interactive menu guides you through everything - no commands to memorize!

## Current Status

**Complete Training Platform**

- Full CLI with all essential commands
- 4 comprehensive OWASP Top 10 challenges
- Advanced security validation system
- Interactive learning with hints and feedback

## Commands

**Interactive Mode** (default): `node src/index.js`

**Direct Commands**:
- `node src/index.js start` - Start/resume training
- `node src/index.js check` - Check your solution  
- `node src/index.js hint` - Get a hint
- `node src/index.js list` - Browse challenges
- `node src/index.js progress` - View stats
- `node src/index.js status` - Show current challenge
- `node src/index.js reset` - Reset all progress

## Available Challenges

### OWASP Top 10 Security Issues
- [x] **SQL Injection** - Login system with database query vulnerabilities
- [x] **Stored XSS** - Comment system with script injection issues
- [x] **JWT Authentication** - Multiple authentication security flaws
- [x] **Path Traversal** - File server with directory traversal bugs

Each challenge includes:
- Real vulnerable code to fix
- Progressive hints system
- Automated security validation
- Detailed feedback and scoring

## Project Structure

```
appsec-gym/
├── cli/           # Node.js CLI application (main package)
├── challenges/    # Vulnerability challenges (community contributions welcome!)
├── web/          # Optional web interface (future)
├── docs/         # Documentation and guides
└── README.md     # You are here
```

**Note**: The main application is in the `cli/` directory with its own package.json and dependencies.

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

A complete interactive security training platform for developers.
