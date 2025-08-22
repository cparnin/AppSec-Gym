<div align="center">
<img width="500" height="500" alt="AppSecGym" src="https://github.com/user-attachments/assets/e62adbd4-7656-48c3-b40d-236a72010afc" />

**Interactive CLI training gym for application security vulnerabilities**

*Hands-on practice fixing real security vulnerabilities through interactive challenges*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

</div>

## What is AppSec Gym?

AppSec Gym is a **command-line training game** where you practice fixing real security vulnerabilities in actual code. Think of it as "Wordle for Security" - you get vulnerable code snippets and fix them using your favorite editor.

### Not Another Security Quiz!
- **Fix real code, not take quizzes** - Practice on actual vulnerable code files
- **Use your favorite editor** - VS Code, Vim, whatever you like  
- **Learn by doing** - Fix the vulnerability, run tests, see if you got it right
- **Community challenges via GitHub** - Anyone can contribute new vulnerabilities

## How It Works

```bash
# Just run with no arguments for interactive mode:
$ appsec-gym

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

## Quick Start

```bash
# Install (coming soon to npm)
npm install -g appsec-gym

# Start training
appsec-gym start

# For now, test locally:
git clone https://github.com/cparnin/AppSec-Gym.git
cd AppSec-Gym/cli
npm install
node src/index.js --help
```

## Current Status

**Under Active Development**

- CLI foundation with basic commands
- Project structure for community contributions  
- Creating first OWASP Top 10 challenges
- Planned: SQL injection, XSS, authentication flaws, and more

**Want to contribute?** We'd love your help! Check out [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new challenges.

## Commands

**Interactive Mode** (default): Just run `appsec-gym`

**Direct Commands** (for power users):
- `appsec-gym start` - Start/resume training
- `appsec-gym check` - Check your solution
- `appsec-gym hint` - Get a hint
- `appsec-gym list` - Browse challenges
- `appsec-gym progress` - View stats

## Planned Challenge Categories

### OWASP Top 10 (2021)
- [ ] A01: Broken Access Control
- [ ] A02: Cryptographic Failures  
- [ ] A03: Injection (SQL, NoSQL, LDAP)
- [ ] A07: Cross-Site Scripting (XSS)
- [ ] A08: Software Data Integrity Failures
- [ ] A10: Server-Side Request Forgery

### Real-World Scenarios
- [ ] JWT vulnerabilities
- [ ] API security issues
- [ ] Container security misconfigurations
- [ ] CI/CD pipeline security

## Contributing

We welcome contributions! Whether you're:
- Reporting bugs
- Suggesting new challenge ideas  
- Writing new vulnerability challenges
- Improving documentation

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## Project Structure

```
appsec-gym/
├── cli/           # Node.js CLI application
├── challenges/    # Vulnerability challenges (community contributions welcome!)
├── web/          # Optional web interface (future)
├── docs/         # Documentation and guides
└── README.md     # You are here
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

**Star this repo** if you're interested in interactive security training!

**Follow the project** for updates on new vulnerability challenges and features.
