import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { listarProdutosHome, listarCategorias } from "../../api/endpoints.js";
import "./Funcionario.css";

const HomeFuncionario = () => {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [stats, setStats] = useState({
    totalProdutos: 0,
    totalCategorias: 0,
    produtosAtivos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([listarProdutosHome(), listarCategorias()])
      .then(([produtosRes, categoriasRes]) => {
        const produtosData = produtosRes.data;
        const categoriasData = categoriasRes.data;

        setProdutos(produtosData);
        setCategorias(categoriasData);

        setStats({
          totalProdutos: produtosData.length,
          totalCategorias: categoriasData.length,
          produtosAtivos: produtosData.filter((p) => p.ativo).length,
        });

        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) return <div className="loading">Carregando painel...</div>;

  return (
    <div className="home-funcionario">
      <header className="header-funcionario">
        <h1>🍨 Cremoso - Painel Funcionário</h1>
        <p>Bem-vindo ao gerenciamento do cardápio</p>
      </header>

      {/* Estatísticas */}
      <section className="stats-grid">
        <div className="stat-card">
          <h3>{stats.totalProdutos}</h3>
          <span>Total de Produtos</span>
        </div>
        <div className="stat-card ativo">
          <h3>{stats.produtosAtivos}</h3>
          <span>Produtos Ativos</span>
        </div>
        <div className="stat-card">
          <h3>{stats.totalCategorias}</h3>
          <span>Total de Categorias</span>
        </div>
      </section>

      {/* Ações Rápidas */}
      <section className="acoes-rapidas">
        <h2>Ações Rápidas</h2>
        <div className="acoes-grid">
          <Link to="/funcionario/produto/cadastrar" className="acao-card">
            <div className="icone">➕</div>
            <h3>Novo Produto</h3>
            <p>Cadastre um novo item no cardápio</p>
          </Link>
          <Link to="/funcionario/categoria/cadastrar" className="acao-card">
            <div className="icone">📁</div>
            <h3>Nova Categoria</h3>
            <p>Crie uma nova categoria</p>
          </Link>
        </div>
      </section>

     
<section className="produtos-recentes">
  <h2>Produtos Recentes</h2>
  <div className="produtos-grid">
    {produtos.slice(0, 6).map((produto) => (
      <div key={produto.idProduto} className="produto-card-func">
        <img 
          src={produto.imagemUrl ? `http://localhost:8080${produto.imagemUrl}` : '/placeholder.jpg'} 
          alt={produto.descricao}
          style={{ width: '100%', height: '150px', objectFit: 'cover' }}
          onError={(e) => {
            e.target.src = '/placeholder.jpg'; // fallback se imagem não carregar
          }}
        />
        <div className="produto-info-func">
          <h4>{produto.descricao}</h4>
          <span className="categoria">{produto.categoria?.nome || 'Sem categoria'}</span>
          <div className="preco">R$ {produto.preco?.toFixed(2) || '0.00'}</div>
          <div className="status">
            {produto.ativo ? "✅ Ativo" : "❌ Inativo"}
          </div>
          <div>
            <Link to={`/funcionario/produto/${produto.idProduto}/editar`}>
              Editar
            </Link>
          </div>
        </div>
      </div>
    ))}
  </div>
</section>

    </div>
  );
};

export default HomeFuncionario;
