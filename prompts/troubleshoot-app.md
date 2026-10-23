# Prompt: troubleshoot a generated app

```text
The app at [absolute path] fails: [paste the command and the error output].

Read the app's AGENTS.md and the builder's docs/TROUBLESHOOTING.md. Reproduce
the failure with the exact command, find the cause before changing anything,
and explain it in two or three sentences. Then make the smallest fix, re-run
the failing command and `bun run verify`, and report what changed. Do not
weaken security settings or delete tests to make a failure disappear.
```
