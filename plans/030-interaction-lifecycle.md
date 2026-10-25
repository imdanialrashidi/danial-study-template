# Plan 030: Fix client-side interaction lifecycle and honest bookmark state

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 2925b2d..HEAD -- src/components/ui/TelegramPopup.astro src/islands/common/CommandPalette.tsx src/islands/common/BookmarkToggle.tsx scripts/interaction-qa.mjs`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW–MED (client behavior; browser QA required)
- **Depends on**: none (plan 025 recommended first; browser QA needs a build)
- **Category**: bug + a11y
- **Planned at**: commit `2925b2d`, 2026-10-21

## Why this matters

Three browser-only defects survive the current suites:

1. **The Telegram popup is inert after the first client-side navigation.**
   `BaseLayout` mounts Astro’s `<ClientRouter />`, which swaps the body without
   reloading. `TelegramPopup.astro` is a one-shot IIFE: it queries the popup,
   attaches the timer/scroll/dismiss handlers, and never re-arms on
   `astro:page-load` (unlike `Header`, `TableOfContents`, and `Formula`). The
   swapped-in popup has no handlers, and the old timer/listener points at a
   detached element. Reproduced in a headless run: after navigating from `/`
   to a lesson, the popup script’s timer/scroll counts did not increase.
2. **Closing the command palette with Ctrl/⌘+K drops focus to `<body>`.**
   The global shortcut closes with `setOpen((v) => !v)`, bypassing the
   dialog’s `close()` path that returns focus to the trigger. Keyboard users
   lose their place; Escape and shortcut close behave differently.
3. **A failed bookmark write reports success.** In private mode or on quota
   failure, the bookmark icon fills and `aria-pressed` says “saved”, but
   `localStorage` rejected the write. The sibling `ProgressToggle` already
   reports “در این مرورگر ذخیره نمی‌شود”; `BookmarkToggle` does not.

All three are small, local fixes with observable browser assertions.

## Current state

`src/components/ui/TelegramPopup.astro:91–96` starts a one-shot script:

```astro
<script define:vars={{ storageKey: ..., cooldownDays: ..., delayMs: ..., scrollDepth: ... }}>
  (function () {
    var root = document.querySelector('[data-telegram-popup]');
    if (!root) return;
    var panel = root.querySelector('[data-telegram-panel]');
```

It attaches a timer (`:181`), a scroll listener (`:186`), and dismiss handlers
(`:193–195`). There is no `astro:page-load`/`astro:before-swap` listener and no
cleanup. `Header.astro:189–195` documents the required re-arm pattern; the
popup does not follow it.

`src/islands/common/CommandPalette.tsx:21–40`:

```tsx
const close = useCallback(() => {
  setOpen(false);
}, []);

useEffect(() => {
  function onKey(e: KeyboardEvent) {
    const mod = e.metaKey || e.ctrlKey;
    if (mod && (e.key === 'k' || e.key === 'K')) {
      e.preventDefault();
      if (!open) triggerRef.current = document.activeElement as HTMLElement | null;
      setOpen((v) => !v);
    }
  }
  ...
}, [open]);
```

`CommandPaletteDialog.tsx:32–37` returns focus only when its own `close()`
runs (Escape/backdrop). The shortcut path never calls it.

`src/islands/common/BookmarkToggle.tsx:17–32`:

```tsx
export default function BookmarkToggle({ id, label = 'این صفحه' }: BookmarkToggleProps) {
  const [saved, setSaved] = useState(false);
  const hydrated = useHydrated('bookmark');

  useEffect(() => {
    const sync = () => setSaved(ProgressBridge.isBookmarked(id));
    sync();
    return subscribeProgress(sync);
  }, [id]);
```

It never reads `ProgressBridge.persistent`. `ProgressToggle.tsx:31–33,70–74`
shows the intended pattern: track `persistent`, set `ready` after mount, and
render a non-blocking status when false.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Build | `npm run build` | exit 0 |
| Preview | `npm run preview -- --port 4321` | serves the built site |
| Browser QA | `node scripts/interaction-qa.mjs --base http://localhost:4321` | all checks pass, including new ones |
| Unit | `npm run test` | all pass |
| Typecheck | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 |
| Full gate | `npm run ci` | exit 0 |

## Scope

**In scope** (the only files you should modify):
- `src/components/ui/TelegramPopup.astro`
- `src/islands/common/CommandPalette.tsx`
- `src/islands/common/BookmarkToggle.tsx`
- `scripts/interaction-qa.mjs`

**Out of scope** (do NOT touch):
- `CommandPaletteDialog.tsx` / `CommandPalette.astro` — the dialog’s own
  close path and the global mount strategy are correct for this plan.
- `ProgressStore` / `ProgressBridge` — the store already flips to `unavailable`
  on a failed write; only the control’s display changes.
- `ProgressToggle` — it is the reference pattern, not a target.
- CSS, design tokens, popup copy, or the popup’s 12-second/45% trigger logic.

## Git workflow

Do not commit, push, merge, or open a PR unless the operator explicitly asks;
follow `docs/GIT_POLICY.md`.

## Steps

### Step 1: Re-arm the Telegram popup after client-side navigation

In `src/components/ui/TelegramPopup.astro`, convert the IIFE into a named
initializer that is idempotent per current popup element and cleans up the
previous page’s timer/listener. Keep every existing behavior and constant.

Target shape (preserve the existing body; only the marked additions change):

```js
function initTelegramPopup() {
  var root = document.querySelector('[data-telegram-popup]');
  if (!root || root.dataset.telegramReady === 'true') return;
  root.dataset.telegramReady = 'true';

  var panel = root.querySelector('[data-telegram-panel]');
  var previouslyFocused = null;
  var timerId = null;
  var onScroll = null;

  function cleanup() {
    if (timerId !== null) {
      clearTimeout(timerId);
      timerId = null;
    }
    if (onScroll) {
      window.removeEventListener('scroll', onScroll);
      onScroll = null;
    }
    // Function declarations are hoisted, so this is safe even though `onKey`
    // is defined below. `close()` also removes it; removing twice is a no-op.
    document.removeEventListener('keydown', onKey);
  }

  // ... existing readStamp/writeStamp/cooldown check/open/close/onKey/maybeOpen ...

  timerId = setTimeout(function () {
    delayPassed = true;
    maybeOpen();
  }, delayMs);

  onScroll = function () {
    if (depth() >= scrollDepth) {
      depthPassed = true;
      maybeOpen();
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // ... existing dismiss/backdrop handlers ...

  // `define:vars` scripts are emitted verbatim (no TypeScript transpile), so
  // use plain JS bracket access — never `as unknown as`.
  window['__telegramPopupCleanup'] = cleanup;
}

if (!window['__telegramPopupArmed']) {
  window['__telegramPopupArmed'] = true;
  document.addEventListener('astro:before-swap', function () {
    var pending = window['__telegramPopupCleanup'];
    if (typeof pending === 'function') {
      pending();
      window['__telegramPopupCleanup'] = null;
    }
  });
  document.addEventListener('astro:page-load', initTelegramPopup);
}
initTelegramPopup();
```

Notes:

- The `data-telegram-ready` marker is the QA contract; it must be set before
  the `recentlyShown` early return only if you want the marker to prove the
  element was processed. Set it immediately after the root guard.
- `close()` must keep removing its `keydown` listener. Do not remove the
  `shown` guard: the popup still opens at most once per page view.
- The `define:vars` values remain in scope; do not restructure them into a
  module import.
- Do **not** use TypeScript casts (`as unknown as Record<…>`) inside a
  `define:vars` script: Astro emits that script verbatim, so the cast becomes a
  browser SyntaxError even though the build passes. Use plain JS bracket access
  (`window['__telegramPopupArmed']`) as shown. This was caught during the first
  execution and is the required shape.
- If the script is re-executed by the router (the guard handles both cases),
  `initTelegramPopup()` wires the fresh element; the armed guard prevents
  duplicate document/page-load listeners.

**Verify**: `npm run build` → exit 0.
`grep -n "telegramReady\|astro:page-load\|astro:before-swap\|__telegramPopupCleanup" src/components/ui/TelegramPopup.astro`
→ all four concepts present.

### Step 2: Restore focus when the palette closes by shortcut

In `src/islands/common/CommandPalette.tsx`:

- Change `close` to also return focus:

```tsx
const close = useCallback(() => {
  setOpen(false);
  const trigger = triggerRef.current;
  if (trigger && document.contains(trigger)) trigger.focus();
}, []);
```

- In the global shortcut handler, branch on `open` instead of toggling:

```tsx
if (open) {
  close();
} else {
  triggerRef.current = document.activeElement as HTMLElement | null;
  setOpen(true);
}
```

- Update the effect dependency array from `[open]` to `[open, close]`.

The dialog’s own `close()` still calls `onClose()` and focuses the trigger;
the extra focus call is harmless and keeps both close paths consistent.

**Verify**: `npm run lint` → exit 0 (the exhaustive-deps rule must be happy).
`grep -n "setOpen((v) => !v)" src/islands/common/CommandPalette.tsx` → no
matches.

### Step 3: Report bookmark persistence failure honestly

In `src/islands/common/BookmarkToggle.tsx`:

- Add `persistent` and `ready` state:
  ```tsx
  const [persistent, setPersistent] = useState(true);
  const [ready, setReady] = useState(false);
  ```
- In the effect’s `sync`, set both:
  ```tsx
  const sync = () => {
    setSaved(ProgressBridge.isBookmarked(id));
    setPersistent(ProgressBridge.persistent);
  };
  sync();
  setReady(true);
  return subscribeProgress(sync);
  ```
- Wrap the button in an inline-flex span and add the status sibling:
  ```tsx
  return (
    <span className="inline-flex items-center gap-2">
      <button ...>{...}</button>
      {ready && !persistent && (
        <span role="status" className="text-2xs text-ink-faint">
          در این مرورگر ذخیره نمی‌شود
        </span>
      )}
    </span>
  );
  ```

Keep the existing `aria-pressed`, `aria-label`, icon, and click behavior. The
status must appear only after mount (`ready`) so SSR and the first client
render stay identical.

**Verify**: `npm run typecheck` and `npm run lint` → exit 0.

### Step 4: Add the three browser checks

Append three blocks to `scripts/interaction-qa.mjs` before the final
`await browser.close();`.

**Popup re-arm after client-side navigation:**

```js
/* ── Telegram popup after client-side navigation ─────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => { window.__qaNavigationMarker = 'kept'; });
  await page.locator('main a[href="/lessons/01-intro-to-calculus"]').first().click();
  await page.waitForURL('**/lessons/01-intro-to-calculus');
  check('popup: navigation stayed client-side', await page.evaluate(() => window.__qaNavigationMarker === 'kept'));
  await page.waitForFunction(
    () => document.querySelector('[data-telegram-popup]')?.dataset.telegramReady === 'true',
    null,
    { timeout: 10000 },
  );
  const dismissed = await page.evaluate(() => {
    const root = document.querySelector('[data-telegram-popup]');
    root.hidden = false;
    root.querySelector('[data-telegram-dismiss]').click();
    return root.hidden === true;
  });
  check('popup: dismiss works after client-side navigation', dismissed);
  await context.close();
}
```

**Palette shortcut focus return:**

```js
/* ── Command palette focus return ────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'fa-IR' });
  const page = await context.newPage();
  await page.goto(`${base}/search/`, { waitUntil: 'networkidle' });
  const trigger = page.locator('[data-open-palette]').first();
  await trigger.click();
  await page.waitForSelector('#palette-input', { timeout: 10000 });
  await page.keyboard.press('Control+k');
  await page.waitForTimeout(300);
  const restored = await page.evaluate(
    () => document.activeElement?.hasAttribute('data-open-palette') === true,
  );
  check('palette: shortcut close restores the trigger', restored);
  await context.close();
}
```

**Bookmark persistence failure:**

```js
/* ── Bookmark persistence failure ────────────────────────────────────────── */
{
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'fa-IR' });
  await context.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'dr-study-progress:v1') throw new Error('quota');
      return original.call(this, key, value);
    };
  });
  const page = await context.newPage();
  await page.goto(`${base}/lessons/01-intro-to-calculus`, { waitUntil: 'networkidle' });
  await page.waitForFunction(
    () => document.documentElement.dataset.bookmarkHydrated === 'true',
    null,
    { timeout: 10000 },
  );
  const bookmark = page.getByRole('button', { name: /نشان‌شده‌ها/ }).first();
  await bookmark.click();
  await page.waitForTimeout(150);
  check('bookmark: failure is reported in the page header', (await page.locator('header').getByText('در این مرورگر ذخیره نمی‌شود').count()) === 1);
  check('bookmark: in-memory state still flips', (await bookmark.getAttribute('aria-pressed')) === 'true');
  await context.close();
}
```

Note: the existing interaction QA uses `base` from `--base`; keep that
convention.

**Verify**: build, start preview, and run:

```bash
npm run build
npm run preview -- --port 4321
node scripts/interaction-qa.mjs --base http://localhost:4321
```

→ all checks pass, including the six new `check(...)` calls (two popup, one
palette, two bookmark, plus the client-side marker).

## Test plan

- Browser QA only: these are DOM lifecycle, focus, and storage-failure paths
  that unit tests cannot represent.
  - popup: client-side marker + `data-telegram-ready` + dismiss after nav;
  - palette: open via the page trigger, close via Ctrl+K, assert focus is on
    the trigger;
  - bookmark: override `Storage.prototype.setItem` to throw for the progress
    key, assert the header status appears and the optimistic state still flips.
- Existing unit tests remain unchanged. `ProgressStore`’s storage-failure
  behavior is already covered in `tests/unit/progress.test.ts`; this plan
  covers the missing UI consumer.
- Red-before-green: each new check fails before its step (no ready marker,
  focus on `BODY`, no status text).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `npm run build` exits 0
- [ ] `node scripts/interaction-qa.mjs` exits 0 and reports the new checks
      (popup, palette, bookmark) as passed
- [ ] `npm run test`, `npm run typecheck`, `npm run lint` exit 0
- [ ] `grep -n "setOpen((v) => !v)" src/islands/common/CommandPalette.tsx`
      returns no matches
- [ ] `grep -n "telegramReady" src/components/ui/TelegramPopup.astro` returns
      a match
- [ ] `grep -n "ProgressBridge.persistent" src/islands/common/BookmarkToggle.tsx`
      returns a match
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The popup re-arm causes the popup to open twice or the dismiss handler to
  fire twice in a row. The `data-telegram-ready` guard and cleanup are
  load-bearing; report the actual event sequence instead of removing the
  guard.
- The palette trigger is not present on `/search` when the test runs (for
  example `paletteOn` is false in the active config). Report the config state;
  do not add a test-only trigger.
- Overriding `Storage.prototype.setItem` breaks page initialization (for
  example the theme script throws). The override must only throw for
  `dr-study-progress:v1`; fix the scope, not the app.
- The browser QA cannot run because no preview server/Chromium is available.
  Mark the plan BLOCKED with the exact prerequisite; do not claim browser
  behavior from code inspection.

## Maintenance notes

- Any script that needs to survive Astro’s `ClientRouter` must follow the
  `armed guard + astro:page-load` pattern (`Header`, `TableOfContents`,
  `Formula`). The popup now does; keep it.
- The popup’s cooldown write happens only on open. The QA marker is set on
  wiring, not on open, so it proves initialization without consuming the
  cooldown.
- Palette close paths: Escape/backdrop use the dialog’s `close()`; the global
  shortcut now uses the parent’s `close()`. Both focus the trigger. If a third
  close path is added, route it through `close()`.
- Bookmark persistence feedback mirrors `ProgressToggle`; if the store’s
  availability semantics change, update both controls together.
