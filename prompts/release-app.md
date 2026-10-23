# Prompt: prepare a release

```text
Read docs/RELEASE_AND_SIGNING.md in the builder and AGENTS.md in the app at
[absolute path].

1. Increase the version to [x.y.z] everywhere the release checklist lists.
2. Run `bun run verify` and `bun run test:e2e` in the app and fix any failure.
3. Check which signing variables are present for [platforms] and tell me which
   are missing; do not ask me to paste secrets into the chat.
4. Run `bash start.sh release [app path]` (without --publish) and list the
   installer files it produced with their sizes.
5. Stop. Publishing requires my explicit approval for this release.
```
