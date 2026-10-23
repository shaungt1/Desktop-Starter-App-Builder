# Prompt: create a new app (base not decided)

**Purpose.** Have the agent choose the base with the builder's decision rule,
then create, verify and hand off the app.

```text
Read AGENT_START.md and follow its required sequence exactly.

The app: [what it does and for whom]
Name: [display name]   App id: [reverse DNS]   Target folder: [full or relative path outside this repo]
Proof of concept or long-lived product: [which]   Expected size: [screens, integrations, team]
Hosted web app to reuse: [URL or "none"]   Must work offline: [yes/no]
Native needs: [files, database, background work, sign-in, updates, devices...]
Also Android / iOS: [no / android / ios / both]
Frontend: [vite / nextjs / decide for me]   Look: [shadcn / konsta ios / konsta material / decide for me]
Package manager: [bun / npm]
Size or memory requirements: [if any]

First run `bash start.sh doctor --base <base>` and tell me what is missing; ask
before running `bash start.sh bootstrap` to install it (Git Bash on Windows).
Apply docs/CHOOSING_A_BASE.md and tell me the base, profile, frontend and
interface kit with the rule that decided them, plus the modules you propose. Then write the plan, run
`plan check`, and wait for my approval before `create`. Do not publish, sign or
push anything. Finish with the hand-off report.
```
