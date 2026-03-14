"use client";
import { useEffect } from "react";

// AVACX context menu (single, clean implementation)

declare global {
  interface Window {
    __AVACX_CONTEXT_MENU_INITIALIZED__?: boolean;
    destroyAVACXContextMenu?: () => void;
  }
}

type ActionItem = { label: string; onClick: () => void; hint?: string; className?: string };
type SeparatorAction = { type: "separator" };
type CtxAction = ActionItem | SeparatorAction;

const ACTIONS: CtxAction[] = [
  { label: "Refresh", onClick: () => window.location.reload() },
  { label: "Dashboard", onClick: () => { window.location.href = "/dashboard"; } },
  { type: "separator" },
  { label: "AVACX", onClick: () => {} },
  { label: "Control", onClick: () => {} },
  { type: "separator" },
  { label: "Back", onClick: () => window.history.back() },
  { label: "Forward", onClick: () => window.history.forward() },
  { type: "separator" },
  { label: "Close", onClick: () => {} },
];

export function initAVACXContextMenu() {
  if (typeof window === "undefined" || window.__AVACX_CONTEXT_MENU_INITIALIZED__) return;
  window.__AVACX_CONTEXT_MENU_INITIALIZED__ = true;

  const menu = createMenuElement();
  appendStyles();
  const hide = () => {
    if (menu.style.display !== "none") menu.style.display = "none";
  };
  renderMenu(menu, ACTIONS, hide);
  document.body.appendChild(menu);

  const show = (x: number, y: number) => {
    menu.style.display = "block";
    menu.style.opacity = "0";
    const padding = 4;
    const rect = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = x;
    let top = y;
    if (left + rect.width + padding > vw) left = vw - rect.width - padding;
    if (top + rect.height + padding > vh) top = vh - rect.height - padding;
    if (left < padding) left = padding;
    if (top < padding) top = padding;
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
    setTimeout(() => {
      menu.focus();
      menu.style.opacity = "1";
    }, 0);
  };

  const handleContext = (event: MouseEvent) => {
    event.preventDefault();
    hide();
    show(event.clientX, event.clientY);
  };

  const handleClick = (event: MouseEvent) => {
    if (!menu.contains(event.target as Node)) hide();
  };

  const handleEsc = (event: KeyboardEvent) => {
    if (event.key === "Escape") hide();
    if ((event.key === "r" || event.key === "R") && menu.style.display === "block") {
      event.preventDefault();
      window.location.reload();
    }
  };

  const handleResizeScroll = () => hide();

  window.addEventListener("contextmenu", handleContext);
  window.addEventListener("click", handleClick);
  window.addEventListener("scroll", handleResizeScroll, true);
  window.addEventListener("resize", handleResizeScroll);
  window.addEventListener("keydown", handleEsc);

  window.destroyAVACXContextMenu = () => {
    window.removeEventListener("contextmenu", handleContext);
    window.removeEventListener("click", handleClick);
    window.removeEventListener("scroll", handleResizeScroll, true);
    window.removeEventListener("resize", handleResizeScroll);
    window.removeEventListener("keydown", handleEsc);
    menu.remove();
    delete window.__AVACX_CONTEXT_MENU_INITIALIZED__;
  };
}

export function useRightClickPopup(enabled: boolean) {
  useEffect(() => {
    if (!enabled) {
      window.destroyAVACXContextMenu?.();
      return;
    }
    initAVACXContextMenu();
    return () => window.destroyAVACXContextMenu?.();
  }, [enabled]);
}

export default initAVACXContextMenu;

function createMenuElement() {
  const menu = document.createElement("div");
  menu.id = "avacx-context-menu";
  menu.setAttribute("role", "menu");
  menu.style.position = "fixed";
  menu.style.top = "0";
  menu.style.left = "0";
  menu.style.zIndex = "9999";
  menu.style.minWidth = "220px";
  menu.style.padding = "6px";
  menu.style.display = "none";
  menu.style.background = "#161616";
  menu.style.border = "1px solid #464647";
  menu.style.borderRadius = "0";
  menu.style.boxShadow = "0 10px 28px -6px rgba(0,0,0,0.55), 0 2px 6px rgba(0,0,0,0.35)";
  menu.style.fontFamily = "'Jura', 'Tomorrow', sans-serif";
  menu.style.color = "#cccccc";
  menu.style.fontSize = "13px";
  menu.style.lineHeight = "1.3";
  menu.style.userSelect = "none";
  menu.style.cursor = "default";
  menu.style.maxHeight = "60vh";
  menu.style.overflowY = "auto";
  menu.style.backdropFilter = "blur(4px)";
  menu.style.overflowX = "hidden";
  menu.style.maxWidth = "calc(100vw - 32px)";
  (menu.style as unknown as Record<string, string>)["webkitOverflowScrolling"] = "touch";
  return menu;
}

function appendStyles() {
  const styleId = "avacx-context-style";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent =
    "@keyframes avacxCtxFade {from {opacity:0; transform:scale(.96)} to {opacity:1; transform:scale(1)}}\n" +
    "#avacx-context-menu {scrollbar-width: thin; scrollbar-color:#555 transparent;}\n" +
    "#avacx-context-menu::-webkit-scrollbar {width:8px;}\n" +
    "#avacx-context-menu::-webkit-scrollbar-track {background:transparent;}\n" +
    "#avacx-context-menu::-webkit-scrollbar-thumb {background:#3a3a3a; border-radius:4px;}\n" +
    "#avacx-context-menu button {all:unset; display:flex; align-items:center; gap:10px; width:100%; padding:9px 14px; border-radius:0; color:#cccccc; font-weight:500; letter-spacing:.25px; transition: none; cursor:pointer; word-break:break-word; overflow-wrap:anywhere;}\n" +
    "#avacx-context-menu button:hover {background:#323538; color:#ffffff;}\n" +
    "#avacx-context-menu button:active {background:#3b3e41;}\n" +
    "#avacx-context-menu hr {border:none; border-top:1px solid #464647; margin:6px 6px;}\n" +
    "#avacx-context-menu .hint {margin-left:auto; font-size:11px; opacity:.55; font-weight:400; color:#999999;}\n" +
    "#avacx-context-menu .danger {color:#ff6b6b;} #avacx-context-menu .danger:hover {color:#ffc1c1; background:rgba(255,107,107,0.1);}\n" +
    "#avacx-context-menu:focus {outline:1px solid #007acc;}";
  document.head.appendChild(style);
}

function renderMenu(menu: HTMLDivElement, actions: CtxAction[], hide: () => void) {
  const addItem = (action: ActionItem) => {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.textContent = action.label;
    if (action.hint) {
      const span = document.createElement("span");
      span.className = "hint";
      span.textContent = action.hint;
      button.appendChild(span);
      button.insertBefore(document.createTextNode(action.label), span);
    }
    if (action.className) button.classList.add(action.className);
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      hide();
      action.onClick();
    });
    menu.appendChild(button);
  };

  const addSeparator = () => {
    const hr = document.createElement("hr");
    menu.appendChild(hr);
  };

  actions.forEach((action) => {
    if ((action as SeparatorAction).type === "separator") {
      addSeparator();
      return;
    }
    addItem(action as ActionItem);
  });
}