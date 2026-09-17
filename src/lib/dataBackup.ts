// Export all localStorage trading data as JSON file
export const exportAllData = () => {
  const keys = [
    'trading-journal-accounts',
    'trading-journal-active-account',
    'trading-journal-trades-v2',
    'trading-journal-daily-v1',
    'trading-strategy-docs',
    'trading-journal-pending-orders',
    'trading-journal-dashboard-config',
    'trading-journal-weekly-reports',
  ];

  const data: Record<string, any> = {};
  keys.forEach(key => {
    const val = localStorage.getItem(key);
    if (val) data[key] = JSON.parse(val);
  });

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trading-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// Import data from JSON file, returns true on success
export const importAllData = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (typeof data !== 'object' || data === null) {
          resolve(false);
          return;
        }
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
        resolve(true);
      } catch {
        resolve(false);
      }
    };
    reader.onerror = () => resolve(false);
    reader.readAsText(file);
  });
};
