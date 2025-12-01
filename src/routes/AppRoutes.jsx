import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import HomeCliente from "../pages/Cliente/HomeCliente";


import HomeFuncionario from "../pages/Funcionario/HomeFuncionario";
import ProdutoCadastro from "../pages/Funcionario/Produto/CadastroProduto";
import ProdutoEdicao from "../pages/Funcionario/Produto/EditarProduto";
import CategoriaCadastro from "../pages/Funcionario/Categoria/CadastroCategoria";
import CategoriaEdicao from "../pages/Funcionario/Categoria/EditarCategoria";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Cliente */}
      <Route path="/" element={<HomeCliente />} />
      <Route path="/cliente" element={<HomeCliente />} />

      {/* Funcionário */}
     
      <Route path="/funcionario" element={<HomeFuncionario />} />
      <Route path="/funcionario/produto/cadastrar" element={<ProdutoCadastro />} />
      <Route path="/funcionario/produto/:id/editar" element={<ProdutoEdicao />} />
      <Route path="/funcionario/categoria/cadastrar" element={<CategoriaCadastro />} />
      <Route path="/funcionario/categoria/:id/editar" element={<CategoriaEdicao />} />

      {/* Rota fallback */}
      {/* <Route path="*" element={<Navigate to="/" />} /> */}
    </Routes>
  );
}

