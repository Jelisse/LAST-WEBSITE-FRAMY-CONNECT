'use client';
import { useI18n } from './language-provider';
import Link from './hard-link';
import { corporateSectionURL } from '@/lib/corporate-navigation';
const businessUses = [
  [
    'Vendas e promotores',
    'Organize equipas por zona ou evento. Use campanhas para comparar contactos recebidos e acções registadas por cada equipa.',
  ],
  [
    'Revistas e comunicação social',
    'Agrupe jornalistas, publicidade e eventos. Partilhe perfis profissionais e recolha contactos de leitores ou parceiros que autorizem contacto.',
  ],
  [
    'Agências imobiliárias',
    'Crie campanhas por imóvel, feira ou zona. Atribua consultores e identifique quais campanhas recebem mais contactos interessados.',
  ],
  [
    'Beleza e bem-estar',
    'Apresente profissionais e serviços através dos perfis. Compare o interesse em campanhas de salão, feiras ou lançamentos; use links externos para marcações.',
  ],
  [
    'Tecnologia e consultoria',
    'Prepare equipas para demonstrações e conferências. Recolha pedidos de informação e compare o interesse por serviço ou campanha.',
  ],
  [
    'Hotelaria, restauração e turismo',
    'Organize representantes por unidade ou evento. Partilhe perfis e links de serviços e recolha pedidos de informação com consentimento.',
  ],
  [
    'Formação e associações',
    'Organize equipas por projecto ou feira. Recolha manifestações de interesse e acompanhe o alcance das campanhas sem identificar visitantes anónimos.',
  ],
] as const;
export function CorporateGuide({ organisation }: { organisation: string }) {
  const { t } = useI18n();
  return (
    <section className="corporate-guide">
      <section className="corporate-panel">
        <h2>{t('Como a equipa funciona')}</h2>
        <ol className="corporate-guide-steps">
          {[
            [
              '1. Aprovar a empresa',
              'Envie os dados da empresa. Após aprovação da Framy Connect, as ferramentas da equipa ficam disponíveis na conta do líder.',
            ],
            [
              '2. Confirmar os trabalhadores',
              'Convite: o trabalhador aceita e define o próprio acesso. Autorização: o trabalhador consente por email antes de o líder criar o acesso.',
            ],
            [
              '3. Organizar a operação',
              'Na Equipa, atribua grupos e funções. Em Campanhas, crie o evento ou iniciativa e gere um link ou QR por trabalhador.',
            ],
            [
              '4. Usar os links da campanha',
              'Partilhe o link ou QR de trabalho. Só estes links atribuem actividade à empresa; links pessoais e NFC já gravados não são alterados automaticamente.',
            ],
            [
              '5. Acompanhar os resultados',
              'Nos Relatórios, escolha período, campanha, equipa e indicador. Em Contactos, consulte os dados enviados voluntariamente para seguimento autorizado.',
            ],
          ].map(([title, text]) => (
            <li key={title}>
              <h3>{t(title)}</h3>
              <p>{t(text)}</p>
            </li>
          ))}
        </ol>
        <nav className="corporate-toolbar" aria-label={t('Começar')}>
          <Link
            className="corporate-primary"
            href={corporateSectionURL('/corporativo/equipa', organisation)}
          >
            {t('Abrir gestão da equipa')}
          </Link>
          <Link
            className="corporate-report-link"
            href={corporateSectionURL('/corporativo/campanhas', organisation)}
          >
            {t('Abrir campanhas')}
          </Link>
        </nav>
      </section>
      <div className="corporate-guide-grid">
        <section className="corporate-panel">
          <h2>{t('Quem pode fazer o quê')}</h2>
          <ul>
            <li>
              {t(
                'Proprietário: gere a organização, atribui líderes e acompanha os resultados da empresa.',
              )}
            </li>
            <li>
              {t(
                'Líder delegado: gere trabalhadores e campanhas, sem promover outros líderes nem alterar o proprietário.',
              )}
            </li>
            <li>
              {t(
                'Trabalhador: acede às próprias campanhas, resultados e contactos. Não vê os resultados privados de colegas.',
              )}
            </li>
          </ul>
        </section>
        <section className="corporate-panel">
          <h2>{t('Como interpretar os gráficos')}</h2>
          <ul>
            <li>
              {t(
                'Contactos recebidos são formulários enviados com consentimento, não visitantes únicos.',
              )}
            </li>
            <li>
              {t(
                'Aberturas e cliques contam acções. Não confirmam seguidores, vendas ou que um contacto foi guardado no telemóvel.',
              )}
            </li>
            <li>
              {t(
                'A comparação por participante usa trabalhadores com pelo menos um registo no período. Não é uma avaliação automática de produtividade.',
              )}
            </li>
            <li>
              {t(
                'As equipas reflectem a organização actual dos trabalhadores, não um histórico de mudanças de equipa.',
              )}
            </li>
          </ul>
        </section>
      </div>
      <h2>{t('Ideias por tipo de empresa')}</h2>
      <div className="corporate-guide-grid">
        {businessUses.map(([title, text]) => (
          <article className="corporate-panel" key={title}>
            <h3>{t(title)}</h3>
            <p>{t(text)}</p>
          </article>
        ))}
      </div>
      <section className="corporate-panel">
        <h2>{t('Boas práticas para resultados úteis')}</h2>
        <ul>
          <li>
            {t(
              'Use uma campanha por iniciativa e o link correcto de cada trabalhador. Compare períodos equivalentes e considere o tamanho da equipa.',
            )}
          </li>
          <li>
            {t(
              'Os contactos ficam disponíveis durante 90 dias. Use-os apenas para a finalidade autorizada e exporte apenas quando necessário.',
            )}
          </li>
          <li>
            {t(
              'Preços, contratos e renovações são tratados separadamente. Este painel não confirma pagamentos nem faz débitos automáticos.',
            )}
          </li>
          <li>
            {t(
              'A Framy Connect não faz seguimento automático, gestão de marcações ou confirmação de vendas neste módulo.',
            )}
          </li>
        </ul>
      </section>
    </section>
  );
}
