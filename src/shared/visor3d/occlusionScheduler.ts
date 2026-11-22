const interval = 1000 / 15;

export function createOcclusionScheduler(refresh: () => void) {
  let lastSample = -Infinity;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
    lastSample = -Infinity;
  }

  function sample(immediate = false) {
    const now = performance.now();
    const remaining = interval - (now - lastSample);
    if (immediate || remaining <= 0) {
      cancel();
      lastSample = now;
      return true;
    }
    // A skipped change still gets an accurate pass, even if there is no next frame.
    timer ??= setTimeout(() => {
      timer = undefined;
      lastSample = performance.now();
      refresh();
    }, Math.ceil(remaining));
    return false;
  }

  return { sample, cancel };
}
