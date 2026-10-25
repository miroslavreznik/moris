# Moris HTTPS deployment

Status: local release prepared; the user explicitly approved the private OpenAI Sites source upload and deployment on October 25, 2026. Publication is proceeding with the existing registered project.

## Selected destination

- Hosting provider: OpenAI Sites.
- Audience: private, owner-only. No invitations or sharing changes have been made.
- Registered project ID: `appgprj_6ade4dba1b348191bf2a58c3d1540816`.
- Reserved origin: `https://moris-habit-club.miroslavreznik.chatgpt.site`.
- This is an expected URL, **not evidence of a live deployment**.
- Source repository: `https://git.chatgpt-team.site/5a4aa536-9fc4-43e4-a5cf-f6faa150c533/appgprj_6ade4dba1b348191bf2a58c3d1540816.git`, branch `main`.

The private hosting gate is separate from Moris, which has no application account system. Phone testing may require signing into the owner's ChatGPT account at the hosting gate. The eventual no-login public release needs an explicit audience decision.

## Prepared source and artifact

The canonical app remains at the project root. `node scripts/prepare-hosting.mjs` copies a restricted source allowlist into `sites/moris`, verifies the source/public trees by SHA-256 inventory, and preserves the registered project identity. It excludes personal habit databases, exported backups, browser profiles, test outputs, local dependencies, credentials, and the uploaded PRD.

The private source copy includes application code, tests, public assets, package files, relevant documentation, and the non-secret hosting manifest. The original project has not been moved or replaced.

The locally packaged static deployment archive is `deployment-artifacts/moris-beta.tar.gz`. It contains the compiled app and hosting metadata. A final archive must be generated from the exact pushed source commit through the Sites source workflow before saving/deploying a version.

`public/_headers` requests fresh checks for `index.html`, `sw.js`, and the manifest; hashed assets use immutable caching. These rules must be checked on the actual host after deployment. Local files alone do not prove remote header behavior.

## Approval boundary

Automatic approval review rejected the command that would start the Sites source workflow and push to the private source repository. Its stated reason was that general HTTPS deployment authorization did not explicitly approve this particular destination or source-code upload. The rejection was respected. The user subsequently explicitly approved OpenAI Sites and instructed the upload and deployment to proceed.

Authorized publication procedure:

1. Reuse `.openai/hosting.json` and the existing project ID; do not create another Site.
2. Refresh the short-lived source credential for this project if needed. Keep it in session memory and supply it only through the source helper's hidden stdin.
3. Sync the current canonical source, then use the source helper to build, commit/push, and package that exact source state.
4. Use the returned commit SHA and archive with the native private save-and-deploy tool. Preserve owner-only access.
5. Follow the returned deployment until a terminal status, then report the actual live URL.
6. Verify hosted manifest/icons/headers, service-worker scope, a clean launch, offline reopen, and data persistence after an app update. Do not manufacture an authentication bypass for testing.
7. Perform the physical iPhone/Android checks listed in `docs/qa.md`.
