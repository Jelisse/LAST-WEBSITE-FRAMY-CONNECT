'use client';
import { useState } from 'react';
import {
  availableAgentActions,
  agentActionLabels,
  qualityChecks,
  type AgentOrder,
  type AgentActionName,
} from '@/lib/agent-workflow';
export function AgentAction({
  order,
  onSave,
  busy,
}: {
  order: AgentOrder;
  onSave: (data: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  const [note, setNote] = useState(order.fulfilment?.note ?? '');
  const actions = availableAgentActions(order);
  return (
    <div className="agent-actions">
      {actions
        .filter((a) => a !== 'note')
        .map((step: AgentActionName) => (
          <form
            key={step}
            onSubmit={async (e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              await onSave({
                action: 'order',
                orderId: order.id,
                version: order.version,
                step,
                ...Object.fromEntries(form),
                tested: form.has('tested'),
                packaged: form.has('packaged'),
                customerConfirmed: form.has('customerConfirmed'),
                quality: Object.fromEntries(
                  Object.keys(qualityChecks).map((key) => [key, form.has(key)]),
                ),
              });
            }}
          >
            <fieldset disabled={busy}>
              {step === 'start' && (
                <p>
                  Confirme o produto e o link aprovado antes de iniciar. O
                  pagamento foi confirmado por Operações.
                </p>
              )}
              {step === 'program' && (
                <>
                  <label>
                    Link lido no teste NFC
                    <input
                      name="verifiedUrl"
                      type="url"
                      required
                      placeholder="Cole o link aberto pelo NFC"
                    />
                  </label>
                  <label className="agent-check">
                    <input type="checkbox" name="tested" required />
                    Programei e testei o NFC no produto físico.
                  </label>
                </>
              )}
              {step === 'ready' &&
                Object.entries(qualityChecks).map(([key, label]) => (
                  <label className="agent-check" key={key}>
                    <input type="checkbox" name={key} required />
                    {label}
                  </label>
                ))}
              {step === 'package' && (
                <label className="agent-check">
                  <input type="checkbox" name="packaged" required />
                  Produto protegido, embalado e identificado para o cliente
                  correcto.
                </label>
              )}
              {step === 'dispatch' && (
                <>
                  <label>
                    Transportadora / método aprovado
                    <input
                      name="courier"
                      required
                      maxLength={100}
                      placeholder="Transportadora ou recolha em Maputo"
                    />
                  </label>
                  <label>
                    Referência / código de rastreio
                    <input name="tracking" required maxLength={150} />
                  </label>
                </>
              )}
              {step === 'deliver' && (
                <>
                  <label>
                    Comprovativo / confirmação de recepção
                    <input
                      name="proof"
                      required
                      minLength={5}
                      maxLength={250}
                    />
                  </label>
                  <label className="agent-check">
                    <input type="checkbox" name="customerConfirmed" required />O
                    cliente confirmou a recepção.
                  </label>
                </>
              )}
              <button className="agent-primary" type="submit">
                {busy ? 'A guardar…' : agentActionLabels[step]}
              </button>
            </fieldset>
          </form>
        ))}
      {actions.includes('note') && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void onSave({
              action: 'order',
              orderId: order.id,
              version: order.version,
              step: 'note',
              note,
            });
          }}
        >
          <fieldset disabled={busy}>
            <label>
              Nota operacional
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                required
                maxLength={1500}
              />
            </label>
            <button className="agent-secondary">Guardar nota</button>
          </fieldset>
        </form>
      )}
      {!actions.length && (
        <p>
          {order.status === 'DELIVERED'
            ? 'Entrega concluída.'
            : order.status === 'CANCELLED'
              ? 'Pedido cancelado por Operações.'
              : 'Produção bloqueada. Peça a Operações para confirmar o pagamento e o link aprovado.'}
        </p>
      )}
    </div>
  );
}
