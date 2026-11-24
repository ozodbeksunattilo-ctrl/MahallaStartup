/** Expo terminali / Metro konsoli uchun yagona log: `[Mahalladosh][teg] xabar`. Dev rejimida yoki EXPO_PUBLIC_DEBUG=true (test APK) da. */
function emit(level: 'log' | 'warn' | 'error', tag: string, args: unknown[]): void {
  if (!__DEV__ && process.env.EXPO_PUBLIC_DEBUG !== 'true') return;
  console[level](`[Mahalladosh][${tag}]`, ...args);
}

export const log = {
  info: (tag: string, ...args: unknown[]) => emit('log', tag, args),
  warn: (tag: string, ...args: unknown[]) => emit('warn', tag, args),
  error: (tag: string, ...args: unknown[]) => emit('error', tag, args),
};
