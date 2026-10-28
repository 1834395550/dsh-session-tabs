/**
 * Browser-style Session tab bar.
 *
 * One tab per Session, Sessions grouped per Workspace in collapsible boxes,
 * rendered as a single full-width strip right below the app's own title strip
 * (so it can stand in for the sidebar, exactly like browser tabs do).
 *
 * Tabs are created by opening a Session and removed by their own "脳", which
 * only unloads the tab: the Session keeps living in its project.
 *
 * Seats: the frame has no top-row slot, so the bar lives in `shell.overlay`
 * (the frame-wide floating layer) and the frame itself is pushed down by the
 * height of the bar. The overlay layer is click-through; a direct child of it
 * opts back into pointer events, so the whole strip is interactive.
 */
window.__ModuleLoader__.load({
  id: 'dsh-session-tabs',
  factory(require) {
    'use strict';

    const React = require('react');
    const h = React.createElement;

    /** Height of the strip; also used to push the frame down. Must match CSS. */
    const BAR_HEIGHT = 38;
    /** Marks <html> while the bar is mounted, so the padding rule only applies then. */
    const ROOT_ATTR = 'data-dsh-session-tabs';
    const STYLE_TAG = 'session-tabs/tabbar';
    const COLLAPSED_KEY = 'dsh.session-tabs.collapsed';
    const OPEN_KEY = 'dsh.session-tabs.open';
    const UNGROUPED = '__ungrouped__';

    const TEXT = {
      zh: {
        label: '会话标签',
        collapse: '鏀惰捣',
        expand: '灞曞紑',
        ungrouped: '鍏朵粬浼氳瘽',
        defaultWorkspace: '默认工作区',
        newSession: '新会话',
        untitled: '未命名会话',
        close: '关闭标签（不会删除会话）',
      },
      en: {
        label: 'Session tabs',
        collapse: 'Collapse',
        expand: 'Expand',
        ungrouped: 'Other sessions',
        defaultWorkspace: 'Default workspace',
        newSession: 'New session',
        untitled: 'Untitled session',
        close: 'Close tab (keeps the session)',
      },
    };

    const CSS = `
[data-dsh-session-tabs-bar]{
  --st-tab-max:200px;
  position:fixed;
  top:var(--dsh-windows-titlebar-height,0px);
  left:0;
  right:0;
  height:${BAR_HEIGHT}px;
  box-sizing:border-box;
  display:flex;
  align-items:center;
  padding:0 10px;
  background:var(--dsw-specific-sidebar-fill,var(--dsw-alias-bg-base));
  border-bottom:.5px solid var(--dsw-alias-border-l3);
  color:var(--dsw-alias-label-primary);
  font-size:12.5px;
  line-height:16px;
  -webkit-app-region:no-drag;
  user-select:none;
}
html[${ROOT_ATTR}="on"] div:has(>[data-shell-overlay]){
  box-sizing:border-box;
  padding-top:calc(var(--dsh-windows-titlebar-height,0px) + ${BAR_HEIGHT}px)!important;
}
[data-dsh-session-tabs-bar] .st-scroll{
  flex:1 1 auto;
  min-width:0;
  display:flex;
  align-items:center;
  gap:8px;
  overflow-x:auto;
  overflow-y:hidden;
  scrollbar-width:none;
}
[data-dsh-session-tabs-bar] .st-scroll[data-edge-right="true"]{
  -webkit-mask-image:linear-gradient(to right,#000 calc(100% - 26px),transparent);
  mask-image:linear-gradient(to right,#000 calc(100% - 26px),transparent);
}
[data-dsh-session-tabs-bar] .st-scroll[data-edge-left="true"]{
  -webkit-mask-image:linear-gradient(to left,#000 calc(100% - 26px),transparent);
  mask-image:linear-gradient(to left,#000 calc(100% - 26px),transparent);
}
[data-dsh-session-tabs-bar] .st-scroll[data-edge-left="true"][data-edge-right="true"]{
  -webkit-mask-image:linear-gradient(to right,transparent 0,#000 26px,#000 calc(100% - 26px),transparent);
  mask-image:linear-gradient(to right,transparent 0,#000 26px,#000 calc(100% - 26px),transparent);
}
[data-dsh-session-tabs-bar] .st-scroll::-webkit-scrollbar{height:0;width:0}
[data-dsh-session-tabs-bar] .st-group{
  flex:none;
  display:flex;
  align-items:center;
  gap:2px;
  height:28px;
  box-sizing:border-box;
  padding:0 3px;
  border:.5px solid var(--dsw-alias-border-l3);
  border-radius:9px;
}
[data-dsh-session-tabs-bar] .st-head{
  flex:none;
  display:inline-flex;
  align-items:center;
  gap:6px;
  height:22px;
  padding:0 6px;
  border:0;
  border-radius:6px;
  background:transparent;
  color:var(--dsw-alias-label-secondary);
  font:inherit;
  font-size:12px;
  cursor:pointer;
  white-space:nowrap;
  -webkit-app-region:no-drag;
}
[data-dsh-session-tabs-bar] .st-head:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
[data-dsh-session-tabs-bar] .st-head[data-has-active="true"]{color:var(--dsw-alias-label-primary)}
[data-dsh-session-tabs-bar] .st-chevron{width:10px;height:10px;flex:none;transition:transform 140ms ease;transform:rotate(90deg)}
[data-dsh-session-tabs-bar] .st-group[data-collapsed="true"] .st-chevron{transform:rotate(0)}
[data-dsh-session-tabs-bar] .st-name{max-width:150px;overflow:hidden;text-overflow:ellipsis}
[data-dsh-session-tabs-bar] .st-count{
  font-size:11px;
  line-height:14px;
  min-width:15px;
  padding:0 4px;
  border-radius:7px;
  background:var(--dsw-alias-interactive-bg-hover);
  color:var(--dsw-alias-label-tertiary);
  text-align:center;
}
[data-dsh-session-tabs-bar] .st-tab{
  flex:none;
  display:inline-flex;
  align-items:center;
  gap:5px;
  height:22px;
  max-width:var(--st-tab-max,160px);
  min-width:44px;
  box-sizing:border-box;
  padding:0 3px 0 8px;
  border:.5px solid var(--dsw-alias-border-l3);
  border-radius:6px;
  background:transparent;
  color:var(--dsw-alias-label-secondary);
  font:inherit;
  font-size:12.5px;
  cursor:pointer;
  white-space:nowrap;
  overflow:hidden;
  -webkit-app-region:no-drag;
}
[data-dsh-session-tabs-bar] .st-tab:hover{
  background:var(--dsw-alias-interactive-bg-hover);
  border-color:var(--dsw-alias-border-l4);
  color:var(--dsw-alias-label-primary);
}
[data-dsh-session-tabs-bar] .st-tab:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary);outline-offset:-2px}
[data-dsh-session-tabs-bar] .st-tab[data-active="true"]{
  background:var(--dsw-alias-state-business-tertiary);
  border-color:color-mix(in srgb,var(--dsw-alias-state-business-primary) 38%,transparent);
  color:var(--dsw-alias-label-primary);
  font-weight:500;
}
[data-dsh-session-tabs-bar] .st-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
[data-dsh-session-tabs-bar] .st-close{
  flex:none;
  width:16px;
  height:16px;
  padding:0;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:0;
  border-radius:4px;
  background:transparent;
  color:inherit;
  opacity:0;
  cursor:pointer;
  -webkit-app-region:no-drag;
}
[data-dsh-session-tabs-bar] .st-tab:hover .st-close,
[data-dsh-session-tabs-bar] .st-tab[data-active="true"] .st-close,
[data-dsh-session-tabs-bar] .st-close:focus-visible{opacity:.7}
[data-dsh-session-tabs-bar] .st-close:hover{opacity:1;background:var(--dsw-alias-interactive-bg-active)}
[data-dsh-session-tabs-bar] .st-x{width:8px;height:8px;flex:none}
[data-dsh-session-tabs-bar] .st-actions{
  flex:none;
  display:flex;
  align-items:center;
  gap:2px;
  padding-left:8px;
  margin-left:8px;
  border-left:.5px solid var(--dsw-alias-border-l3);
}
[data-dsh-session-tabs-bar] .st-add{
  width:24px;
  height:24px;
  padding:0;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border:0;
  border-radius:6px;
  background:transparent;
  color:var(--dsw-alias-label-secondary);
  cursor:pointer;
  -webkit-app-region:no-drag;
}
[data-dsh-session-tabs-bar] .st-add:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary)}
[data-dsh-session-tabs-bar] .st-plus{width:12px;height:12px;flex:none}
[data-dsh-session-tabs-bar] .st-dot{width:6px;height:6px;flex:none;border-radius:50%;background:var(--dsw-alias-state-business-primary)}
[data-dsh-session-tabs-bar] .st-dot[data-pulse="true"]{animation:st-pulse 1.4s ease-in-out infinite}
@keyframes st-pulse{0%,100%{opacity:1}50%{opacity:.3}}
`;

    // ---------------------------------------------------------------- helpers

    function safeGet(ctx, name) {
      try {
        return ctx.get(name) || null;
      } catch (error) {
        return null;
      }
    }

    function readSnapshot(source) {
      if (!source) return null;
      try {
        if (typeof source.getSnapshot === 'function') return source.getSnapshot();
        return source.snapshot !== undefined ? source.snapshot : null;
      } catch (error) {
        return null;
      }
    }

    /** Subscribe to one observable snapshot; degrade to polling if it cannot. */
    function useSnapshot(source) {
      const [state, setState] = React.useState(() => readSnapshot(source));
      React.useEffect(() => {
        if (!source) {
          setState(null);
          return undefined;
        }
        setState(readSnapshot(source));
        let dispose = null;
        try {
          if (typeof source.subscribe === 'function') {
            dispose = source.subscribe(() => setState(readSnapshot(source)));
          }
        } catch (error) {
          dispose = null;
        }
        if (!dispose) {
          const handle = setInterval(() => setState(readSnapshot(source)), 1500);
          return () => clearInterval(handle);
        }
        return () => {
          try {
            if (typeof dispose === 'function') dispose();
          } catch (error) {
            /* already gone */
          }
        };
      }, [source]);
      return state;
    }

    function ensureStyleTag() {
      const selector = 'style[data-plugin-css=' + JSON.stringify(STYLE_TAG) + ']';
      const existing = document.querySelector(selector);
      if (existing) return existing;
      const tag = document.createElement('style');
      tag.dataset.plugin = 'dsh-session-tabs';
      tag.dataset.pluginCss = STYLE_TAG;
      tag.textContent = CSS;
      document.head.appendChild(tag);
      return tag;
    }

    function readLocale(ctx) {
      const service = safeGet(ctx, 'locale');
      if (!service) return '';
      try {
        const current = typeof service.getLocale === 'function' ? service.getLocale() : null;
        const active = current && (current.active || current.locale);
        return active ? String(active) : '';
      } catch (error) {
        return '';
      }
    }

    function readCollapsed() {
      try {
        const raw = window.localStorage.getItem(COLLAPSED_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        const out = {};
        if (Array.isArray(parsed)) {
          for (const key of parsed) if (typeof key === 'string' && key) out[key] = true;
        }
        return out;
      } catch (error) {
        return {};
      }
    }

    function writeCollapsed(map) {
      try {
        window.localStorage.setItem(COLLAPSED_KEY, JSON.stringify(Object.keys(map)));
      } catch (error) {
        /* storage may be unavailable */
      }
    }

    /** Tabs are opened explicitly; this is the ordered list of their Session ids. */
    function readOpen() {
      try {
        const raw = window.localStorage.getItem(OPEN_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        const out = [];
        if (Array.isArray(parsed)) {
          for (const id of parsed) {
            if (typeof id === 'string' && id && out.indexOf(id) === -1) out.push(id);
          }
        }
        return out;
      } catch (error) {
        return [];
      }
    }

    function writeOpen(ids) {
      try {
        window.localStorage.setItem(OPEN_KEY, JSON.stringify(ids));
      } catch (error) {
        /* storage may be unavailable */
      }
    }

    function baseName(path) {
      const text = String(path || '').replace(/[\\/]+$/, '');
      const parts = text.split(/[\\/]/).filter(Boolean);
      return parts.length ? parts[parts.length - 1] : '';
    }

    function isArchived(workspaceState, id) {
      const archived = workspaceState && workspaceState.archivedSessionIds;
      return Array.isArray(archived) && archived.includes(id);
    }

    function isRunning(summary) {
      if (!summary) return false;
      if (summary.running === true) return true;
      if (typeof summary.pendingSubmissions === 'number' && summary.pendingSubmissions > 0) return true;
      return false;
    }

    function sessionTitle(summary, text) {
      if (!summary) return text.untitled;
      if (summary.blank === true) return text.newSession;
      const display = typeof summary.displayTitle === 'string' ? summary.displayTitle.trim() : '';
      if (display) return display;
      const raw = typeof summary.title === 'string' ? summary.title.trim() : '';
      return raw || text.untitled;
    }

    function workspaceName(workspace, text) {
      const raw = typeof workspace.title === 'string' ? workspace.title.trim() : '';
      if (raw && raw !== 'default-workspace') return raw;
      return baseName(workspace.path) || text.defaultWorkspace;
    }

    function activeSessionId(listState) {
      const byId = (listState && listState.byId) || {};
      const ids = Array.isArray(listState && listState.ids) ? listState.ids : Object.keys(byId);
      for (const id of ids) {
        const summary = byId[id];
        if (!summary) continue;
        const retained = summary.retainedBy;
        if (retained && typeof retained.mainView === 'number' && retained.mainView > 0) return id;
      }
      return undefined;
    }

    /**
     * Opened Sessions -> collapsible groups. Tabs exist only for Sessions that
     * were actually opened (sidebar row, deep link, brand new draft): nothing is
     * loaded just to fill the strip, and the list keeps the order they were
     * opened in, so tabs never shuffle around while a conversation runs.
     *
     * Workspaces are the primary grouping; when the Workspace list is
     * unavailable (or a Session belongs to none) Sessions fall back to their
     * working directory, which is what a Project really is.
     *
     * Visibility follows the sidebar's own rules: subagent children stay with
     * their parent, only the selected New Session row is shown among blanks, and
     * archived Sessions are left out.
     */
    function buildGroups(listState, workspaceState, text, openIds) {
      const byId = (listState && listState.byId) || {};
      const current = activeSessionId(listState);
      const order = Array.isArray(openIds) ? openIds : [];
      const seen = new Set();
      const visible = [];
      for (const id of order) {
        if (seen.has(id)) continue;
        const summary = byId[id];
        if (!summary) continue;
        if (summary.origin === 'subagent') continue;
        if (summary.blank === true && id !== current) continue;
        if (isArchived(workspaceState, id)) continue;
        seen.add(id);
        visible.push(id);
      }
      if (!visible.length) return [];

      const claimed = new Set();
      const groups = [];
      const items = Array.isArray(workspaceState && workspaceState.items) ? workspaceState.items : [];

      for (const workspace of items) {
        const members = Array.isArray(workspace.sessionIds) ? workspace.sessionIds : [];
        const memberIds = visible.filter((id) => members.indexOf(id) !== -1);
        if (!memberIds.length) continue;
        for (const id of memberIds) claimed.add(id);
        groups.push({
          key: 'ws:' + String(workspace.workspaceId),
          title: workspaceName(workspace, text),
          path: typeof workspace.path === 'string' ? workspace.path : '',
          ids: memberIds,
        });
      }

      const loose = visible.filter((id) => !claimed.has(id));
      if (loose.length) {
        if (!items.length) {
          const buckets = new Map();
          for (const id of loose) {
            const cwd = String((byId[id] && byId[id].cwd) || '');
            if (!buckets.has(cwd)) buckets.set(cwd, []);
            buckets.get(cwd).push(id);
          }
          for (const [cwd, members] of buckets) {
            groups.push({
              key: 'cwd:' + cwd,
              title: baseName(cwd) || text.ungrouped,
              path: cwd,
              ids: members,
            });
          }
        } else {
          groups.push({
            key: UNGROUPED,
            title: text.ungrouped,
            path: '',
            ids: loose,
          });
        }
      }
      return groups;
    }

    function chevron() {
      return h(
        'svg',
        { className: 'st-chevron', viewBox: '0 0 12 12', 'aria-hidden': 'true', focusable: 'false' },
        h('path', {
          d: 'M4.5 2.5 8 6l-3.5 3.5',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '1.5',
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
        }),
      );
    }

    function plusIcon() {
      return h(
        'svg',
        { className: 'st-plus', viewBox: '0 0 12 12', 'aria-hidden': 'true', focusable: 'false' },
        h('path', {
          d: 'M6 2.5v7M2.5 6h7',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '1.5',
          strokeLinecap: 'round',
        }),
      );
    }

    function closeIcon() {
      return h(
        'svg',
        { className: 'st-x', viewBox: '0 0 8 8', 'aria-hidden': 'true', focusable: 'false' },
        h('path', {
          d: 'M1.25 1.25 6.75 6.75M6.75 1.25 1.25 6.75',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: '1.3',
          strokeLinecap: 'round',
        }),
      );
    }

    // -------------------------------------------------------------- component

    function TabBar(props) {
      const ctx = props.ctx;
      const sessions = safeGet(ctx, 'sessions');
      const workspaces = safeGet(ctx, 'workspaces');

      const listState = useSnapshot(sessions && sessions.list);
      const workspaceState = useSnapshot(workspaces && workspaces.list);

      const [locale, setLocale] = React.useState(() => readLocale(ctx));
      const [collapsed, setCollapsed] = React.useState(() => readCollapsed());
      const [openIds, setOpenIds] = React.useState(() => readOpen());
      const barRef = React.useRef(null);
      const scrollRef = React.useRef(null);
      const [edges, setEdges] = React.useState({ left: false, right: false });

      React.useEffect(() => {
        let off = null;
        try {
          off = ctx.on('locale/change', () => setLocale(readLocale(ctx)));
        } catch (error) {
          off = null;
        }
        return () => {
          try {
            if (typeof off === 'function') off();
          } catch (error) {
            /* ignore */
          }
        };
      }, [ctx]);

      const isZh = locale ? /^zh/i.test(locale) : true;
      const text = isZh ? TEXT.zh : TEXT.en;

      const groups = React.useMemo(
        () => buildGroups(listState, workspaceState, text, openIds),
        [listState, workspaceState, isZh, openIds],
      );
      const byId = (listState && listState.byId) || {};
      const activeId = React.useMemo(() => activeSessionId(listState), [listState]);
      const hasContent = groups.length > 0;

      // Push the whole frame down while the bar is showing, and let it fall back
      // to the shipped layout the moment the bar disappears.
      React.useEffect(() => {
        const doc = document.documentElement;
        if (hasContent) doc.setAttribute(ROOT_ATTR, 'on');
        else doc.removeAttribute(ROOT_ATTR);
        return () => doc.removeAttribute(ROOT_ATTR);
      }, [hasContent]);

      // A tab is created by opening a Session, never by listing it: whichever
      // Session the main view reveals (a sidebar row, a deep link, a brand new
      // draft) joins the strip, and its project comes along only then.
      const lastActive = React.useRef(undefined);
      React.useEffect(() => {
        const previous = lastActive.current;
        lastActive.current = activeId;
        if (!activeId || previous === activeId) return;
        setOpenIds((prev) => {
          if (prev.indexOf(activeId) !== -1) return prev;
          const next = prev.concat(activeId);
          writeOpen(next);
          return next;
        });
      }, [activeId]);

      // A browser always reveals the tab it switched to, so the group owning the
      // active Session is expanded as soon as its tab shows up. Collapse state
      // set by hand survives as long as the reader stays on that Session.
      const revealed = React.useRef(undefined);
      React.useEffect(() => {
        if (!activeId || revealed.current === activeId) return;
        const owner = groups.find((group) => group.ids.indexOf(activeId) !== -1);
        if (!owner) return;
        revealed.current = activeId;
        setCollapsed((prev) => {
          if (!prev[owner.key]) return prev;
          const next = Object.assign({}, prev);
          delete next[owner.key];
          writeCollapsed(next);
          return next;
        });
      }, [activeId, groups]);

      // Forget tabs whose Session was archived or removed, plus drafts left
      // behind, so a stored list cannot pile up entries that never render.
      React.useEffect(() => {
        const ids = listState && Array.isArray(listState.ids) ? listState.ids : null;
        if (!ids || !ids.length || (listState && listState.phase === 'pending')) return;
        setOpenIds((prev) => {
          const next = prev.filter((id) => {
            const summary = byId[id];
            if (!summary) return false;
            if (summary.origin === 'subagent') return false;
            if (summary.blank === true && id !== activeId) return false;
            if (isArchived(workspaceState, id)) return false;
            return true;
          });
          if (next.length === prev.length) return prev;
          writeOpen(next);
          return next;
        });
      }, [listState, workspaceState, activeId]);

      React.useEffect(() => {
        const root = barRef.current;
        if (!root || !activeId) return;
        const active = root.querySelector('[data-active="true"]');
        if (active && typeof active.scrollIntoView === 'function') {
          active.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
      }, [activeId, collapsed, groups]);

      // Fade the overflowed edge so a crowded strip shows it can be scrolled,
      // the way a browser tab strip does.
      React.useEffect(() => {
        const element = scrollRef.current;
        if (!element) return undefined;
        const measure = () => {
          const max = element.scrollWidth - element.clientWidth;
          const left = element.scrollLeft > 2;
          const right = max > 2 && element.scrollLeft < max - 2;
          setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }));
        };
        measure();
        element.addEventListener('scroll', measure, { passive: true });
        let observer = null;
        try {
          observer = new ResizeObserver(measure);
          observer.observe(element);
        } catch (error) {
          observer = null;
        }
        return () => {
          element.removeEventListener('scroll', measure);
          if (observer) observer.disconnect();
        };
      }, [groups, hasContent]);

      if (!hasContent) return null;

      const openSession = (id) => {
        if (!id || id === activeId) return;
        const uiWorkspace = safeGet(ctx, 'uiWorkspace');
        try {
          if (uiWorkspace && typeof uiWorkspace.openSession === 'function') {
            uiWorkspace.openSession(id);
            return;
          }
        } catch (error) {
          /* fall through */
        }
      };

      // A browser-style "+": start a draft session in the current workspace.
      const startNew = () => {
        const uiWorkspace = safeGet(ctx, 'uiWorkspace');
        try {
          if (uiWorkspace && typeof uiWorkspace.startSession === 'function') {
            uiWorkspace.startSession();
          }
        } catch (error) {
          /* nothing we can do from here */
        }
      };

      // "脳" unloads the tab only: the Session keeps living in its project and
      // opening it again from the sidebar brings the tab straight back.
      const closeTab = (id) => {
        if (!id || openIds.length < 2) return;
        const next = openIds.filter((other) => other !== id);
        if (next.length === openIds.length) return;
        writeOpen(next);
        setOpenIds(next);
        if (id !== activeId) return;
        const flat = [];
        for (const group of groups) for (const other of group.ids) flat.push(other);
        const position = flat.indexOf(id);
        const following = position === -1 ? undefined : flat[position + 1];
        const preceding = position <= 0 ? undefined : flat[position - 1];
        const neighbour = following !== undefined && following !== id ? following : preceding;
        if (neighbour !== undefined && next.indexOf(neighbour) !== -1) openSession(neighbour);
      };

      const toggleGroup = (key) => {
        setCollapsed((prev) => {
          const next = Object.assign({}, prev);
          if (next[key]) delete next[key];
          else next[key] = true;
          writeCollapsed(next);
          return next;
        });
      };

      const onWheel = (event) => {
        const element = event.currentTarget;
        if (!element || element.scrollWidth <= element.clientWidth + 1) return;
        if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) element.scrollLeft += event.deltaY;
      };

      const renderTab = (groupId, id) => {
        const summary = byId[id] || null;
        const title = sessionTitle(summary, text);
        const active = id === activeId;
        const running = isRunning(summary);
        const closable = openIds.length > 1;
        return h(
          'div',
          {
            key: groupId + '/' + id,
            role: 'tab',
            tabIndex: 0,
            className: 'st-tab',
            'data-active': active ? 'true' : 'false',
            'aria-selected': active ? 'true' : 'false',
            title,
            onClick: () => openSession(id),
            onAuxClick: (event) => {
              if (event.button === 1) {
                event.preventDefault();
                closeTab(id);
              }
            },
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openSession(id);
              }
            },
          },
          running
            ? h('span', { className: 'st-dot', 'data-pulse': active ? 'false' : 'true', 'aria-hidden': 'true' })
            : null,
          h('span', { className: 'st-title' }, title),
          closable
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'st-close',
                  tabIndex: -1,
                  title: text.close,
                  'aria-label': text.close,
                  onClick: (event) => {
                    event.stopPropagation();
                    closeTab(id);
                  },
                },
                closeIcon(),
              )
            : null,
        );
      };

      const renderGroup = (group) => {
        const isCollapsed = collapsed[group.key] === true;
        const hasActive = typeof activeId === 'string' && group.ids.includes(activeId);
        const hint = group.path ? group.path + '\n' : '';
        const action = isCollapsed ? text.expand : text.collapse;
        return h(
          'div',
          {
            key: group.key,
            className: 'st-group',
            'data-collapsed': isCollapsed ? 'true' : 'false',
          },
          h(
            'button',
            {
              type: 'button',
              className: 'st-head',
              'data-has-active': hasActive ? 'true' : 'false',
              'aria-expanded': isCollapsed ? 'false' : 'true',
              title: hint + group.title + ' · ' + action,
              onClick: () => toggleGroup(group.key),
            },
            chevron(),
            isCollapsed && hasActive
              ? h('span', { className: 'st-dot', 'data-pulse': 'true', 'aria-hidden': 'true' })
              : null,
            h('span', { className: 'st-name' }, group.title),
            h('span', { className: 'st-count' }, String(group.ids.length)),
          ),
          isCollapsed ? null : group.ids.map((id) => renderTab(group.key, id)),
        );
      };

      return h(
        'div',
        { ref: barRef, 'data-dsh-session-tabs-bar': '', role: 'tablist', 'aria-label': text.label },
        h(
          'div',
          {
            className: 'st-scroll',
            ref: scrollRef,
            onWheel,
            'data-edge-left': edges.left ? 'true' : 'false',
            'data-edge-right': edges.right ? 'true' : 'false',
          },
          groups.map((group) => renderGroup(group)),
        ),
        h(
          'div',
          { className: 'st-actions' },
          h(
            'button',
            {
              type: 'button',
              className: 'st-add',
              title: text.newSession,
              'aria-label': text.newSession,
              onClick: startNew,
            },
            plusIcon(),
          ),
        ),
      );
    }

    // ------------------------------------------------------------------- setup

    function apply(ctx) {
      // Styles live in <head>; the frame padding rule is scoped to <html data-...>.
      ctx.effect(() => {
        const tag = ensureStyleTag();
        return () => {
          try {
            if (tag && tag.parentNode) tag.parentNode.removeChild(tag);
          } catch (error) {
            /* ignore */
          }
          try {
            document.documentElement.removeAttribute(ROOT_ATTR);
          } catch (error) {
            /* ignore */
          }
        };
      });

      const Mounted = () => h(TabBar, { ctx });

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register({ name: 'shell.overlay', id: 'session-tabs', order: 40 }, Mounted),
      );
    }

    return {
      inject: ['slots', 'sessions', 'locale'],
      apply,
    };
  },
});
