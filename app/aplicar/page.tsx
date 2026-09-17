import { getChatGPTUser } from '@/app/chatgpt-auth';
import { SiteHeader, SiteFooter } from '@/components/site-shell';
import Link from '@/components/hard-link';
import { AgentApplicationForm } from '@/components/agent-application-form';
export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Tornar-se agente',
  robots: { index: false, follow: false },
};
export default async function Page() {
  const user = await getChatGPTUser();
  return (
    <>
      <SiteHeader />
      <main id="main" className="section-wrap application-page">
        <span className="eyebrow">EQUIPA FRAMY</span>
        <h1>Tornar-se agente</h1>
        <p>
          Apresente-se à nossa equipa. Precisará dos seus contactos, de uma
          fotografia e das duas faces do BI. Candidaturas a partir dos 18 anos,
          sujeitas a análise.
        </p>
        {user ? (
          <AgentApplicationForm name={user.displayName} email={user.email} />
        ) : (
          <section className="application-status">
            <h2>Comece pela sua conta</h2>
            <p>
              Crie uma conta para guardar a candidatura e acompanhar a resposta
              da gestão.
            </p>
            <div className="product-form-actions">
              <Link
                className="btn btn-primary"
                href="/entrar?mode=register&return_to=%2Faplicar"
              >
                Criar conta e candidatar-me
              </Link>
              <Link
                className="btn btn-outline"
                href="/entrar?return_to=%2Faplicar"
              >
                Já tenho conta — entrar
              </Link>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
