'use client';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main id="main" className="section-wrap information-page">
      <h1>Não foi possível carregar.</h1>
      <p>
        Tente novamente dentro de instantes. Os seus dados guardados não foram
        alterados.
      </p>
      <Button className="btn btn-primary" onClick={reset}>
        Tentar novamente
      </Button>
    </main>
  );
}
