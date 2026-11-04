import { useState } from 'react';
import { IceCreamCone } from 'lucide-react';

// Imagem de produto com placeholder quando a URL está vazia/nula ou não carrega.
export function ProdutoImagem({
  src,
  alt,
  className = '',
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  // Guarda qual URL falhou, para tentar de novo se o produto ganhar outra imagem.
  const [srcComErro, setSrcComErro] = useState<string | null>(null);

  if (!src || srcComErro === src) {
    return (
      <div
        role="img"
        aria-label={alt || 'Produto sem imagem'}
        data-testid="imagem-placeholder"
        className={`flex items-center justify-center bg-cream-100 text-slate-300 ${className}`}
      >
        <IceCreamCone className="h-1/2 max-h-10 w-1/2 max-w-10" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`object-cover ${className}`}
      onError={() => setSrcComErro(src)}
    />
  );
}
