# SOL STRENGTH

**Version 1.0 · Private, offline-first strength-training PWA · $0**

A complete, dependency-free iPhone-friendly workout app. It logs each working set, stores history on your device, calculates PRs and estimated 1RMs, follows your seven-day split, and moves into classic three-week Jim Wendler 5/3/1 after a 14-day baseline.

No Apple Developer account, app store, login, API keys, paid hosting, subscriptions, external JavaScript, tracking scripts, or custom domain are needed.

## Architecture

- `index.html` — mobile app shell, manifest connection, five navigation tabs.
- `styles.css` — dark iPhone-first interface with neon-green accents and safe-area padding.
- `app.js` — full application, workout program, 5/3/1 engine, records, timer, backup, persistence, validation.
- `sw.js` — service worker that precaches all eight app assets and serves an offline shell.
- `manifest.webmanifest` — standalone iPhone PWA settings.
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` — installable app icons.
- `tests/` — optional automated logic and Chromium mobile-layout tests (not needed to run the app).

**Storage:** IndexedDB first, with an automatic localStorage mirror/fallback. Training data never gets uploaded by the app. GitHub Pages serves the static code only. The app attempts to request persistent browser storage if supported, but no browser guarantees data will never be cleared.

## Install for free using GitHub Pages

### 1 — Download and unzip

Download `SOL-STRENGTH.zip` from the ChatGPT response. Open the ZIP, and **extract its contents** into a folder on your computer. The uploadable files are:

```
index.html
styles.css
app.js
sw.js
manifest.webmanifest
icon-192.png
icon-512.png
apple-touch-icon.png
README.md                         (optional)
```

The `tests` folder is optional and does not need to be uploaded. Do **not** upload the ZIP itself. All eight app files must be directly at the root of the repository, not inside a `sol-strength` folder.

### 2 — Create a free GitHub account

1. Open https://github.com/signup on your computer.
2. Sign up for a **free** account and verify your email address if asked.
3. Log in at https://github.com/.

### 3 — Create the repository

1. Open https://github.com/new, or use the **+** menu in GitHub and choose **New repository**.
2. Enter repository name: **`sol-strength`** (lowercase with a hyphen).
3. Choose **Public**. GitHub Pages hosting of a public repo works with GitHub Free. **Only the application code will be public; your workout entries remain in your iPhone's local storage.**
4. Click **Create repository**. It is fine to leave the README initialization option unchecked.

### 4 — Upload files to the root of the repository

1. On the empty repository screen, select **uploading an existing file**. On a nonempty repository, use **Add file → Upload files**.
2. Drag all eight app files listed in Step 1 (not the parent folder and not the ZIP) into the upload box. You can add `README.md` as well.
3. Enter a commit message such as `Initial SOL STRENGTH app`.
4. Click **Commit changes**.
5. Confirm the repository file list shows **`index.html` in the top level** beside `app.js`, `styles.css`, etc.

### 5 — Turn on free GitHub Pages

1. In that repository, click **Settings**.
2. In the left menu under **Code and automation**, click **Pages**.
3. Under **Build and deployment → Source**, select **Deploy from a branch**.
4. Set **Branch** to `main` and **Folder** to `/(root)`.
5. Click **Save**.
6. Once GitHub publishes it, the Pages section displays a **Visit site** link. Publishing can take a short while.

Your URL will look like:

**`https://YOUR-GITHUB-USERNAME.github.io/sol-strength/`**

Replace `YOUR-GITHUB-USERNAME` with your exact account name. If your repository has a different name, use that exact repository name in the URL. You do not need a custom domain.

### 6 — Install SOL STRENGTH from Safari on iPhone

1. On your iPhone, open **Safari** (not a browser inside another app).
2. Visit your published GitHub Pages URL.
3. Tap Safari's **Share** control. On recent iOS versions, you may tap the **More (`…`)** button first, then **Share**.
4. Scroll to **Add to Home Screen**. If missing, tap **Edit Actions** to add it.
5. Verify the name is **SOL STRENGTH** and turn **Open as Web App** on if that switch is shown.
6. Tap **Add**.
7. Go to your Home Screen and open the new **SOL STRENGTH** icon. It should open in its own fullscreen-style window.
8. In the **installed Home Screen app**, open **Settings** and check your program start date, weight unit, and rest timer.

**Important:** iOS Home Screen web apps generally use storage that is **separate from the Safari tab**. For this reason, **install the app first and do your actual logging from its Home Screen icon**. If you had previously entered workouts in Safari, export a JSON backup from Safari and import it inside the newly installed Home Screen app.

### 7 — Confirm offline access

1. Open SOL STRENGTH from the Home Screen **while online**. Let it finish loading so its service worker can install and cache the app.
2. Close the Home Screen app, then put your phone in **Airplane Mode** and also make sure Wi-Fi is disabled.
3. Reopen SOL STRENGTH from its Home Screen icon. The shell should load from its offline cache, and previously stored workouts should still be accessible.
4. Add a test set offline and then reopen it to confirm it persists.
5. If the first offline attempt fails, reconnect, open the installed app again, then repeat the test. Cache installation must complete at least once online.

The app does not sync across devices. Offline use depends on iOS keeping the app's browser data and service-worker cache.

## How the plan works

### Exact seven-day rotation

| Day | Session | Working sets |
|---|---|---:|
| 1 | Chest & Arms | 19 |
| 2 | Legs & Back | 20 |
| 3 | Recovery | — |
| 4 | Shoulders, Chest & Arms | 21 |
| 5 | Quad-Focused Legs | 17 |
| 6 | Back & Arms | 15 |
| 7 | Recovery | — |

