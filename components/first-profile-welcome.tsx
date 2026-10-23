'use client';
import Image from 'next/image';
import Link from './hard-link';
import {
  ArrowRight,
  ContactRound,
  Share2,
  Sparkles,
  Check,
} from 'lucide-react';
import { useI18n } from './language-provider';
export function FirstProfileWelcome({
  name,
  onStart,
}: {
  name: string;
  onStart: () => void;
}) {
  const { t } = useI18n();
  return (
    <section className="first-profile-welcome">
      <div className="welcome-profile-art" aria-hidden="true">
        <div className="welcome-art-orbit" />
        <div className="welcome-mini-card welcome-mini-card-back">
          <span>FRAMY CONNECT</span>
          <Share2 size={32} />
          <strong>{t('O Seu Mundo num Toque.')}</strong>
        </div>
        <div className="welcome-mini-card welcome-mini-card-front">
          <div className="welcome-card-cover" />
          <Image
            src="/home/angela-portrait-cutout.png"
            alt=""
            width={104}
            height={120}
            unoptimized
          />
          <strong>Angela Khossa</strong>
          <span>{t('Criadora de conteúdos')}</span>
          <div>
            <ContactRound size={17} />
            {t('Contactos')}
          </div>
          <div>
            <Share2 size={17} />
            {t('Partilhar perfil')}
          </div>
          <Image
            src="/brand/logo.svg"
            alt=""
            width={100}
            height={40}
            unoptimized
          />
        </div>
        <span className="welcome-art-note">
          <Check size={17} />
          {t('Pronto para se conectar')}
        </span>
      </div>
      <div className="welcome-profile-copy">
        <span className="flow-eyebrow">
          <Sparkles size={17} />
          {t('O SEU PRIMEIRO PERFIL')}
        </span>
        <h2>
          {t('Bem-vindo à Framy, {0}.', [
            name.trim().split(/\s+/)[0] || t('bem-vindo'),
          ])}
        </h2>
        <p>
          {t(
            'Uma boa apresentação pode começar uma grande ligação. Crie o seu perfil, escolha o que quer partilhar e leve-o consigo.',
          )}
        </p>
        <ol>
          <li>
            <span>1</span>
            {t('Apresente-se')}
          </li>
          <li>
            <span>2</span>
            {t('Adicione os seus contactos')}
          </li>
          <li>
            <span>3</span>
            {t('Publique e partilhe')}
          </li>
        </ol>
        <button type="button" className="flow-primary" onClick={onStart}>
          {t('Criar o meu primeiro perfil')}
          <ArrowRight size={19} />
        </button>
        <small>
          {t('Individual é gratuito. Pode editar tudo ao seu ritmo.')}
        </small>
        <Link href="/ajuda">{t('Precisa de ajuda para começar?')}</Link>
      </div>
    </section>
  );
}
