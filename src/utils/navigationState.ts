let navigationCooldownUntil = 0;

export function setNavigationInProgress(cooldownMs = 200): void {
  navigationCooldownUntil = Date.now() + cooldownMs;
}

export function isNavigationInProgress(): boolean {
  return Date.now() < navigationCooldownUntil;
}
