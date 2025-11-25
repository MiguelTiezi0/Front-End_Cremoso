import React, { useEffect, useState, useContext } from "react";
import ProdutoCard from "../../components/ProdutoCard";
import SliderCategorias from "../../components/SliderCategoria";

import api from "../../api/api";

export default function HomeCliente() {
  const [produtos, setProdutos] = useState([]);
 
  useEffect(() => {
    async function fetchProdutos() {
      try {
        const res = await api.get("/produtos");
        setProdutos(res.data);
      } catch (err) {
        console.error("Erro ao buscar produtos", err);
      }
    }
    fetchProdutos();
  }, []);

  return (
    <div>
      <SliderCategorias />
      <h2>Produtos</h2>
      <div className="produtos-grid">
        {produtos.map((produto) => (
          <ProdutoCard
            key={produto.id}
            produto={produto}
           
          />
        ))}
      </div>
    </div>
  );
}
