# FarsiPlex for Samsung TV

An unofficial community app for browsing FarsiPlex on Samsung Smart TVs running Tizen 6.5 or later. Browse movies and series with the remote, search the catalog, follow shows, and resume playback. Catalog and playback availability depend on the upstream services.

## Version 2.8.0

Cards, typography, spacing and animations now share 30nama's design structure in FarsiPlex blue. Home uses 200×300 portrait posters, generous focus clearance and aligned text. Catalogs use seven columns with matching portrait proportions. Landscape cards have inset progress bars and gradient captions.

The app uses Vazirmatn with distinct heading, label and metadata weights. Rounded focus rings work on the TV's older Chromium engine. Carousels animate as a single strip and continue from their current visual position when navigation reverses. Artwork fades in, and reduced motion uses immediate navigation.

Version 2.8.0 passed all 24 browser regression programs on Chromium 85 and 13 production-screen checks. It was installed and launched successfully on a Samsung QN55Q82BAFXZC. Physical TV animation smoothness and playback were not measured by these checks.

[Download the release](https://github.com/Saeed-rbh/farsiplex-tizen/releases/tag/v2.8.0). The signed widget's acceptance on another TV depends on certificate authorization. Follow the source-install steps below to build with your own Samsung TV certificate.

## Ask your AI assistant to install it

Give an AI assistant with terminal access this prompt.

> Install FarsiPlex from https://github.com/Saeed-rbh/farsiplex-tizen on my Samsung TV. Read AI_INSTALL.md, inspect my Tizen Studio setup and signing profiles, guide me through Developer Mode, then build, install and launch the app. Use my actual network addresses and preserve viewing history during updates.

The [AI installation guide](AI_INSTALL.md) explains the terminal steps the assistant can perform, the TV and sign-in steps that need the user, certificate requirements, and connection recovery.

## Install it on your TV

### 1. Set up Tizen Studio

Install Tizen Studio on your computer. In Package Manager, install the Web Application Development tools, the Samsung TV Extension, and the Samsung Certificate Extension. Connect the computer and TV to the same local network. [Samsung TV SDK setup](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/installing-tv-sdk.html)

Download this repository with **Code → Download ZIP**, then extract it. If you have Git, you can also run:

```sh
git clone https://github.com/Saeed-rbh/farsiplex-tizen.git
cd farsiplex-tizen
```

### 2. Enable Developer Mode and connect the TV

1. Open **Apps** from the TV's Smart Hub and enter **12345** with the remote or on-screen keypad. Depending on the model, you may need to open **Apps Settings** first.
2. Set **Developer Mode** to **On**, enter your **computer's local IP address**, and restart the TV.
3. In Tizen Studio, open **Tools → Device Manager → Remote Device Manager**. Add the **TV's IP address**, keep the default port **26101**, and turn the connection on.
4. In a terminal, run `sdb devices` and note the connected TV's name in the last column. If `sdb` is missing from your PATH, use the executable in the SDK's `tools` directory.

[Samsung's TV connection guide](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/tv-device.html)

### 3. Create a signing profile

In Tizen Studio, open **Tools → Certificate Manager**. Create a **Samsung → TV** profile, sign in to your Samsung account, and include your connected TV's device ID (DUID) in the distributor certificate. Give the profile a name such as `farsiplex-tv`. Keep a backup of your author certificate for future updates. [Samsung's certificate guide](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)

### 4. Build and install

Run these commands from the extracted or cloned project folder. Replace `TV_TARGET` with the name shown by `sdb devices`, and replace `farsiplex-tv` if you chose a different certificate profile name.

```sh
bash build.sh farsiplex-tv
tizen install -n FarsiPlex.wgt -t TV_TARGET -- dist
tizen run -p FarsiPlex1.FarsiPlex -t TV_TARGET
```

If the terminal cannot find `tizen`, add the SDK's `tools/ide/bin` directory to your PATH. The build script also accepts the full executable path in `TIZEN_CLI`.

If you use Windows without Bash, open Command Prompt or PowerShell in the `app` folder and run the Tizen CLI directly:

```powershell
tizen package -t wgt -s farsiplex-tv -- .
tizen install -n FarsiPlex.wgt -t TV_TARGET -- .
tizen run -p FarsiPlex1.FarsiPlex -t TV_TARGET
```

### Troubleshooting

- **The TV is missing from Device Manager.** Confirm the TV and computer are on the same network, Developer Mode has your computer's IP address, and the TV has restarted. Recheck the TV's current IP address.
- **The TV rejects the package.** Confirm you signed with a Samsung TV profile that includes this TV's DUID. In Device Manager, right-click the connected TV and select **Permit to install applications** if that option appears. Rebuild the widget after changing certificates.
- **An existing install rejects the update.** Updates need the same author certificate as the previous installation. Reuse that certificate if you want to preserve viewing history and favorites. Uninstalling the app can erase that data.

## Remote controls

| Control | Action |
|---|---|
| Arrows and OK | Browse and open focused items |
| Return / Back | Close a popup, return to the previous screen, or open exit confirmation |
| Play/Pause while browsing | Open or close the navigation menu |
| OK or Play/Pause during playback | Toggle playback |
| Left / Right during playback | Seek 10 seconds |
| Up during episode playback | Open the episode picker |
| Down during playback | Focus playback controls |
| Stop | Close playback and return to browsing |

## Run the browser regression tests

With Node.js 20 or later, run:

```sh
npm ci
npx playwright install chromium
npm test
```

Set `CHROME_PATH` to a Chromium executable to test against a specific browser. The browser suite uses mocked providers and Samsung playback APIs. Check actual playback and remote behavior on the target TV.

App code is licensed under [MIT](LICENSE.txt). The bundled Vazirmatn font has its [own license](app/fonts/OFL.txt). Brand assets are outside the app code license.
