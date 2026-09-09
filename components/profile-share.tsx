'use client';
import { useState } from 'react';
import { Download, Share2, Globe2, Mail, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/lib/domain';
function vcfEscape(s: string) {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}
export function ProfileShare({ profile }: { profile: Profile }) {
  const [message, setMessage] = useState('');
  function download() {
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${vcfEscape(profile.name)}`,
      `TITLE:${vcfEscape(profile.title)}`,
      ...(profile.email ? [`EMAIL:${vcfEscape(profile.email)}`] : []),
      ...(profile.phone ? [`TEL:${vcfEscape(profile.phone)}`] : []),
      ...(profile.website ? [`URL:${vcfEscape(profile.website)}`] : []),
      'END:VCARD',
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join('\r\n')], { type: 'text/vcard;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.username}.vcf`;
    a.click();
    URL.revokeObjectURL(url);
    setMessage(
      'Contacto descarregado. Abra o ficheiro para o adicionar aos seus contactos.',
    );
  }
  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({
          title: profile.name,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        setMessage('Link copiado.');
      }
    } catch (e) {
      if (!(e instanceof Error && e.name === 'AbortError'))
        setMessage('Copie o endereço na barra do navegador para partilhar.');
    }
  }
  return (
    <>
      <div className="public-contact-links">
        {(profile.links ?? []).map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Globe2 size={19} />
            {link.label}
          </a>
        ))}
        {profile.email && (
          <a href={`mailto:${profile.email}`}>
            <Mail size={19} />
            {profile.email}
          </a>
        )}
        {profile.phone && (
          <a href={`tel:${profile.phone.replace(/[^+0-9]/g, '')}`}>
            <Phone size={19} />
            {profile.phone}
          </a>
        )}
        {profile.website && (
          <a href={profile.website} target="_blank" rel="noopener noreferrer">
            <Globe2 size={19} /> Website / portefólio
          </a>
        )}
      </div>
      <div className="form-actions">
        <Button className="control-btn" onClick={download}>
          <Download size={17} /> Adicionar contacto
        </Button>
        <Button className="control-btn" variant="outline" onClick={share}>
          <Share2 size={17} /> Partilhar
        </Button>
      </div>
      {message && <output className="message">{message}</output>}
    </>
  );
}
