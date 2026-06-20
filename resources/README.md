# Pewil — native app icons & splash (Capacitor)

Brand: **the Pewil Sprout** — a point-of-sale "P" with a leaf rising from the bowl.
Green `#1a6b3a → #2e9e57`, sprout `#7cf0ae`. These assets match the web favicon / PWA
icons in `public/`.

## Files in this folder (the *source* set)

| File | Purpose |
|------|---------|
| `icon.png` (1024²) | Master app icon, full-bleed. iOS + Android legacy are generated from this. |
| `icon-foreground.png` (1024², transparent) | Android **adaptive** icon foreground (white P+leaf, sized inside the 66dp safe zone). |
| `icon-background.png` (1024²) | Android **adaptive** icon background (green gradient). |
| `splash.png` (2732²) | Launch splash — cream `#faf6ef` background + centered mark. |
| `splash-dark.png` (2732²) | Dark-mode splash. |

## Recommended: let Capacitor generate every size

After you've run `npx cap add ios` and `npx cap add android`, from `makonese_frontend/`:

```bash
npm install --save-dev @capacitor/assets
npx capacitor-assets generate --iconBackgroundColor '#1a6b3a' --iconBackgroundColorDark '#0f172a' --splashBackgroundColor '#faf6ef' --splashBackgroundColorDark '#0f172a'
npx cap sync
```

That reads the source files above and writes the full Android mipmap set (incl. adaptive
`mipmap-anydpi-v26`) and the iOS `AppIcon.appiconset` straight into the native projects.
Then `npx cap open ios` / `npx cap open android` and archive/bundle as usual.

## Fallback: prebuilt icons (already rendered)

If you'd rather not run the tool, `native/` contains ready-to-drop files:

- **Android** → copy `native/android/mipmap-*`, `native/android/mipmap-anydpi-v26/*`,
  and `native/android/values/ic_launcher_background.xml` into
  `android/app/src/main/res/` (merging the `values/` color in).
- **iOS** → replace `ios/App/App/Assets.xcassets/AppIcon.appiconset/` with
  `native/ios/AppIcon.appiconset/` (single 1024² icon; Xcode 14+ auto-scales).

## Regenerating

The source-of-truth vector is `public/favicon.svg` / `public/brand/pewil-mark.svg`.
The raster generators used for these PNGs live in the brand toolkit — re-run them if the
mark ever changes, then re-run `capacitor-assets generate`.
