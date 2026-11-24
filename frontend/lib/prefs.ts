'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'mhd_sidebar';
let collapsed = false;
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
  if (loaded || typeof window === 'undefined') return;
  loaded = true;
  try {
    collapsed = window.localStorage.getItem(KEY) === 'collapsed';
  } catch {
    // localStorage yopiq bo'lsa — menyu ochiq qoladi
  }
}

function getCollapsed(): boolean {
  load();
  return collapsed;
}

export function toggleSidebar(): void {
  load();
  collapsed = !collapsed;
  try {
    window.localStorage.setItem(KEY, collapsed ? 'collapsed' : 'open');
  } catch {
    // saqlanmasa ham joriy sessiyada ishlaydi
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Yon menyu yig'ilganmi (brauzerda eslab qolinadi). */
export function useSidebarCollapsed(): boolean {
  return useSyncExternalStore(subscribe, getCollapsed, () => false);
}
