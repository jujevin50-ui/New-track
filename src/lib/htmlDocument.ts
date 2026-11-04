/** Preserve a complete HTML document and run its charts inside an opaque-origin frame. */
export async function htmlFrame(source: string): Promise<string> {
  const document = new DOMParser().parseFromString(source, 'text/html');
  const chartScripts = Array.from(document.querySelectorAll('script[src]')).filter(script =>
    /\/chart(?:\.umd)?(?:\.min)?\.js(?:[?#]|$)/i.test(script.getAttribute('src') || '')
  );

  if (chartScripts.length) {
    // The UMD distribution supplies window.Chart to scripts in the document;
    // bundling it locally avoids a dependency on the document's external CDN.
    const { default: chartSource } = await import('../../node_modules/chart.js/dist/chart.umd.js?raw');
    for (const original of chartScripts) {
      const script = document.createElement('script');
      script.textContent = chartSource.replace(/<\/script/gi, '<\\/script');
      original.replaceWith(script);
    }
  }

  document.querySelectorAll('base, meta[http-equiv="refresh" i]').forEach(element => element.remove());
  const policy = document.createElement('meta');
  policy.httpEquiv = 'Content-Security-Policy';
  policy.content = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; base-uri 'none'; form-action 'none'";
  document.head.prepend(policy);
  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}
