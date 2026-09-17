'use client';
import { clearPrivateDeviceData } from '@/lib/client-privacy';
import { useEffect, useState } from 'react';
export default function Page() {
  const [error, setError] = useState(false);
  useEffect(() => {
    fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    })
      .then((r) => {
        if (!r.ok) throw Error();
        try {
          clearPrivateDeviceData();
        } catch {
          /* Browser storage can be unavailable. */
        }
        location.replace('/');
      })
      .catch(() => setError(true));
  }, []);
  return (
    <main style={{ padding: 40 }}>
      {error ? (
        <button onClick={() => location.reload()}>
          Tentar terminar sessão novamente
        </button>
      ) : (
        'A terminar sessão…'
      )}
    </main>
  );
}
