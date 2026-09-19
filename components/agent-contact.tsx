'use client';
import { useI18n } from './language-provider';
import type { CustomerOrder } from '@/lib/customer-order';
export function AgentContact({ order }: { order: CustomerOrder }) {
  const { t } = useI18n();
  const contact = order.agentContact;
  const phone = contact?.phone.replace(/[^+0-9]/g, '') || '';
  return <section className="panel">
    <h3>{t('Contacto do agente')}</h3>
    {contact ? <><p>{contact.name}</p>{phone ? <a className="btn" href={'tel:' + phone}>{t('Ligar ao agente')}: {contact.phone}</a> : <p>{t('Contacto ainda não disponível. Contacte a equipa.')}</p>}</> : <p>{t('O contacto será apresentado quando um agente for atribuído.')}</p>}
    <p><a href="mailto:support@framyconnect.co.mz">{t('Contactar a equipa')}</a></p>
  </section>;
}
