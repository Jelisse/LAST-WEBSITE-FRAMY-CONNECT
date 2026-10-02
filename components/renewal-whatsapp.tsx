'use client';
import { useI18n } from '@/components/language-provider';
import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { whatsappReminderURL, type manualRenewal } from '@/lib/manual-renewal';

export type RenewalContact = {
  owner_id: string;
  name: string;
  email: string;
  whatsapp?: string | null;
  renewal: ReturnType<typeof manualRenewal>;
};

function ContactReminder({ member }: { member: RenewalContact }) {
  const { t } = useI18n();
  const [phone, setPhone] = useState(member.whatsapp ?? '');
  const [opened, setOpened] = useState(false);
  const renewal = member.renewal!;
  const url = whatsappReminderURL(phone, renewal.message);
  const inputId = `renewal-phone-${member.owner_id}`;
  return (
    <article className="manager-card renewal-contact">
      <h3>{member.name}</h3>
      <p>{member.email}</p>
      <p>
        <strong>{renewal.plan}</strong> ·{' '}
        {t(renewal.expired ? 'Venceu' : 'Termina')} {t(' em ')}
        {new Date(renewal.expiry).toLocaleDateString('pt-MZ', {
          timeZone: 'Africa/Maputo',
        })}
      </p>
      <label htmlFor={inputId}>
        {t('WhatsApp com indicativo internacional')}
      </label>
      <input
        id={inputId}
        type="tel"
        value={phone}
        placeholder={t('+258 84 000 0000')}
        onChange={(e) => {
          setPhone(e.target.value);
          setOpened(false);
        }}
        aria-describedby={`${inputId}-help`}
      />
      <small id={`${inputId}-help`}>
        {t(
          member.whatsapp
            ? 'Número do WhatsApp publicado no perfil. Confirme o destinatário.'
            : 'Indique o WhatsApp do cliente. Este número não será guardado no perfil.',
        )}
      </small>
      {phone && !url && (
        <output>
          {t('Use o indicativo internacional, por exemplo +258840000000.')}
        </output>
      )}
      <details>
        <summary>{t('Pré-visualizar mensagem')}</summary>
        <p className="renewal-message">{renewal.message}</p>
      </details>
      {url ? (
        <a
          className="button"
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpened(true)}
        >
          <MessageCircle size={18} aria-hidden="true" />{' '}
          {t(' Lembrar por WhatsApp ↗')}
        </a>
      ) : (
        <button type="button" disabled>
          {t('Lembrar por WhatsApp')}
        </button>
      )}
      {opened && (
        <output>
          {t(
            'Conversa aberta. Confirme o envio no WhatsApp; não foi registada uma mensagem enviada.',
          )}
        </output>
      )}
    </article>
  );
}

export function RenewalWhatsApp({
  members,
  daysBefore,
  truncated,
}: {
  members: RenewalContact[];
  daysBefore: number;
  truncated: boolean;
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const due = members.filter((m) => m.renewal);
  const filtered = due.filter(
    (m) =>
      (filter === 'all' || m.renewal!.expired === (filter === 'expired')) &&
      `${m.name} ${m.email} ${m.renewal!.plan}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section
      className="manager-card renewal-whatsapp"
      aria-label={t('Lembretes por WhatsApp')}
    >
      <h2>
        <MessageCircle size={22} aria-hidden="true" />{' '}
        {t(' Lembretes por WhatsApp')}
      </h2>
      <p>
        {t('Pacotes que terminam nos próximos ')}
        {daysBefore}{' '}
        {t(
          ' dias ou já venceram. A mensagem inclui o link dos pacotes. Clientes com o próximo período já pago não aparecem aqui.',
        )}
      </p>
      <p>
        {t(
          'Reveja o destinatário e a mensagem. O botão abre o WhatsApp; é necessário confirmar o envio na aplicação.',
        )}
      </p>
      <div className="suite-toolbar">
        <input
          aria-label={t('Pesquisar lembretes')}
          placeholder={t('Nome, email ou pacote')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          aria-label={t('Filtrar validade dos lembretes')}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">
            {t('Todos (')}
            {due.length})
          </option>
          <option value="upcoming">{t('A terminar')}</option>
          <option value="expired">{t('Vencidos')}</option>
        </select>
      </div>
      {truncated && (
        <output>
          {t(
            'A consulta está limitada aos primeiros 500 clientes por validade; esta lista pode não incluir todos os lembretes.',
          )}
        </output>
      )}
      <div className="suite-grid">
        {filtered.map((m) => (
          <ContactReminder
            key={`${m.owner_id}:${m.renewal!.expiry}`}
            member={m}
          />
        ))}
      </div>
      {!filtered.length && (
        <p>{t('Nenhum pacote corresponde a estes filtros.')}</p>
      )}
    </section>
  );
}
