import React from "react";

export default function ProdutoCard({ produto, onAdd }) {
  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", margin: "0.5rem", borderRadius: "8px", width: "200px" }}>
      <img src={produto.imagem || "/placeholder.png"} alt={produto.nome} style={{ width: "100%", borderRadius: "8px" }} />
      <h3>{produto.nome}</h3>
      <p>R$ {produto.preco.toFixed(2)}</p>
      <button onClick={onAdd}>Adicionar ao Carrinho</button>
    </div>
  );
}
