---
name: desktop-host-check
description: Check that the machine has the tools a base needs before generating or building. Use before the first `create` on a machine, or when a build fails for a missing tool.
---

# Host Check

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Steps
1. Run `bash start.sh doctor --base <electron|tauri>` from the builder root (inside a generated app: `bun run doctor` or `npm run doctor`). Add `--mobile` for Android/iOS targets and `--e2e` for end-to-end test drivers.
2. For every `missing` or `too old` line marked required, report the exact `fix:` line to the user.
3. Do not install system software (compilers, SDKs, system packages) without the user's approval; Bun packages inside the builder are fine. With approval, show the plan with `bash start.sh bootstrap --base <base> --dry-run` (in a generated app: `bash scripts/bootstrap.sh --dry-run`); it detects Windows (Git Bash, winget), macOS or Linux. Then run it without `--dry-run`.
4. For anything the scripts print as a manual step (for example Android Studio on Linux), point the user to `docs/SETUP_RESOURCES.md`.
5. After installation, re-run `doctor` to confirm.

## Done when
`doctor --base <base>` exits successfully.
