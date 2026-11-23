# Install FarsiPlex with an AI assistant

This guide is for an AI assistant helping someone install this repository's community app on their own Samsung Tizen TV. The app requires Tizen 6.5 or later. Version 2.7.0 was installed and launched on a Samsung QN55Q82BAFXZC. Catalog and playback availability depend on upstream providers.

The assistant needs terminal access on the user's computer. The user operates TV settings and completes Samsung account and certificate dialogs.

## A prompt users can copy

> Install FarsiPlex from https://github.com/Saeed-rbh/farsiplex-tizen on my Samsung TV. Read AI_INSTALL.md first. Inspect this computer for Tizen Studio and existing signing profiles, help me enable Developer Mode, and connect to the TV. Build using my Samsung TV certificate, install the widget, and launch FarsiPlex. Preserve my viewing history when updating. Carry out the terminal steps yourself and guide me through TV settings and sign-in steps. Report the actual installation and launch results.

## 1. Inspect the computer

Determine the operating system and find Git, SDB, and the Tizen CLI. Common SDK locations include the user's tizen-studio directory and their chosen SDK installation folder. On Windows, the tools usually end in .exe or .bat. Run the executables through their full paths when necessary.

Run these read-only setup checks.

```sh
sdb devices
tizen security-profiles list
```

If the SDK is missing, guide the user through installing Tizen Studio's Web Application Development tools, Samsung TV Extension, and Samsung Certificate Extension. Use an existing SDK and signing profile when available. Node.js and Playwright support browser tests, while packaging this static web app uses the Tizen CLI. [Samsung SDK setup](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html)

Obtain the TV's current local IP from its network settings or an existing verified connection. Determine this computer's current LAN IPv4 address on the interface that reaches the TV. Explain which address belongs to which device. Values from a previous installation can have changed.

If multiple TVs or profiles are available, ask which target and profile to use. Keep certificate files and passwords on the user's computer. The user completes Samsung sign-in and private certificate entry in the SDK's local dialogs.

## 2. Guide the TV setup

On the TV, open Smart Hub → Apps. Some models expose this under Apps Settings. Enter `12345` with the remote or number keypad. Enable Developer Mode, enter the **computer's LAN IP** in Host PC IP, and restart the TV. Wait for networking to return. Both devices must share a reachable local network. [Samsung TV setup](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)

Connect using the **TV's IP**.

```sh
sdb connect TV_IP:26101
sdb devices
```

Substitute the actual address before running commands. Continue when the intended TV appears with state `device`. Use its serial, such as `TV_IP:26101`, for installation.

A reachable web or remote-control endpoint alone does not establish a developer connection. If SDB rejects the connection, verify the current Host PC IP, TV IP, restart, and network reachability. Restarting the local SDB server can recover a stale bridge. Check for other connected targets first because their developer connections will be interrupted.

## 3. Prepare signing

For a new source installation, use Tools → Certificate Manager → Samsung → TV. The user signs in to Samsung and includes the target TV's DUID in the distributor certificate. Device Manager may expose **Permit to install applications** for the connected TV. Note the resulting profile name. [Samsung certificate setup](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)

For updates, reuse the original author certificate. Samsung requires the same author identity for an update. Uninstalling can erase viewing history and favorites, so obtain the user's agreement before using uninstall as a recovery step. [Samsung update signing requirements](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)

GitHub release assets include the maintainer's signed widget and a checksum. Acceptance on another TV depends on certificate authorization. If a downloaded widget is rejected, build from source using the user's own authorized profile. When an existing installation has a different author, explain that update conflict before changing or removing it.

## 4. Build, install, and launch

Clone into a suitable folder, or use the user's existing checkout.

```sh
git clone https://github.com/Saeed-rbh/farsiplex-tizen.git
cd farsiplex-tizen
bash build.sh YOUR_CERTIFICATE_PROFILE
```

The build produces `dist/FarsiPlex.wgt`. It accepts `TIZEN_CLI` when the executable is outside PATH.

```sh
TIZEN_CLI="/path/to/tizen-studio/tools/ide/bin/tizen" \
  bash build.sh YOUR_CERTIFICATE_PROFILE
```

Install and launch using the connected serial. Substitute the actual TV IP and certificate profile in every command.

```sh
tizen install -s TV_IP:26101 -n FarsiPlex.wgt -- dist
tizen run -s TV_IP:26101 -p FarsiPlex1.FarsiPlex
```

On Windows without Bash, run equivalent packaging commands from the repository root. Create the output directory first.

```powershell
New-Item -ItemType Directory -Force dist
tizen package -t wgt -s YOUR_CERTIFICATE_PROFILE -o dist -- app
tizen install -s TV_IP:26101 -n FarsiPlex.wgt -- dist
tizen run -s TV_IP:26101 -p FarsiPlex1.FarsiPlex
```

For a downloaded release widget, substitute its exact filename and directory in the installation command. On macOS/Linux, use `shasum -a 256` to calculate its checksum. On Windows, use `Get-FileHash -Algorithm SHA256`. Compare with the release's `SHA256SUMS.txt`.

## 5. Verify and guide the user

Wait for installation success, then wait for the launch result. Confirm the application ID is `FarsiPlex1.FarsiPlex`. Report the version and distinguish installer/launcher confirmation from on-screen playback testing.

Guide the user to check the home screen, open a title, and try playback. Explain the remote controls in the README. For playback failures, try another listed quality or source while retaining saved progress.

For installation failures, record the actual error and repair that stage. Common causes are a disconnected target, a distributor certificate missing this TV's DUID, installation permission, and an author mismatch. Retry installation and launch after repair. If a physical action is needed, identify that action and resume after the user completes it.
