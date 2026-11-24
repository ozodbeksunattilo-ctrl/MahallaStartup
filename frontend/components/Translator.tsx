'use client';

import { useEffect } from 'react';
import { translate, useLang } from '@/lib/i18n';

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'NOSCRIPT']);
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;

interface Pair {
  orig: string;
  out: string;
}

// Tarjima qilingan tugunlar: asl va tarjima matni. React matnni o'zi yangilasa, qayta tarjima qilinadi.
const texts = new WeakMap<Text, Pair>();
const attrs = new WeakMap<Element, Record<string, Pair>>();

const skipped = (el: Element | null) => !el || SKIP_TAGS.has(el.tagName) || el.closest('[data-notranslate]') !== null;

function visitText(node: Text): void {
  if (skipped(node.parentElement)) return;
  const cur = node.nodeValue ?? '';
  const known = texts.get(node);
  if (known && known.out === cur) return;
  const out = translate(cur);
  if (out !== cur) {
    texts.set(node, { orig: cur, out });
    node.nodeValue = out;
  } else {
    texts.delete(node);
  }
}

function visitAttr(el: Element, name: string): void {
  if (skipped(el)) return;
  const cur = el.getAttribute(name);
  if (cur === null) return;
  const map = attrs.get(el) ?? {};
  const known = map[name];
  if (known && known.out === cur) return;
  const out = translate(cur);
  if (out !== cur) {
    map[name] = { orig: cur, out };
    attrs.set(el, map);
    el.setAttribute(name, out);
  } else if (known) {
    delete map[name];
  }
}

function walk(root: Node, fn: (node: Node) => void): void {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
  let n: Node | null = root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.TEXT_NODE ? root : w.nextNode();
  if (n === root) fn(root);
  while ((n = w.nextNode())) fn(n);
}

function translateTree(root: Node): void {
  walk(root, (n) => {
    if (n.nodeType === Node.TEXT_NODE) visitText(n as Text);
    else if (n.nodeType === Node.ELEMENT_NODE) for (const a of ATTRS) visitAttr(n as Element, a);
  });
}

function restoreTree(root: Node): void {
  walk(root, (n) => {
    if (n.nodeType === Node.TEXT_NODE) {
      const known = texts.get(n as Text);
      if (known && n.nodeValue === known.out) n.nodeValue = known.orig;
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      const el = n as Element;
      const map = attrs.get(el);
      if (!map) return;
      for (const [name, pair] of Object.entries(map)) {
        if (el.getAttribute(name) === pair.out) el.setAttribute(name, pair.orig);
      }
    }
  });
}

/**
 * Sahifani tanlangan tilga o'giradi: matnlar va placeholder/title kabi atributlar o'zbekchadan
 * lug'at (lib/i18n.ts) bo'yicha almashtiriladi. Keyin paydo bo'lgan matnlar ham kuzatiladi.
 * Foydalanuvchi kiritgan kontentni o'tkazib yuborish uchun elementga `data-notranslate` qo'ying.
 */
export function Translator() {
  const lang = useLang();

  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang === 'uz') {
      restoreTree(document.body);
      return;
    }
    translateTree(document.body);
    const observer = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'characterData') visitText(r.target as Text);
        else if (r.type === 'attributes') visitAttr(r.target as Element, r.attributeName ?? '');
        else r.addedNodes.forEach((n) => translateTree(n));
      }
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [...ATTRS],
    });
    return () => {
      observer.disconnect();
      restoreTree(document.body);
    };
  }, [lang]);

  return null;
}
