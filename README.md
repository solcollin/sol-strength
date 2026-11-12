# SOL STRENGTH 3.0

A zero-cost, offline-first iPhone workout tracker: dark UI with hunter-green accents, no login, no analytics, no subscriptions, no custom domain and no App Store publishing.

## Version 3: start 5/3/1 immediately

**There are no baseline weeks in this app.** Run your strength assessments outside the app on Thursday **November 19** and Friday **November 20, 2026**. Enter your measured or estimated one-rep maxes during setup. Your first session starts **Sunday, November 22, 2026**, as **5/3/1 Cycle 1 / Week 1**.

A built-in optional one-rep-max calculator accepts a working-set weight and 1–12 completed reps, using `estimated 1RM = weight × (1 + reps / 30)`. You can use your heaviest good-form set (for example, one of your assessment 3×5 sets) instead of testing a true one-rep maximum. Estimates are approximate; avoid maximal attempts if unnecessary.

Training max = **90% of entered 1RM**. All working percentages below use *training max* with gym-increment rounding:

| Program week | 5/3/1 main working sets |
| --- | --- |
| 1 · Nov 22–28 | 65% × 5 / 75% × 5 / 85% × 5+ |
| 2 · Nov 29–Dec 5 | 70% × 3 / 80% × 3 / 90% × 3+ |
| 3 · Dec 6–12 | 75% × 5 / 85% × 3 / 95% × 1+ |
| Cycle 2 Week 1 · Dec 13 | Restart Week 1 using the next cycle's training max (editable in Settings) |

This is the user's requested three-week 5/3/1 template. It does not automatically add BBB or a fourth deload week. Program start date, gym increment, training maxes by cycle, and percentage template are editable in Settings. The training-max increase between cycles is **manual** rather than an unapproved auto-increment.

## Weekly schedule (editable in setup)

| Day | Workout |
| --- | --- |
| Sunday | Chest & Arms (Bench Press) |
| Monday | Legs & Back (Deadlift) |
| Tuesday | Recovery |
| Wednesday | Shoulders, Chest & Arms (Overhead Press) |
| Thursday | Quad-Focused Legs (Squat) |
| Friday | Back & Arms |
| Saturday | Recovery |

All accessories, including the frequently prescribed bicep work, stay as requested. The four main lifts use 5/3/1's three sets instead of the pre-program 5–8 rep prescription. The rest use their original rep ranges.

### One-time setup

1. On the first opening, tap **Start New Program**.
2. Select **November 22, 2026** as the start date (already defaulted) and review the five training days/workout assignments.
3. Enter your four 100% one-rep maxes: Bench Press, Deadlift, Overhead Press and Squat. For an estimated 1RM, open **Need to estimate a 1RM from a working set?**, enter weight and reps and tap **Calculate and fill 1RMs**.
4. Tap **Start 5/3/1** to finish setup. The first workout is Chest & Arms on Sunday, November 22. Before the start date, the app displays a countdown/preview instead of a session.
5. After setup, the Workout tab opens to the current calendar day's assigned training or recovery. Use the date navigation to view future days. Log working sets, notes, and completed sessions as usual.

## Deploy/update for free using GitHub Pages

You **do not need to create another repository** if you already have the `sol-strength` repository.

1. **Before updating**, if you've logged any workouts, use **Settings → Export JSON backup** and save the file to iCloud Drive or Files. Updating static site files should not erase storage, but backups are important.
2. Unzip `SOL-STRENGTH-v3.zip`.
3. Open your existing GitHub repository: https://github.com/solcollin/sol-strength
4. Upload the **individual application files** to the repository root: `index.html`, `app.js`, `styles.css`, `sw.js`, `manifest.webmanifest`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, and optionally `README.md`. If GitHub's bulk uploader won't overwrite existing filenames, open each file, choose its edit/pencil action, and replace its contents for text files, or use GitHub Desktop to replace the root files and push. Do not upload the ZIP as the only repository file or place `index.html` inside a subfolder.
5. Commit the changes. Under **Settings → Pages**, Source should be `Deploy from a branch`, Branch `main`, Folder `/(root)`. Leave **Custom domain** empty.
6. Your site is https://solcollin.github.io/sol-strength/ — open it in Safari on your iPhone and choose **Share → Add to Home Screen** (enable **Open as Web App** if shown).
7. For an installed older app, launch once while online, completely close, and reopen; the versioned service-worker cache refreshes on update. If the old UI persists, open the site in Safari online, then reopen the installed app. Avoid deleting the installed app without an exported backup.

When migrating an *unstarted* 2.0 schedule with the original November 19 default, the app moves the default start date to **November 22**. If you already logged sessions or manually customized your date, it preserves your date; edit it manually in Settings if needed. If you previously chose the 2.0 assessment path with no maxes, the app goes directly to the four-max entry step instead of running baseline weeks. Prior workout data and version 1/2 JSON backups remain supported.

## Files

- `index.html`: accessible, mobile-first UI shell
- `styles.css`: layout and hunter-green theme
- `app.js`: onboarding, calendar, training cycle, 5/3/1 weights, set logging, records, local storage and JSON backups
- `sw.js`: offline service worker, cache version 3.0.0
- `manifest.webmanifest`: PWA metadata
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`: iPhone icons

There are no third-party dependencies or build commands.

## Data protection and offline limitations

All workout records are stored locally in IndexedDB with a localStorage fallback; static pages are hosted on GitHub Pages and contain no account/login, analytics or workout uploading. Use **Settings → Export JSON backup** weekly and before major updates. **Import replaces current saved data**, so export first.

iOS can purge browser data or offline caches under storage pressure; Home Screen PWA storage may be separate from Safari-tab storage. Do not clear website data or delete the installed app without backing up. The service worker pre-caches all static files on first online load and supplies them on subsequent offline loads. A *real* iPhone offline test remains necessary after publishing: open once while online, disconnect Wi-Fi and mobile data, then restart the installed app.

## Checks performed

The version 3 Chromium browser test covers first-time setup, real/estimated 1RM setup, all three 5/3/1 weeks starting November 22, cycle rollover, iPhone-width rendering (390px and 320px), saving and reopening workouts, backup export/import and migration from version 2 with/without maxes. A separate service-worker simulation verifies offline precaching and fallback. These are **not** a substitute for a physical iPhone Safari test.
