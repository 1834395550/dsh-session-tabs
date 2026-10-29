# dsh-session-tabs

[中文](README.md) · **English**

![license](https://img.shields.io/badge/license-MIT-blue)
![platform](https://img.shields.io/badge/DSH-Web%20GUI-4176e6)
![build](https://img.shields.io/badge/build-none%20·%20pure%20client-2ea043)

> A **browser-style tab bar** for the [DeepSeek Harness](https://github.com/deepseek-ai) (DSH) Web GUI: one tab per Session, Sessions of the same Workspace collected in a collapsible box, one click to switch. Close the sidebar for good — your tabs stay.

![overview](docs/overview.png)

## Why this exists

DSH switches Sessions from the left sidebar, so the sidebar has to stay open and wide, and switching means opening a list and hunting for a row. That is the opposite of how a browser feels: the pages you have open sit in a row at the top, visible at a glance and one click away, taking no room from the content.

This plugin turns the Sessions you have open into a row of tabs, and each project into a box you can fold away:

- switch Sessions by **looking up and clicking**, no sidebar diving;
- if the sidebar gets in the way, **collapse it** — the tab bar stays;
- too many projects? **Fold** the ones you are not using into a small `name 3` chip and open it when needed.

## At a glance

**Expanded** — one box per project, Sessions as tabs inside it:

![tab bar](docs/bar.png)

**Collapsed** — click the project name and it folds down to `name + tab count`; the state is remembered:

![collapsed](docs/collapsed.png)

**In detail**:

![detail](docs/detail.png)

> On the left, `⌄ DSH-论文格式 1` is a project box: `⌄` means expanded, `1` is how many tabs are open in that project, and clicking the box head folds it into `›`.
> On the right are the Session tabs: the **light-blue bold pill** is the current Session; a small blue dot means that Session's agent is streaming; the `×` only unloads the tab, it never deletes the Session; the `+` at the far right starts a new Session.

## Features

- ✅ **One full-width strip**, pinned right below the app's own title strip, edge to edge. The GUI is pushed down by 38px so nothing is covered.
- ✅ **One tab per Session**: the active tab is a light-blue pill in bold; a Session whose agent is streaming gets a pulsing blue dot.
- ✅ **Grouped per project, collapsible**: each Workspace is a bordered, rounded box headed by `⌄ name + tab count`. The folded state lives in `localStorage`, so it survives a reload or a restart.
- ✅ **Tabs are created on demand**: only Sessions you actually opened show up — installing this will not flood the bar with hundreds of old conversations. Tab order follows the order you opened them, so nothing jumps around while a conversation streams.
- ✅ **`×` unloads a tab, never deletes a Session**: conversation, history and project stay untouched, and clicking the Session in the sidebar brings the tab back. Closing the active tab switches to a neighbour; with a single tab the `×` is hidden (the strip can never be emptied); middle-click also closes.
- ✅ **`+` starts a new Session**, at the far right of the strip.
- ✅ Many tabs scroll horizontally (wheel over the strip), with a fade on both edges.
- ✅ When the active Session changes elsewhere (sidebar, shortcut, deep link), its project box expands automatically.
- ✅ **Client-only, zero dependencies, no build step**: works right after install; disable it and the GUI is back to normal instantly.

## Install

You need DSH installed, with plugin management available in the Web GUI.

> It will also be installable from the DSH plugin market (dsh-market) by searching `session tabs` — the listing request is queued with [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin). Until it is merged, use Option A.

### Option A: from a release tarball (recommended, **no Git needed**)

Install this address in DSH's plugin manager:

```
https://github.com/1834395550/dsh-session-tabs/releases/latest/download/dsh-session-tabs.tgz
```

That URL always serves the newest version. To pin one, use
`.../releases/download/v1.0.2/dsh-session-tabs-1.0.2.tgz`.

### Option A-2: when `github.com` is unreachable (jsDelivr)

In mainland China `github.com` often does not answer (symptoms: `UND_ERR_HEADERS_TIMEOUT`, `ETIMEDOUT`, or an install that sits on `HEAD https://github.com/...` forever). The same tarball is committed at the repo root and served by the jsDelivr CDN — measured at 2.5 s, no Git, no proxy:

```
https://cdn.jsdelivr.net/gh/1834395550/dsh-session-tabs@main/dsh-session-tabs.tgz
```

> jsDelivr caches `@main` for about 12 hours; for the newest build use a commit ref (e.g. `@4cde63e`) or Option A.
> Fully offline alternative: download that `.tgz` in a browser and pass its **absolute local path** (e.g. `C:\Users\you\Downloads\dsh-session-tabs.tgz`) to the plugin manager.

### Option B: from the GitHub repository (requires Git on this machine)

```
github:1834395550/dsh-session-tabs
```

> ⚠️ This form makes pnpm resolve the repo with `git ls-remote`, so `git` must be on `PATH`.
> If you get `ERR_PNPM_GIT_RESOLVE_FAILED ... 'git' is not recognized as an internal or external command`,
> Git is missing on that machine — install it, or use **Option A**.

### Option C: from a local checkout

Clone the repo anywhere and install that **absolute directory path** through the plugin manager.

No restart needed: the strip appears below the title strip immediately. Sessions and tab state live in the client, so installing or removing the plugin never touches your conversations.

## Usage

| Action | Effect |
| --- | --- |
| Click a tab | Switch to that Session |
| `×` on a hovered / active tab | Unload that tab (**the Session stays**) |
| Middle-click a tab | Same as `×` |
| Click `⌄ project name` | Fold / unfold that project's tabs |
| Click `+` at the far right | New Session in the current project |
| Wheel over the strip | Scroll tabs horizontally |

## How it works

- Client-only plugin. The Host half is empty and there is **no build step**: `index.js` + `client.js` are runnable ESM as committed.
- It renders into `shell.overlay` (the frame-wide floating layer). The DSH frame has no top-row slot, so the strip is pinned right below the title strip and the frame is pushed down by 38px with a single `:has()` rule:

  ```css
  html[data-dsh-session-tabs="on"] div:has(> [data-shell-overlay]) {
    padding-top: calc(var(--dsh-windows-titlebar-height, 0px) + 38px) !important;
  }
  ```

- Data comes from client services: `sessions.list` (Sessions and summaries), `workspaces.list` (projects and archive state), `uiWorkspace.openSession(id)` (open a Session), `uiWorkspace.startSession()` (new Session).
- Visibility rules match the official sidebar: subagent Sessions, non-current blank Sessions and archived Sessions are hidden.
- Disabling the plugin removes its injected `<style>` and the root attribute, so the GUI returns to its normal layout at once.

## Known limitations

- Developed and verified against the DSH desktop app (Windows, page carries `data-windows-titlebar`). In a plain browser window there is no native title strip and the bar simply sits at the top of the window — it still works.
- Tab width is capped at 200px (CSS variable `--st-tab-max`); longer titles are truncated with `…`.
- At least one tab is always kept; `×` will not empty the strip.
- Web platform only (`dsh.client.platform = "web"`); there is no TUI version.

## Development

```bash
# the repo is itself an installable plugin directory; no build needed
node --check client.js
```

Saving `client.js` hot-reloads the running DSH within seconds — no restart, no reinstall.

## License

[MIT](LICENSE)
