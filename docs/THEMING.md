# Day and night mode

Players choose **Settings → Appearance**: Phone setting, Day or Night. The
choice is saved on the device and applies instantly.

## The golden rule: 60-30-10

Day mode follows the classic 60-30-10 colour rule:

| Share | Role                | Colours                                                                                                       |
| ----- | ------------------- | ------------------------------------------------------------------------------------------------------------- |
| 60%   | Calm space          | Bright ivory page (`#fbf8f2`, lightly tinted by the board theme), white cards with soft navy shadows          |
| 30%   | Structure and brand | Royal navy (`#16204a` text, `#1e2a5e` buttons): text, secondary buttons, the active tab, the Quick Match hero |
| 10%   | Energy              | Marigold gold and the four Ludo colours: play buttons, coins, the tournament card, game-mode tiles            |

Keep new screens in proportion: mostly white and ivory, navy for anything
structural, and gold or a Ludo colour only where the eye should go first. One
vivid focal card per screen section is enough.

The navy is the same navy as night mode, so both modes read as one brand. A
card that should be a navy "island" in day mode renders inside
`<SchemeScope scheme="dark">` and gets night tokens automatically.

## Where things live

```
src/presentation/theme/
  palette.ts            DARK and LIGHT colour tokens (Palette)
  AppearanceProvider.tsx preference, scheme, useUi(), useAppearance(), makeStyles()
  themes.ts             board themes; themeForScheme() derives day colours
  color.ts              contrast(), mix(), readableOn()
  palette.test.ts       every text token passes 4.5:1 in both modes, on every theme
```

`useProfile().theme` is already adapted to the current scheme: in day mode its
`background` and `surface` are paper whites tinted with the theme's accent.

## Rules for screens

1. **No raw colours for chrome.** Text, borders, fills, overlays and shadows use
   palette tokens. Raw hex is only for game art that is the same in both modes:
   player colours, the board's tiles, dice finishes, coin and gem icons.

2. **Styles that use colours** are built with `makeStyles`, inside components:

   ```tsx
   const useStyles = makeStyles((ui) => ({
     title: { color: ui.text },
     card: { borderColor: ui.line, boxShadow: `0 8px 24px ${ui.shadow}` },
   }));

   function Thing() {
     const s = useStyles(); // call before any early return
     const ui = useUi(); // for inline colours
     const shared = useShared(); // Kit's shared text styles
   }
   ```

   Styles without colours may stay in a plain `StyleSheet.create`.

3. **Accent as text** (labels, icons, links) uses `theme.accentText`, which is the
   accent adjusted to 4.5:1 on the page. `theme.accent` stays for fills,
   borders and buttons. Text on an accent button stays `shade(accent, -0.78)`.

4. **Token mapping** from the old night-only colours:

   | Was (night)                         | Token                                                      |
   | ----------------------------------- | ---------------------------------------------------------- |
   | `#0e1322` page                      | `theme.background` (or `ui.background` with no profile)    |
   | `#dee1f7` / `#fff` text on the page | `ui.text`                                                  |
   | `#c2c6d6`, `#8c909f`                | `ui.muted`, `ui.subtle`                                    |
   | `#ffffff06`–`#ffffff10` fills       | `ui.fill`                                                  |
   | `#ffffff12`–`#ffffff1a` fills       | `ui.fillStrong`                                            |
   | `#ffffff14`–`#ffffff1f` borders     | `ui.line`                                                  |
   | `#ffffff20`–`#ffffff30` borders     | `ui.border`                                                |
   | neutral `android_ripple`            | `ui.ripple`                                                |
   | `#030612cc`, dark overlays          | `ui.scrim`                                                 |
   | `#00000020`–`#00000060` shadows     | `ui.shadow`                                                |
   | `#161b2a`, `#111728`, `#252939`     | `ui.surfaceLow`, `ui.inset`, `ui.surfaceHigh`              |
   | `#232d4b` + gradient                | `ui.navy`, `ui.secondary`                                  |
   | green/gold/red/blue/violet text     | `ui.green`, `ui.gold`, `ui.danger`, `ui.blue`, `ui.violet` |
   | white text on a coloured badge      | `ui.onColor`                                               |

5. **Decorative gradients** (mode cards, banners) get a day version: the same
   hues, light and soft, with text switching to `ui.text`/`ui.muted`:
   `colors={ui.scheme === 'dark' ? DARK_STOPS : LIGHT_STOPS}`.

6. **Text shadows** and glows meant for dark backgrounds are night-only.

7. **The board stays the same in both modes**; only the table around it changes.

## The doodle wallpaper

Every `Screen` draws a faint doodle pattern behind its content
(`components/Doodles.tsx`): mini Ludo boards, dice, coins, crowns, stars and a
few emojis, scattered at fixed spots. It shows in the gaps between cards and
uses the page ink, so it follows day and night automatically.

- `<Screen decor="light">` for calm, form-heavy screens (Settings).
- `<Screen decor="none">` where nothing should sit behind the content.
- Keep it faint: line art at about 7-8% opacity, colour pieces at 16-20%.
