import { describe, expect, it } from 'vitest';
import { htmlFrame } from './htmlDocument';

describe('HTML document reader', () => {
  it('preserves the original document layout and inline chart scripts', async () => {
    const result = await htmlFrame('<!doctype html><html lang="fr"><head><title>Bilan</title><style>body { margin: 12px; }</style></head><body><canvas id="chart"></canvas><script>window.renderChart = true;</script></body></html>');
    const document = new DOMParser().parseFromString(result, 'text/html');
    expect(document.title).toBe('Bilan');
    expect(document.querySelector('style')?.textContent).toContain('margin: 12px');
    expect(document.querySelector('script')?.textContent).toContain('window.renderChart = true');
    expect(document.querySelector('article')).toBeNull();
  });

  it('embeds Chart.js locally before the chart initialization script', async () => {
    const result = await htmlFrame('<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js"></script><canvas id="equity"></canvas><script>new Chart(document.getElementById("equity"), {});</script>');
    const document = new DOMParser().parseFromString(result, 'text/html');
    expect(document.querySelector('script[src]')).toBeNull();
    const scripts = Array.from(document.querySelectorAll('script'));
    expect(scripts).toHaveLength(2);
    expect(scripts[0].textContent).toContain('Chart.js');
    expect(scripts[1].textContent).toContain('new Chart(');
  });

  it('blocks network resources and removes document redirects', async () => {
    const result = await htmlFrame('<head><base href="https://example.com"><meta http-equiv="refresh" content="0;url=https://example.com"></head><body>Rapport</body>');
    const document = new DOMParser().parseFromString(result, 'text/html');
    expect(document.querySelector('base, meta[http-equiv="refresh"]')).toBeNull();
    const policy = document.head.firstElementChild;
    expect(policy?.getAttribute('http-equiv')).toBe('Content-Security-Policy');
    expect(policy?.getAttribute('content')).toContain("default-src 'none'");
    expect(policy?.getAttribute('content')).toContain("connect-src 'none'");
  });
});
