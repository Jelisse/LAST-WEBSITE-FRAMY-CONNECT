'use client';
import { useState } from 'react';
export function AgentAction({
  id,
  version,
  status,
}: {
  id: string;
  version: number;
  status: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const step =
    status === 'QUEUED'
      ? 'start'
      : status === 'IN_PRODUCTION'
        ? 'ready'
        : status === 'READY'
          ? 'deliver'
          : null;
  if (!step) return null;
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setError('');
        try {
          const r = await fetch('/api/manager', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'order',
              orderId: id,
              version,
              step,
              qc: f.get('qc') === 'on',
              proof: f.get('proof'),
            }),
          });
          const b = (await r.json()) as { error: string };
          if (!r.ok) throw Error(b.error);
          location.reload();
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Tente novamente.');
          setBusy(false);
        }
      }}
    >
      {step === 'ready' && (
        <label>
          <input type="checkbox" name="qc" required /> Confirmo que o controlo
          de qualidade foi concluído
        </label>
      )}
      {step === 'deliver' && (
        <label>
          Comprovativo de entrega{' '}
          <input name="proof" required minLength={5} maxLength={250} />
        </label>
      )}
      <button className="btn btn-primary" disabled={busy}>
        {busy
          ? 'A guardar…'
          : step === 'start'
            ? 'Iniciar produção'
            : step === 'ready'
              ? 'Pronto para entrega'
              : 'Confirmar entrega'}
      </button>
      {error && <p role="alert">{error}</p>}
    </form>
  );
}
