export function getWhatsAppWebFallbackHref(appHref) {
  try {
    const appUrl = new URL(appHref);
    const phone = appUrl.searchParams.get('phone') ?? '';
    const text = appUrl.searchParams.get('text') ?? '';
    const params = new URLSearchParams();
    if (phone) params.set('phone', phone);
    if (text) params.set('text', text);
    return `https://api.whatsapp.com/send?${params.toString()}`;
  } catch {
    return '';
  }
}

export function scheduleWhatsAppWebFallback({
  fallbackHref,
  navigate = (href) => window.location.assign(href),
  documentObject = document,
  windowObject = window,
  delayMs = 1200
}) {
  if (!fallbackHref) return () => {};

  let timerId;
  const cleanup = () => {
    if (timerId !== undefined) clearTimeout(timerId);
    documentObject.removeEventListener('visibilitychange', handleVisibilityChange);
    windowObject.removeEventListener('pagehide', cleanup);
    windowObject.removeEventListener('blur', cleanup);
  };
  const handleVisibilityChange = () => {
    if (documentObject.visibilityState === 'hidden') cleanup();
  };

  documentObject.addEventListener('visibilitychange', handleVisibilityChange);
  windowObject.addEventListener('pagehide', cleanup);
  windowObject.addEventListener('blur', cleanup);
  timerId = setTimeout(() => {
    cleanup();
    if (documentObject.visibilityState !== 'hidden') navigate(fallbackHref);
  }, delayMs);

  return cleanup;
}

export function scheduleWhatsAppHrefFallback(appHref) {
  scheduleWhatsAppWebFallback({ fallbackHref: getWhatsAppWebFallbackHref(appHref) });
}
