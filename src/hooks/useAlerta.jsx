import { useState } from "react";

export default function useAlerta() {
  const [mensagem, setMensagem] = useState("");

  function mostrarAlerta(msg) {
    setMensagem(msg);
    setTimeout(() => setMensagem(""), 3000); // desaparece após 3s
    console.log("ALERTA:", msg); // você pode substituir por toast real
  }

  return mostrarAlerta;
}
