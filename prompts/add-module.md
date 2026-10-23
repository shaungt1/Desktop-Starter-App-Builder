# Prompt: add a module to a generated app

```text
Read AGENT_START.md. In the app at [absolute path], add the [module id] module.

First run `bash start.sh module show [module id]` and tell me its required
options and manual steps. Collect any option values from me, then run
`bash start.sh module add [module id] [app path] --option key=value ...`.
It installs and verifies the app; if verification fails, diagnose and fix
before reporting. Then list the manual steps I must complete outside the code.
Never copy module files by hand.
```
