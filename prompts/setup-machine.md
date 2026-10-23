# Prompt: prepare this machine

**Purpose.** Have an agent check a computer against the builder's requirements and
install whatever is missing, with your approval at each step. Use it the first time
you (or another developer) use this repository on a machine, or when a build fails
because a tool is missing.

**How to use.** Open the builder folder in your editor, start your agent there, fill
in the brackets and paste. On Windows the agent should use Git Bash.

```text
Read AGENT_START.md, then docs/REQUIREMENTS.md, and prepare this machine.

Base(s) I will use: [electron | tauri | extension | several | not sure, ask me]
Android or iOS apps (Tauri only): [no | android | ios | both]
End-to-end tests: [yes | no]
Package manager for new projects: [bun | npm]

Follow these steps and report each result:
1. Run the read-only check: `bash start.sh doctor --base <base>` (add `--e2e`
   and/or `--mobile` if I said yes). If `bun` itself is not found, stop and tell
   me how to install Bun from docs/REQUIREMENTS.md, because the builder needs it.
2. List every line that is `missing` or `too old` with the fix it printed.
3. Show me the install plan: `bash start.sh bootstrap --base <base> --dry-run`
   (plus the same flags). Explain anything that needs administrator rights, a
   Windows permission prompt, a restart, or a manual step.
4. Wait for my approval. Then run the same command without `--dry-run`. Never
   install anything I did not approve. If Node.js comes from a version manager
   (nvm, fnm, Volta), use the manager instead of installing a second Node.js.
5. Open a new terminal if tools were installed (they may not be on the PATH
   yet), run `doctor` again, and confirm it ends with "All required tools are
   present."
6. Tell me which accounts or credentials I will need later to sign and publish
   (docs/REQUIREMENTS.md, "What you need to ship"). Do not create, request or
   store any credential.

Do not create a project, commit, push, sign or publish anything in this task.
```
