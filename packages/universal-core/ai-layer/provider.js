// packages/universal-core/ai-layer/provider.js

// Minimal AI provider registry and facade. Providers can register themselves
// with registerProvider(name, impl) where impl exposes classify(text) and
// generate(prompt, opts) functions. If no provider is registered the
// facade will throw or return null so callers can gracefully fallback.

let activeProvider = null;

export function registerProvider(name, impl) {
  activeProvider = { name, impl };
}

export function getActiveProvider() {
  return activeProvider;
}

export async function classify(text, opts = {}) {
  if (!activeProvider) throw new Error('No AI provider registered');
  return activeProvider.impl.classify(text, opts);
}

export async function generate(prompt, opts = {}) {
  if (!activeProvider) throw new Error('No AI provider registered');
  return activeProvider.impl.generate(prompt, opts);
}
