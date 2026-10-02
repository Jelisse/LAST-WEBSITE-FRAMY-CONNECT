'use client';
import { useEffect, useState } from 'react';
import { designImageDefaults, type DesignImage } from '@/lib/design-images';
import { designServices } from '@/lib/purchase-structure';
import { MediaUploadBox } from './media-upload-box';
export function DesignImageManager() {
  const [rows, setRows] = useState<DesignImage[]>([]);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  async function load() {
    const r = await fetch('/api/manager-design-images', { cache: 'no-store' });
    const d = (await r.json()) as {
      error?: string;
      images: DesignImage[];
      imageUrl: string;
      image: DesignImage;
    };
    if (!r.ok) throw Error(d.error);
    setRows(d.images);
  }
  useEffect(() => {
    void Promise.resolve().then(load).catch((e) => setMessage(e.message));
  }, []);
  function edit(id: string, patch: Partial<DesignImage>) {
    setRows((old) =>
      old.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }
  async function upload(id: string, files: File[]) {
    if (!files[0]) return;
    setBusy(true);
    setMessage('');
    try {
      const file = files[0];
      if (file.size > 8 * 1024 * 1024)
        throw Error('A imagem deve ter até 8 MB.');
      const r = await fetch('/api/product-image', {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      const d = (await r.json()) as {
        error?: string;
        images: DesignImage[];
        imageUrl: string;
        image: DesignImage;
      };
      if (!r.ok) throw Error(d.error);
      edit(id, { image: d.imageUrl });
      setMessage('Imagem carregada. Guarde a opção para publicar a alteração.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro ao carregar.');
    } finally {
      setBusy(false);
    }
  }
  async function save(row: DesignImage) {
    setBusy(true);
    setMessage('');
    try {
      const r = await fetch('/api/manager-design-images', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(row),
      });
      const d = (await r.json()) as {
        error?: string;
        images: DesignImage[];
        imageUrl: string;
        image: DesignImage;
      };
      if (!r.ok) throw Error(d.error);
      edit(row.id, d.image);
      setMessage('Imagem guardada. Já disponível na configuração do produto.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Erro ao guardar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel design-image-manager">
      <h2>Imagens das opções de design</h2>
      <p>
        Uma imagem por opção, apresentada nos cartões, porta-chaves e kits. Use
        PNG, JPG ou WebP, até 8 MB. Formato horizontal recomendado: 3:2.
      </p>
      <button
        type="button"
        className="btn"
        disabled={busy}
        onClick={() => void load().catch((e) => setMessage(e.message))}
      >
        Actualizar imagens
      </button>
      <div className="design-image-grid">
        {designServices.map((service) => {
          const row = rows.find((r) => r.id === service.id);
          return (
            row && (
              <fieldset key={row.id} disabled={busy}>
                <legend>{service.name}</legend>
                <MediaUploadBox
                  title="Imagem da opção"
                  src={row.image}
                  accept="image/png,image/jpeg,image/webp"
                  disabled={busy}
                  onFiles={(files) => upload(row.id, files)}
                />
                <label>
                  Descrição da imagem
                  <input
                    value={row.alt}
                    maxLength={180}
                    onChange={(e) => edit(row.id, { alt: e.target.value })}
                  />
                </label>
                <button
                  type="button"
                  className="btn"
                  onClick={() =>
                    edit(row.id, {
                      image: designImageDefaults.find((r) => r.id === row.id)!
                        .image,
                    })
                  }
                >
                  Restaurar ilustração
                </button>
                <button
                  type="button"
                  className="btn primary"
                  onClick={() => void save(row)}
                >
                  Guardar imagem
                </button>
              </fieldset>
            )
          );
        })}
      </div>
      <output>{message}</output>
    </section>
  );
}
