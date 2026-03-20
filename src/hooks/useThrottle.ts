'use client';

import { useState, useEffect, useRef } from 'react';

export function useThrottle<T>(value: T, intervalMs: number): T {
  const [throttled, setThrottled] = useState(value);
  const lastUpdated = useRef<number>(0);

  useEffect(() => {
    // Initialize on first mount
    if (lastUpdated.current === 0) {
      lastUpdated.current = Date.now();
    }
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdated.current;

    if (timeSinceLastUpdate >= intervalMs) {
      const timer = setTimeout(() => {
        setThrottled(value);
      }, 0);
      lastUpdated.current = now;
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => {
        setThrottled(value);
        lastUpdated.current = Date.now();
      }, intervalMs - timeSinceLastUpdate);
      return () => clearTimeout(timer);
    }
  }, [value, intervalMs]);

  return throttled;
}
