# FarsiPlex installation assistance

When a user asks to install this app, read [AI_INSTALL.md](AI_INSTALL.md) and follow its computer, TV, certificate, connection, build, installation and verification steps.

Use the target user's actual network addresses, SDK paths and signing profile. Obtain evidence from command results before reporting installation or launch success. Preserve viewing data during updates, and explain any certificate mismatch before proposing removal.

The production app is under `app/`. `bash build.sh CERTIFICATE_PROFILE` creates `dist/FarsiPlex.wgt`. The application ID is `FarsiPlex1.FarsiPlex`.

For code changes, `npm ci`, `npx playwright install chromium`, and `npm test` run the existing browser regression suite. Set `CHROME_PATH` to test with a specific Chromium executable.
