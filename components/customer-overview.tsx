'use client';
import { ArrowRight, ArrowUpRight, Link2, Plus, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getPlan, orderLabels, type SandboxOrder } from '@/lib/domain';
import type { WorkspaceData } from '@/lib/profile-types';

export function CustomerOverview({
  data,
  displayName,
  onNavigate,
  onInspect,
  onUpgrade,
}: {
  data: WorkspaceData;
  displayName: string;
  onNavigate: (tab: string) => void;
  onInspect: (order: SandboxOrder) => void;
  onUpgrade: () => void;
}) {
  const plan = getPlan(data.membership.planId);
  const profile = data.profile;
  const links = profile?.links ?? [];
  const name = profile?.name || displayName;
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || 'FC';
  const recent = [...data.orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 2);
  return (
    <div className="essential-dashboard">
      <div className="essential-top-grid">
        <section
          className="essential-identity"
          aria-labelledby="identity-title"
        >
          <span className="essential-kicker">A SUA IDENTIDADE</span>
          <div className="essential-person">
            <span className="essential-avatar">{initials}</span>
            <div>
              <h2 id="identity-title">{name}</h2>
              <p>{profile?.title || 'Comece por se apresentar.'}</p>
            </div>
          </div>
          <p className="essential-handle">
            {profile
              ? `/${profile.username}`
              : 'O seu endereço Framy começa aqui.'}
            <span>{data.published ? 'Publicada' : 'Rascunho'}</span>
          </p>
          <div className="essential-actions">
            <Button
              className="essential-dark-button"
              onClick={() => onNavigate('profile')}
            >
              {profile ? 'Editar perfil' : 'Criar perfil'}{' '}
              <ArrowRight size={17} />
            </Button>
            {data.published && data.publishedUsername && (
              <a
                href={`/${data.publishedUsername}`}
                target="_blank"
                rel="noreferrer"
              >
                Ver perfil <ArrowUpRight size={16} />
              </a>
            )}
          </div>
        </section>
        <section
          className="essential-plan"
          aria-labelledby="current-plan-title"
        >
          <div className="essential-plan-heading">
            <span className="essential-kicker">O SEU PLANO</span>
            <span className="essential-test-badge">Prévia</span>
          </div>
          <h2 id="current-plan-title">{plan.name}</h2>
          <p className="essential-price">
            US${plan.dollars}
            <span> / mês · por perfil</span>
          </p>
          <div className="essential-usage">
            <span>
              {links.length} de {plan.links} links
            </span>
            <span>{plan.links - links.length} disponíveis</span>
          </div>
          <Progress
            value={Math.min(100, (links.length / plan.links) * 100)}
            aria-label={`${links.length} de ${plan.links} links utilizados`}
          />
          <Button className="plan-upgrade" onClick={onUpgrade}>
            Upgrade plan <ArrowUpRight size={18} />
          </Button>
          <p className="essential-plan-note">
            Mais caixas de links, a partir de US$1/mês.
          </p>
        </section>
      </div>
      <section className="essential-links" aria-labelledby="saved-links-title">
        <div className="essential-section-heading">
          <div>
            <h2 id="saved-links-title">Os seus links.</h2>
            <p>Um lugar para tudo o que importa.</p>
          </div>
          <Button variant="ghost" onClick={() => onNavigate('profile')}>
            Gerir links <ArrowRight size={17} />
          </Button>
        </div>
        <div className="essential-link-grid">
          {links.slice(0, 5).map((link, index) => (
            <button
              className="essential-link-box"
              key={index}
              onClick={() => onNavigate('profile')}
            >
              <Link2 size={22} />
              <strong>{link.label}</strong>
              <span>{new URL(link.url).hostname}</span>
              <ArrowUpRight className="essential-link-arrow" size={17} />
            </button>
          ))}
          {links.length < plan.links && (
            <button
              className="essential-link-box essential-add-link"
              onClick={() => onNavigate('profile')}
            >
              <Plus size={24} />
              <strong>Adicionar link</strong>
              <span>{plan.links - links.length} caixas disponíveis</span>
            </button>
          )}
          {!links.length && (
            <div className="essential-link-tip">
              <UserRound size={21} />
              <p>
                As suas redes, o seu trabalho, os seus contactos. Adicione um
                link para começar.
              </p>
            </div>
          )}
        </div>
        {links.length > 5 && (
          <button
            className="plan-text-button"
            onClick={() => onNavigate('profile')}
          >
            Ver todos os {links.length} links <ArrowRight size={16} />
          </button>
        )}
      </section>
      {recent.length > 0 && (
        <section className="essential-order-section">
          <div className="essential-section-heading">
            <h2>Pedidos recentes.</h2>
            <Button variant="ghost" onClick={() => onNavigate('orders')}>
              Ver todos <ArrowRight size={17} />
            </Button>
          </div>
          {recent.map((order) => (
            <button
              className="essential-order-row"
              key={order.id}
              onClick={() => onInspect(order)}
            >
              <span>
                <strong>{order.productName}</strong>
                <small>#{order.id.slice(0, 8).toUpperCase()}</small>
              </span>
              <span>{orderLabels[order.status]}</span>
              <ArrowUpRight size={17} />
            </button>
          ))}
        </section>
      )}
    </div>
  );
}
