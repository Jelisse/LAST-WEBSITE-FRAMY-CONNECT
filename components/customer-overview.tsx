'use client';

import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Package,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { money } from '@/lib/catalog';
import { orderLabels, type SandboxOrder } from '@/lib/domain';
import type { WorkspaceData } from '@/lib/profile-types';

const orderDate = (value: string) =>
  new Intl.DateTimeFormat('pt-MZ', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Africa/Maputo',
  }).format(new Date(value));

export function CustomerOverview({
  data,
  displayName,
  onNavigate,
  onInspect,
}: {
  data: WorkspaceData;
  displayName: string;
  onNavigate: (tab: string) => void;
  onInspect: (order: SandboxOrder) => void;
}) {
  const saved = data.profile;
  const recent = [...data.orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
  const pending = data.orders.filter(
    (order) => order.status === 'PENDING_PAYMENT',
  ).length;
  const active = data.orders.filter((order) =>
    ['QUEUED', 'IN_PRODUCTION', 'READY'].includes(order.status),
  ).length;
  const delivered = data.orders.filter(
    (order) => order.status === 'DELIVERED',
  ).length;
  const steps = [
    {
      done: !!saved,
      title: 'Criar a sua identidade',
      description: 'Guarde o nome e o seu endereço Framy.',
      target: 'profile',
    },
    {
      done: data.published,
      title: 'Rever e publicar o perfil',
      description: 'Escolha os contactos que quer mostrar.',
      target: 'profile',
    },
    {
      done: data.orders.length > 0,
      title: 'Experimentar um pedido',
      description: 'Conheça o percurso, sem qualquer cobrança.',
      target: 'orders',
    },
  ];
  const complete = steps.filter((step) => step.done).length;
  const name = saved?.name || displayName;
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'FC';
  return (
    <div className="customer-overview">
      <section
        className="customer-stats"
        aria-label="Resumo dos pedidos de teste"
      >
        {[
          {
            icon: Clock3,
            value: pending,
            label: 'Por pagar',
            note: 'Pagamentos simulados',
            tone: 'pending',
          },
          {
            icon: Package,
            value: active,
            label: 'Em curso',
            note: 'Da produção à entrega',
            tone: 'active',
          },
          {
            icon: Check,
            value: delivered,
            label: 'Entregues',
            note: 'Pedidos de teste concluídos',
            tone: 'delivered',
          },
        ].map((stat) => (
          <button
            className="customer-stat"
            key={stat.label}
            onClick={() => onNavigate('orders')}
          >
            <span className={`customer-stat-icon ${stat.tone}`}>
              <stat.icon size={21} />
            </span>
            <span className="customer-stat-copy">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <small>{stat.note}</small>
            </span>
            <ArrowUpRight className="customer-stat-arrow" size={17} />
          </button>
        ))}
      </section>

      <div className="customer-columns">
        <section
          className="customer-identity"
          aria-labelledby="identity-heading"
        >
          <div className="customer-panel-heading">
            <span className="customer-overline">A MINHA IDENTIDADE</span>
            <span className="customer-profile-status">
              {data.published ? 'Publicada' : saved ? 'Rascunho' : 'Por criar'}
            </span>
          </div>
          <div className="customer-person">
            <span className="customer-avatar">{initials}</span>
            <div>
              <h2 id="identity-heading">{name}</h2>
              <p>
                {saved?.title || 'O seu espaço para se apresentar e conectar.'}
              </p>
            </div>
          </div>
          <div className="customer-address">
            <UserRound size={18} />
            <span>
              {saved
                ? `/${saved.username}`
                : 'Crie o seu endereço pessoal Framy'}
            </span>
          </div>
          <div className="customer-identity-actions">
            <Button
              className="customer-primary"
              onClick={() => onNavigate('profile')}
            >
              {saved ? 'Editar identidade' : 'Criar identidade'}{' '}
              <ArrowRight size={18} />
            </Button>
            {data.published && data.publishedUsername && (
              <a
                className="customer-profile-link"
                href={`/${data.publishedUsername}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver perfil publicado <ArrowUpRight size={17} />
              </a>
            )}
          </div>
          <p className="customer-privacy">
            <ShieldCheck size={17} />
            {data.published
              ? 'Perfil publicado apenas na prévia privada.'
              : 'Só os dados que escolher serão publicados.'}
          </p>
        </section>

        <section className="customer-setup" aria-labelledby="setup-heading">
          <div className="customer-panel-heading">
            <h2 id="setup-heading">
              {complete === steps.length
                ? 'Tudo pronto para conectar'
                : 'Os seus primeiros passos'}
            </h2>
            <span>
              {complete}/{steps.length}
            </span>
          </div>
          <Progress
            value={(complete / steps.length) * 100}
            aria-label={`${complete} de ${steps.length} primeiros passos concluídos`}
            className="customer-progress"
          />
          <ol className="customer-steps">
            {steps.map((step, index) => (
              <li key={step.title}>
                <button onClick={() => onNavigate(step.target)}>
                  <span
                    className={`customer-step-number ${step.done ? 'is-complete' : ''}`}
                  >
                    {step.done ? (
                      <Check size={17} aria-label="Concluído" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span>
                    <strong>{step.title}</strong>
                    <small>{step.description}</small>
                  </span>
                  <ArrowRight size={17} />
                </button>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section
        className="customer-orders"
        aria-labelledby="recent-orders-heading"
      >
        <div className="customer-panel-heading">
          <div>
            <h2 id="recent-orders-heading">Pedidos recentes</h2>
            <p>Acompanhe os seus últimos pedidos de teste.</p>
          </div>
          <Button variant="ghost" onClick={() => onNavigate('orders')}>
            Ver todos <ArrowRight size={17} />
          </Button>
        </div>
        {recent.length ? (
          <ul className="customer-order-list">
            {recent.map((order) => (
              <li key={order.id}>
                <button
                  className="customer-order"
                  onClick={() => onInspect(order)}
                  aria-label={`Ver pedido ${order.id.slice(0, 8)}: ${order.productName}`}
                >
                  <span className="customer-order-icon">
                    <Package size={24} />
                  </span>
                  <span className="customer-order-name">
                    <strong>{order.productName}</strong>
                    <small>
                      #{order.id.slice(0, 8).toUpperCase()} ·{' '}
                      {orderDate(order.createdAt)}
                    </small>
                  </span>
                  <span
                    className="customer-order-status"
                    data-status={order.status}
                  >
                    {orderLabels[order.status]}
                  </span>
                  <span className="customer-order-amount">
                    <strong>{money(order.amount)}</strong>
                    <small>Valor de teste</small>
                  </span>
                  <ArrowUpRight size={19} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="customer-orders-empty">
            <span className="customer-order-icon">
              <Package size={30} />
            </span>
            <div>
              <h3>O seu primeiro pedido começa aqui</h3>
              <p>
                Escolha um produto e acompanhe cada etapa até à entrega
                simulada.
              </p>
            </div>
            <Button
              className="customer-primary"
              onClick={() => onNavigate('orders')}
            >
              Experimentar um pedido <ArrowRight size={18} />
            </Button>
          </div>
        )}
      </section>
    </div>
  );
}
