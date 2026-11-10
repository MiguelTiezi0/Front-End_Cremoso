import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

// QR Code do Pix copia e cola, gerado no navegador (o código já vem pronto da API).
export function QrCodePix({ codigo }: { codigo: string }) {
  const src = useMemo(() => {
    const qr = qrcode(0, 'M'); // tamanho automático; correção M é a usual nos apps de banco
    qr.addData(codigo);
    qr.make();
    return qr.createDataURL(6, 4);
  }, [codigo]);

  return (
    <img
      src={src}
      alt="QR Code do Pix"
      className="mx-auto h-56 w-56 rounded-xl bg-white p-1 [image-rendering:pixelated]"
    />
  );
}
