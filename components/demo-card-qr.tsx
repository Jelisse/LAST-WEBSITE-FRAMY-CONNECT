import { heroDefaults } from '@/lib/hero-media';
import { SourceImage } from './source-image';
// Render an actual encoded example URL over the illustrative AI-generated QR.
export function DemoCardQr({ source }: { source: string }) {
  if (source !== heroDefaults.card) return null;
  return (
    <SourceImage
      src="/home/demo-profile-qr.svg"
      alt=""
      width={256}
      height={256}
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: '38%',
        top: '70.5%',
        width: '25%',
        height: 'auto',
        borderRadius: 0,
        transform: 'none',
      }}
    />
  );
}
