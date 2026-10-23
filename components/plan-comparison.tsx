import { launchOffers, usdPrice } from '@/lib/launch-offers';
/* oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The labelled scroll region must accept keyboard focus for navigating the wide comparison table. */
import { Check, Minus, ChevronDown } from 'lucide-react';
import Link from './hard-link';
import { getTranslations } from '@/lib/server-i18n';
import { planComparison } from '@/lib/plan-comparison';
import type { ManagedPlan } from '@/lib/domain';
export async function PlanComparison({ plans }: { plans: ManagedPlan[] }) {
  const t = await getTranslations();
  const groups = planComparison(plans);
  return (
    <section className="why-section detailed-plans" id="comparar-planos">
      <div className="why-heading">
        <span className="public-eyebrow">{t('ESCOLHA COM CLAREZA')}</span>
        <h2>{t('Compare os planos, função a função.')}</h2>
        <p>
          {t(
            'Veja o que está incluído, o que depende da proposta e qual é o próximo passo para a sua equipa.',
          )}
        </p>
      </div>
      <p className="why-note">
        {t('Incluído')} ✓ · {t('Não incluído')} — ·{' '}
        {t(
          'Na proposta: configuração e condições confirmadas pela Framy. Os perfis Professional dos colaboradores são definidos e activados segundo o contrato.',
        )}{' '}
        {t('No telemóvel, deslize a tabela para ver todos os planos.')}
      </p>
      <section
        className="comparison-scroll"
        aria-label={t('Comparação detalhada de planos')}
        tabIndex={0}
      >
        <div className="comparison-plan-head">
          <span>{t('Funcionalidades')}</span>
          {['Personal', 'Professional', 'Business', 'Enterprise'].map(
            (name, i) => (
              <div key={name}>
                <strong>{name}</strong>
                <small>
                  {i === 0
                    ? t('Gratuito')
                    : i === 1
                      ? usdPrice(launchOffers[1].monthlyCents) +
                        ' / ' +
                        t('mês')
                      : i === 2
                        ? usdPrice(launchOffers[2].monthlyCents) +
                          ' / ' +
                          t('colaborador / mês')
                        : t('A partir de') +
                          ' ' +
                          usdPrice(launchOffers[3].monthlyCents) +
                          ' / ' +
                          t('colaborador / mês')}
                </small>
                <Link
                  href={
                    i < 2
                      ? '/#planos'
                      : `/corporativo/configurar?offer=${i === 2 ? 'business' : 'enterprise'}`
                  }
                >
                  {t(i < 2 ? 'Ver plano' : 'Pedir proposta')}
                </Link>
              </div>
            ),
          )}
        </div>
        {groups.map((g) => (
          <details open key={g.title} className="comparison-category">
            <summary>
              {t(g.title)}
              <ChevronDown size={17} aria-hidden="true" />
            </summary>
            <table>
              <caption className="sr-only">{t(g.title)}</caption>
              <colgroup>
                <col style={{ width: '32%' }} />
                <col span={4} style={{ width: '17%' }} />
              </colgroup>
              <thead className="sr-only">
                <tr>
                  <th>{t('Funcionalidade')}</th>
                  {['Personal', 'Professional', 'Business', 'Enterprise'].map(
                    (n) => (
                      <th key={n} scope="col">
                        {n}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {g.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{t(row.label)}</th>
                    {row.values.map((v, i) => (
                      <td key={i}>
                        {typeof v === 'boolean' ? (
                          v ? (
                            <>
                              <Check aria-hidden="true" size={17} />
                              <span className="sr-only">{t('Incluído')}</span>
                            </>
                          ) : (
                            <>
                              <Minus aria-hidden="true" size={16} />
                              <span className="sr-only">
                                {t('Não incluído')}
                              </span>
                            </>
                          )
                        ) : (
                          t(v)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
        ))}
      </section>
      <p className="why-note">
        {t(
          'Referências mensais em USD; os valores anuais estão no selector de preços. O pagamento em Moçambique usa preços em meticais publicados pela gestão. Produtos NFC, design personalizado e entrega são pagos separadamente.',
        )}
      </p>
      <p className="why-note">
        {t(
          'CRM automático, Wallet, leitura de cartões, assinatura de email automática e SSO não fazem parte do lançamento. Não anunciamos certificações que não possuímos.',
        )}
      </p>
    </section>
  );
}
export async function PlanQuestions() {
  const t = await getTranslations();
  const questions = [
    [
      'Qual é a diferença entre Business e Enterprise?',
      'Business destina-se a 3–50 perfis de colaboradores. Enterprise começa em 51 e vai até 500, com capacidade, entrada da equipa e apoio definidos na proposta. Ambos exigem confirmação da Framy; não existe débito automático por colaborador.',
    ],
    [
      'Posso começar sem comprar um cartão NFC?',
      'Sim. Personal é gratuito e pode partilhar o perfil por link ou QR. Um produto NFC compatível é uma opção física, paga separadamente. O destinatário precisa de acesso à internet para abrir o perfil.',
    ],
    [
      'Sou profissional independente. Qual plano faz sentido?',
      'Comece com Personal para contactos, redes sociais e links para o seu trabalho. Escolha Professional se precisar de vitrine de serviços, localização, horário, pedidos de contacto e estatísticas disponíveis no plano.',
    ],
    [
      'A Framy aumenta os meus seguidores automaticamente?',
      'Não. A Framy facilita o acesso aos seus canais. A pessoa decide se quer seguir, contactar ou guardar o seu contacto. O crescimento depende do seu conteúdo e das suas relações.',
    ],
    [
      'Os relatórios mostram vendas ou retorno financeiro?',
      'Os relatórios mostram actividade registada e contactos enviados com consentimento. Não provam vendas, receita ou retorno financeiro. A equipa pode usar os dados para organizar o seguimento.',
    ],
    [
      'Já existe ligação automática ao meu CRM?',
      'Ainda não. As ferramentas da empresa incluem exportação CSV. Integrações específicas exigem avaliação e orçamento; não estão incluídas automaticamente no lançamento.',
    ],
    [
      'Como se paga em Moçambique?',
      'Os preços em dólares são referências. A gestão publica os valores locais em meticais; nas propostas empresariais, confirma perfis, impostos aplicáveis e condições. Cartões, porta-chaves, design personalizado e entrega são separados.',
    ],
  ];
  return (
    <section className="why-section why-faq" id="perguntas-planos">
      <div className="why-heading">
        <h2>{t('Antes de escolher, tire as suas dúvidas.')}</h2>
      </div>
      <div>
        {questions.map(([q, a]) => (
          <details key={q}>
            <summary>
              {t(q)}
              <ChevronDown size={17} />
            </summary>
            <p>{t(a)}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
