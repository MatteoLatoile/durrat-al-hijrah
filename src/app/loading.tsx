import Image from 'next/image';

/* Affiché automatiquement par Next.js pendant le chargement d'une page de ce segment. */
export default function Loading() {
  return (
    <div className="loader" role="status" aria-label="Loading">
      <div className="loader-mark">
        <span className="loader-ring" />
        <span className="loader-arc" />
        <Image src="/brand-gold.png" width={160} height={160} alt="" priority />
      </div>
    </div>
  );
}
