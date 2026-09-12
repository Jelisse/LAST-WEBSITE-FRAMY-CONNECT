'use client';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { type ManagedPlan, type PlanId } from '@/lib/domain';

export function PlanPicker({
  plans,
  current,
  busy,
  error,
  onClose,
  onSelect,
}: {
  plans: ManagedPlan[];
  current: PlanId;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSelect: (id: PlanId) => void;
}) {
  const [selected, setSelected] = useState<PlanId | null>(null);
  const choice = plans.find((plan) => plan.id === selected);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        className={`plans-dialog ${choice ? 'plans-confirm' : ''}`}
        showCloseButton={!busy}
      >
        {choice ? (
          <>
            <Button
              variant="ghost"
              className="plans-back"
              disabled={busy}
              onClick={() => setSelected(null)}
            >
              <ArrowLeft size={17} /> Todos os planos
            </Button>
            <DialogTitle className="plans-title">
              Mais espaço. Plano {choice.name}.
            </DialogTitle>
            <DialogDescription>
              Uma identidade digital, com {choice.links} caixas de links.
            </DialogDescription>
            <div className="plan-summary">
              <span>
                {choice.name}
                <small>
                  {choice.id === 'free-30'
                    ? '30 dias · sem renovação automática'
                    : 'Mensal · por perfil'}
                </small>
              </span>
              <strong>
                US${choice.dollars}
                <small>{choice.id === 'free-30' ? '/ 30 dias' : '/mês'}</small>
              </strong>
            </div>
            <ul className="plan-inclusions">
              <li>
                <Check />
                {choice.links} links com títulos personalizados
              </li>
              <li>
                <Check />
                {choice.bio
                  ? `Biografia até ${choice.bio} caracteres`
                  : 'Nome e título de apresentação'}
              </li>
              <li>
                <Check />
                Email, telefone e website com controlo de privacidade
              </li>
              <li>
                <Check />
                Editar, ordenar e publicar os seus links
              </li>
              <li>
                <Check />
                Partilha do perfil e download do contacto
              </li>
            </ul>
            <p className="plan-disclosure">
              Prévia sem cobrança. Os preços mensais são propostos; esta acção
              apenas activa o plano de teste. Cartões NFC, entrega e contas
              adicionais não estão incluídos.
            </p>
            {error && (
              <p role="alert" className="plan-error">
                {error}
              </p>
            )}
            <Button
              className="plan-upgrade"
              disabled={busy}
              onClick={() => onSelect(choice.id)}
            >
              {busy ? 'A activar…' : 'Activar plano de teste'}{' '}
              <ArrowRight size={18} />
            </Button>
          </>
        ) : (
          <>
            <span className="plans-kicker">FRAMY CONNECT</span>
            <DialogTitle className="plans-title">
              Um plano para cada conexão.
            </DialogTitle>
            <DialogDescription className="plans-intro">
              Comece com 30 dias grátis. Os restantes planos estão em breve
              disponíveis.
            </DialogDescription>
            <div className="plans-grid">
              {plans.map((plan) => (
                <article
                  className={`plan-card ${plan.id === 'professional' ? 'plan-featured' : ''}`}
                  key={plan.id}
                >
                  <span className="plan-recommendation">
                    {plan.id === current
                      ? 'O seu plano de teste'
                      : plan.id === 'professional'
                        ? 'A nossa sugestão'
                        : plan.audience}
                  </span>
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                  <div className="plan-price">
                    <strong>
                      <span>US$</span>
                      {plan.dollars}
                    </strong>
                    <span>{plan.id === 'free-30' ? '/ 30 dias' : '/mês'}</span>
                  </div>
                  <p className="plan-per-profile">
                    {plan.id === 'free-30'
                      ? 'Sem renovação automática'
                      : 'Por perfil · mensal'}
                  </p>
                  <Button
                    className={
                      plan.id === 'professional'
                        ? 'plan-upgrade'
                        : 'plan-select'
                    }
                    variant="outline"
                    disabled={
                      plan.id !== 'free-30' || plan.id === current || busy
                    }
                    onClick={() => setSelected(plan.id)}
                  >
                    {plan.id === current
                      ? 'Plano actual'
                      : plan.id === 'free-30'
                        ? 'Começar 30 dias grátis'
                        : 'Em breve'}
                    {plan.id !== current && <ArrowRight size={16} />}
                  </Button>
                  <ul>
                    <li>
                      <Check /> <strong>{plan.links} caixas de links</strong>
                    </li>
                    <li>
                      <Check />
                      {plan.bio
                        ? `Bio: ${plan.bio} caracteres`
                        : 'Nome e título'}
                    </li>
                    <li>
                      <Check />
                      Contactos e privacidade
                    </li>
                    <li>
                      <Check />
                      Partilha de perfil
                    </li>
                  </ul>
                </article>
              ))}
            </div>
            <p className="plan-disclosure">
              Todos incluem uma identidade digital, links editáveis e download
              do contacto. Instituições e organizações: preço por perfil, sem
              gestão de equipas. Prévia sem cobrança; subscrições reais ainda
              não disponíveis.
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
