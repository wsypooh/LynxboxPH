import { useEffect, useState } from 'react';

export const usePropertyRefresh = (refreshInterval = 30000) => {
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      // Check if properties have been updated via API
      fetch('/api/properties/last-updated')
        .then(res => res.json())
        .then(data => {
          if (data.lastUpdated > lastUpdate) {
            setLastUpdate(data.lastUpdated);
            // Trigger data refresh in components
            window.dispatchEvent(new CustomEvent('propertyDataUpdated'));
          }
        })
        .catch(console.error);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [lastUpdate, refreshInterval]);

  return lastUpdate;
};
