# 🏋️ AppSec Gym

> **Interactive CLI training gym for application security vulnerabilities**
> 
> *Hands-on practice fixing real security vulnerabilities through interactive challenges*

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

## What is AppSec Gym?

AppSec Gym is a **command-line training platform** where developers practice identifying and fixing real application security vulnerabilities. Each "workout" is a hands-on coding challenge based on OWASP Top 10 and real-world security issues.

### Why CLI-First?
- **Zero setup** - Works offline, no browser required  
- **Developer-friendly** - Integrates with your existing workflow
- **Git-based content** - Easy for community to contribute new challenges
- **Simple distribution** - One npm install, works everywhere

## Quick Start

```bash
# Install globally
npm install -g appsec-gym

# Start training
appsec-gym warmup

# Focus on specific vulnerabilities  
appsec-gym workout sql
appsec-gym workout xss

# Check your solution
appsec-gym check

# Track progress
appsec-gym progress
```

## Current Status

**Under Active Development**

- CLI foundation with basic commands
- Project structure for community contributions  
- Creating first OWASP Top 10 challenges
- Planned: SQL injection, XSS, authentication flaws, and more

**Want to contribute?** We'd love your help! Check out [CONTRIBUTING.md](CONTRIBUTING.md) for how to add new challenges.

## Available Commands

| Command | Description |
|---------|-------------|
| `warmup` | Start with beginner-friendly challenges |
| `workout <type>` | Focus on specific vulnerability (sql, xss, auth) |
| `check` | Validate your current solution |
| `next` | Move to next challenge |
| `progress` | Show training progress and achievements |

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