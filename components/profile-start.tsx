'use client';

import { useState } from 'react';
import {
  ArrowUpRight,
  UserRound,
  Users,
  Building2,
  Check,
  BriefcaseBusiness,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from './ui/dialog';
import { useI18n } from './language-provider';
import { SourceImage } from './source-image';

const choices = [
  {
    id: 'personal',
    title: 'Personal',
    badge: '1 pessoa',
    description:
      'Crie o seu perfil Personal gratuito. Pode explorar Professional mais tarde.',
    href: '/perfil',
    icon: UserRound,
  },
  {
    id: 'professional',
    title: 'Professional',
    badge: '1 pessoa',
    description:
      'Destaque o seu trabalho com vitrine, contactos e ferramentas profissionais.',
    href: '/perfil?billing=1',
    icon: BriefcaseBusiness,
  },
  {
    id: 'business',
    title: 'Business',
    badge: '3–50 pessoas',
    description:
      'Organize os perfis e as campanhas da sua equipa com Business.',
    href: '/corporativo/configurar?offer=business',
    icon: Users,
  },
  {
    id: 'enterprise',
    title: 'Enterprise',
    badge: '51–500 pessoas',
    description:
      'Prepare uma solução Enterprise com apoio e condições à medida.',
    href: '/corporativo/configurar?offer=enterprise',
    icon: Building2,
  },
] as const;

export function ProfileStart({
  className = 'public-button',
}: {
  className?: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('personal');
  const choice = choices.find((item) => item.id === selected) ?? choices[0];
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={className}
            aria-label={t('Criar o meu perfil')}
          />
        }
      >
        {t('Criar o meu perfil')}
        <ArrowUpRight size={18} aria-hidden="true" />
      </DialogTrigger>
      <DialogContent className="profile-start-dialog">
        <div className="profile-start-copy">
          <span className="public-eyebrow">{t('COMECE À SUA MANEIRA')}</span>
          <DialogTitle>{t('Qual é o plano para si?')}</DialogTitle>
          <DialogDescription>
            {t('Escolha como quer começar. Vamos guiá-lo, passo a passo.')}
          </DialogDescription>
          <div className="profile-start-options">
            <fieldset className="profile-start-choices">
              <legend className="sr-only">
                {t('Qual é o plano para si?')}
              </legend>
              {choices.map(({ id, title, badge, description, icon: Icon }) => (
                <label
                  key={id}
                  className={`profile-start-choice ${selected === id ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name="profile-audience"
                    value={id}
                    checked={selected === id}
                    onChange={() => setSelected(id)}
                  />
                  <Icon size={22} aria-hidden="true" />
                  <span>
                    <strong>{t(title)}</strong>
                    {id === 'personal' && (
                      <small className="profile-start-free">{t('Gratuito')}</small>
                    )}
                    <small>{t(badge)}</small>
                    <span>{t(description)}</span>
                  </span>
                  <span className="profile-start-check" aria-hidden="true">
                    {selected === id && <Check size={14} />}
                  </span>
                </label>
              ))}
            </fieldset>
          </div>
          <div className="profile-start-next">
            <p>
              {t(
                choice.id === 'personal'
                  ? 'Personal gratuito, sem prazo. Planos pagos são opcionais.'
                  : choice.id === 'professional'
                    ? 'Veja o preço e confirme o seu plano antes de pagar.'
                    : 'Planos para equipas mediante proposta. Nada é cobrado nesta etapa.',
              )}
            </p>
            <a className="public-button" href={choice.href}>
              {t(
                choice.id === 'personal'
                  ? 'Começar gratuitamente'
                  : choice.id === 'professional'
                    ? 'Continuar com Professional'
                    : 'Configurar a minha equipa',
              )}
              <ArrowUpRight size={18} aria-hidden="true" />
            </a>
          </div>
        </div>
        <aside className="profile-start-visual" aria-hidden="true">
          <div className="profile-start-sample">
            <div className="profile-start-cover" />
            <SourceImage
              src="/home/ana-matavele.webp"
              alt=""
              width={160}
              height={200}
            />
            <strong>Ana Matavele</strong>
            <span>Framy Connect</span>
            <div>
              <UserRound size={18} />
              {t('Contactos')}
            </div>
            <div>
              <BriefcaseBusiness size={18} />
              {t('O meu trabalho')}
            </div>
            <div>
              <ArrowUpRight size={18} />
              {t('Partilhar perfil')}
            </div>
          </div>
          <span>{t('O Seu Mundo, Num Toque.')}</span>
        </aside>
      </DialogContent>
    </Dialog>
  );
}
