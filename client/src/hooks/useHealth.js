import { useState, useEffect } from 'react';
import { checkHealth } from '../services/api.js';

/**
 * Custom hook to verify backend API health and connectivity status.
 */
export const useHealth = () => {
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    checkHealth()
      .then((data) => {
        if (isMounted) {
          setStatus(data.status || 'ok');
          setError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setStatus('offline');
          setError(err.message);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { status, error };
};

export default useHealth;
