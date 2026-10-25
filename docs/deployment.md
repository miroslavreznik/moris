# Moris HTTPS deployment

Status: privately deployed over HTTPS on October 25, 2026. The native Sites deployment returned succeeded. Authenticated hosted-app checks and physical-device tests remain pending sign-in/device access.

## Selected destination

- Hosting provider: OpenAI Sites.
- Audience: private, owner-only. No invitations or sharing changes have been made.
- Registered project ID: `appgprj_6ade4dba1b348191bf2a58c3d1540816`.
- Live origin: `https://moris-habit-club.miroslavreznik.chatgpt.site`.
- Successful deployment: `appgdep_6ade534d91148191a3d6d39a82350ed5`.
- Saved version: `appgprj_6ade4dba1b348191bf2a58c3d1540816~appgver_db685858f89c8191a8cb2f72613ccc5a`.
- Published source commit: `051d80fe730ee25bf482ea04e45b325a8a4005a1`.
- Full native deployment receipt: `deployment-artifacts/live-deployment.json` (ignored local artifact).
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

## Hosted verification

The native save-and-deploy operation confirmed success and returned the live HTTPS URL. The existing in-app browser was navigated to the origin and reached the private ChatGPT sign-in flow. It currently requires the owner to complete password sign-in; no credentials were read or entered.

Unauthenticated HEAD requests to `/`, `/manifest.webmanifest`, `/sw.js`, and `/icon-192.png` returned HTTP 401 with `Cache-Control: no-store`, consistent with the owner-private gate. This verifies HTTPS reachability and the gate, not the authenticated app resources or their cache headers. No authentication bypass was created or used.

Physical installation, authenticated manifest/service-worker responses, hosted offline restart, and installed-app update persistence still need verification after sign-in on the actual phones. The existing local production tests remain the available evidence for those app flows.
