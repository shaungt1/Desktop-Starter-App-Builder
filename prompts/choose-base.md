# Prompt: choose the base, profile and modules

**Purpose.** Get a justified recommendation before anything is generated.

```text
Read docs/CHOOSING_A_BASE.md and docs/MODULES.md in this repository. Do not
run `create`.

Here is the app I want to build: [describe what it does, who uses it, which
operating systems, whether a web version already exists and where it is
hosted, whether it must work offline, what it must do on the user's machine
(files, database, background work, devices), sign-in needs, update needs,
and any size or performance requirement].

Tell me: (1) desktop app (Electron or Tauri) or browser extension, and then which
base, naming the decision rule from CHOOSING_A_BASE.md that decides it; (2) the profile (native, remote or
exported; an extension has one) and why; (3) every module that fits, each with one sentence on why,
and any module I might expect that does not exist; (4) the decisions you still
need from me. Label your recommendation as non-binding and list every option
you considered.
```
