---
name: desktop-handoff
description: Write the final report after generating or changing an app. Use at the end of every builder task.
---

# Handoff

This skill belongs to Desktop Starter App Builder. `AGENT_START.md` in the builder root is the authority; if this skill and that file disagree, follow `AGENT_START.md`.

## Report, in this order
1. Plan file path and target path.
2. Base, profile and modules (including ones added automatically).
3. Every command run, with its result (pass, fail, not run and why).
4. Manual steps the user must complete, per module.
5. Anything that could not be verified, stated plainly.
6. Next step, if there is a real one.

## Rules
Report only what happened. Do not claim a check passed unless it ran and passed.