Your repeated bicep sessions are preserved, and reverse pec deck is labeled for rear delts. Day 5 includes **2 × 60-second dead hangs**, logged in seconds.

### Days 1–14: baseline phase

Day 1 is your chosen **Program start date**. For the first 14 *calendar* days (two full seven-day rotations), the four primary lifts use the original rep ranges rather than percentages. Log your working weights and actual reps without testing true maxes.

### From Day 15: classic 5/3/1

The four percentage lifts are **Bench Press, Deadlift, Overhead Press, and Squat**.

| Week | Working set 1 | Working set 2 | Working set 3 |
|---|---|---|---|
| 1 | 65% × 5 | 75% × 5 | 85% × 5+ |
| 2 | 70% × 3 | 80% × 3 | 90% × 3+ |
| 3 | 75% × 5 | 85% × 3 | 95% × 1+ |

`+` = an AMRAP set (as many quality reps as appropriate). All percentages use your **training max**, *not* your actual 1RM. A cycle is three weeks, then the pattern repeats. No Boring But Big (BBB) sets or automatic deload week are added.

**Baseline suggestions:** Once you have baseline working sets recorded, open **Settings → 5/3/1 training maxes → Use baseline suggestions**. The app estimates 1RM using the Epley equation for recorded sets of 1–12 reps and proposes **90% of the best estimate**, rounded to your current load increment. Review the suggestions; they are not guaranteed or a requirement to lift heavier. You can also enter training maxes manually.

**Future cycles:** In Settings, choose **Effective cycle**, enter your lift training maxes, then **Save training maxes**. Future cycles inherit prior values until you update them. Already created workout sessions preserve their originally prescribed target weights. The percentage template itself is editable in **Settings → Edit 5/3/1 template**.

## Workout logging

- **Workout:** choose a date; enter weight/reps for each set; record dead hangs in seconds; tap the check mark to finish a set; write notes; complete or reopen the session.
- **Program:** review all seven days and their prescribed sets and ranges.
- **History:** open any saved workout date to correct entries, including notes and completion.
- **Progress:** completion count for the program week, estimated 1RMs, highest logged weight per exercise, and recent sets for each primary lift.
- **Settings:** configure dates, training maxes, percentage template, units, load rounding, rest timer, and backups.

The rest timer can be launched manually or set to auto-start when a set is checked. iOS may suspend running timers in the background, but the countdown calculates elapsed time from the clock on return. Sound/notification alerts are not required.

## Backup / restore — important

**Export:** In the installed app, go to **Settings → Export JSON backup**. Save the resulting `.json` file to Files, iCloud Drive, or another location you control. Do this every week or after important training sessions. The file contains your training history, notes, program settings, and training maxes.

**Import:** In the installed app, go to **Settings → Import JSON backup**, select that file, and confirm. **Import replaces ALL existing data in the current app.** Export the current data first if you need to keep it.

**Storage limits:** iOS can delete website data under storage pressure, when removing the app or clearing browser website data, or for other browser-managed reasons. Home Screen web apps are treated differently from regular Safari tabs, but even Home Screen storage is not an absolute guarantee. Deleting/reinstalling the app can also lose its private storage. A JSON export stored outside the app is the only reliable recovery path. Do not assume your backup is automatic.

**Privacy:** GitHub receives ordinary requests for the static app files, but the app does not send workout entries to GitHub or any other endpoint. Workout data is local and the code contains no analytics or third-party SDKs. Anyone can view the public app source repository, but not the local workouts in your iPhone.

## Maintaining or modifying the app

- Edit your source files locally and upload the changed files using GitHub's **Add file → Upload files** flow, choosing replacement for the existing files and committing the changes.
- **When changing app files**, increase the version in `sw.js`'s `CACHE_NAME` (for example, `sol-strength-shell-v1.0.1`) so installed devices precache the newest app files.
- Since workouts live under the website's origin and install, do not change the GitHub account/repository URL without making a JSON backup first. Changing the URL changes which local storage the app can access.
- Do not place an exported `.json` workout backup in your public GitHub repository. It belongs in your private Files/iCloud storage only.

## Testing status

**Automated checks completed during development:**

- `node tests/run-tests.cjs` — 20 logic and integration checks covering the split, baseline transitions, 5/3/1 calculations, cycle max inheritance, logged sets, corrections, progress, localStorage persistence and reload, backup import/export, file integrity, and simulated service-worker offline fallback.
- `python tests/browser-smoke.py` — 16 Chromium browser interaction checks using the actual HTML, CSS, and JavaScript in an inline-document harness: navigation, logging, History, PRs, JSON download/upload, recovery of deleted data, 5/3/1 weeks, timed exercises, and 320/390px responsive rendering.

**Not tested here:** a real GitHub Pages deployment, live service-worker registration under HTTPS, real iOS Safari / Home Screen behavior, and actual offline operation on an iPhone. The development environment restricts normal Chromium URL navigation, so the browser tests run by injecting the actual app source into an inline document. Complete Step 7 above after installing.

## Useful official links

- Free GitHub account: https://github.com/signup
- New repository: https://github.com/new
- GitHub Pages docs: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Apple's Add to Home Screen guide: https://support.apple.com/guide/iphone/bookmark-a-website-iph42ab2f3a7/ios
- WebKit storage policy: https://webkit.org/blog/14403/updates-to-storage-policy/
