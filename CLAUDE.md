# AppSec Gym - Project Reference

## Project Vision
Build the "Super Bowl of AppSec Training" - first major open source project designed for viral community adoption. Think "Rustlings for Security" - a CLI-first training gym where developers practice fixing real vulnerabilities.

## Success Metrics for Open Source
- GitHub stars (target: 10k+ in first year)
- Community contributors (target: 50+ contributors)
- Developer word-of-mouth adoption
- Conference talks and blog posts about it
- Companies using it for internal training

## Core Philosophy
- Free forever, open source
- Easy for community to contribute new vulnerabilities
- Works offline (no hosting dependencies)
- Respects developer workflow (CLI-first)
- Polyglot support (any programming language)

## Final Architecture Decision
**CLI-First + Optional Web**: Local execution, git-based content

```
📦 appsec-gym/
├── 📁 cli/           # Node.js CLI tool  
├── 📁 challenges/    # Git-based challenge content
├── 📁 web/          # Optional React web interface
└── 📁 docs/         # GitHub Pages documentation
```

**Developer Experience:**
```bash
npm install -g appsec-gym
appsec-gym warmup     # Start with easy challenges
appsec-gym workout sql # Focus on SQL injection
appsec-gym check      # Validate current solution
appsec-gym next       # Move to next challenge
```

## Key Open Source Requirements
- Simple contributor onboarding (good CONTRIBUTING.md)
- Standardized vulnerability format (YAML/JSON templates)
- Automated testing for community PRs
- Clear code of conduct and governance
- Beginner-friendly first issues

## Technical Constraints
- Solo maintainer initially
- Must be maintainable long-term
- Zero ongoing hosting costs preferred
- Easy local development setup

## Content Strategy
- Start with OWASP Top 10 core challenges
- Create template system for easy vulnerability addition
- Progressive difficulty with clear learning paths
- Focus on practical, real-world scenarios
- Multiple programming languages supported

## Community Strategy
- Launch with 5-10 solid challenges
- Document contribution process clearly
- Engage security Twitter/LinkedIn
- Present at local meetups/conferences
- Create "good first issue" challenges for contributors

## Style Guidelines
- Use emojis selectively - avoid looking too immature or AI-generated
- Professional tone while remaining approachable
- Focus on developer-friendly language