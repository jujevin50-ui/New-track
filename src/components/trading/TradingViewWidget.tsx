import { useEffect, useRef, memo } from 'react';

interface TradingViewWidgetProps {
  symbol?: string;
  interval?: string;
  theme?: 'dark' | 'light';
}

const TradingViewWidget = memo(({ symbol = 'FX:EURUSD', interval = '60', theme = 'dark' }: TradingViewWidgetProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.type = 'text/javascript';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: 'Etc/UTC',
      theme,
      style: '1',
      locale: 'en',
      enable_publishing: false,
      hide_top_toolbar: false,
      hide_legend: false,
      save_image: false,
      calendar: false,
      support_host: 'https://www.tradingview.com',
    });

    containerRef.current.appendChild(script);
    scriptRef.current = script;

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [symbol, interval, theme]);

  return (
    <div className="tradingview-widget-container w-full h-full" ref={containerRef}>
      <div className="tradingview-widget-container__widget w-full h-full" />
    </div>
  );
});

TradingViewWidget.displayName = 'TradingViewWidget';
export default TradingViewWidget;
