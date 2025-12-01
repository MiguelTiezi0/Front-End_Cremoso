import React, { useEffect, useState, useRef } from "react";
import { listarCategorias, listarProdutos } from "../../api/endpoints";
import {
  ChevronLeft,
  ChevronRight,
  Bell,
  MapPin,
  Store,
  IceCreamCone,
} from "lucide-react";
import "./Home.css";
import logoRosa from "../../assets/logoRosapng.png";

const URL_BACKEND =
  process.env.REACT_APP_URL_BACKEND || "http://localhost:8080";

const Home = () => {
  const [categorias, setCategorias] = useState([]);
  const [produtosPorCategoria, setProdutosPorCategoria] = useState({});
  const sliderRefs = useRef({});
  const dragStateRef = useRef({});

  useEffect(() => {
    carregarTudo();
  }, []);

  const carregarTudo = async () => {
    try {
      const { data: categoriasData } = await listarCategorias();
      const categoriasAtivas = categoriasData.filter((c) => c.ativa);
      setCategorias(categoriasAtivas);

      const { data: todosProdutos } = await listarProdutos();

      const mapa = {};
      categoriasAtivas.forEach((cat) => {
        // pegar todos os produtos ativos da categoria sem limite
        mapa[cat.idCategoria] = (todosProdutos || []).filter(
          (p) =>
            p.ativo &&
            (p.categoria?.idCategoria ?? p.categoria?.id) === cat.idCategoria
        );
      });

      setProdutosPorCategoria(mapa);
    } catch (err) {
      console.log("Erro ao carregar categorias e produtos", err);
    }
  };

  const scrollSlider = (catId, direction) => {
    const slider = sliderRefs.current[`slider-${catId}`];
    if (slider) {
      const cardWidth =
        slider.querySelector(".produto-card")?.offsetWidth || 220;
      const gap = parseInt(getComputedStyle(slider).gap || 16, 10) || 16;
      const scrollAmount = cardWidth + gap;
      slider.scrollBy({
        left: direction === "next" ? scrollAmount : -scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const renderProdutoCard = (produto) => {
    let imagemSrc = produto.imagemUrl;
    if (
      imagemSrc?.startsWith("/uploadsFront") ||
      imagemSrc?.startsWith("/imgs")
    ) {
    } else if (imagemSrc?.startsWith("/uploads")) {
      imagemSrc = URL_BACKEND + imagemSrc;
    } else if (imagemSrc) {
      imagemSrc = URL_BACKEND + imagemSrc;
    }
    if (!imagemSrc) imagemSrc = "/imgs/placeholder-produto.jpg";

    return (
      <div key={produto.idProduto} className="produto-card">
        <img src={imagemSrc} alt={produto.descricao} className="produto-img" />
        <div className="produto-info">
          <h3 className="produto-nome">{produto.descricao}</h3>
          <div className="precos-container">
            <span className="preco-reais">
              R$ {Number(produto.preco).toFixed(2)}
            </span>
            {produto.precoEmPontos !== undefined &&
              produto.precoEmPontos !== null && (
                <span className="preco-pontos">
                  ⭐ {produto.precoEmPontos} pts
                </span>
              )}
          </div>
        </div>
      </div>
    );
  };
  const handleTrocarEndereco = () => {
    console.log("Clicou em trocar endereço");
    alert("Funcionalidade de troca de endereço em desenvolvimento.");
  };

  return (
    <div className="home-container">
      <header className="home-header">
        <div className="header-info">
          <div className="usuario-info">
            <img src="/logo192.png" alt="imagemPerfil" className="imgPerfil" />
            {/* <img
              src={URL_BACKEND + "/uploads/produtos/1764425928459_Rauni%20.jpg"}
              alt="imagemPerfil"
              className="imgPerfil"
            /> */}
            <div>
              <p className="bemvindo">Bem-vindo</p>
              <h2 className="usuario-nome">Rauni Wink</h2>
            </div>
          </div>
          <img src={logoRosa} alt="Logo" className="logo" />

          <Bell className="icone-bell" size={32} />

          <div className="clube">
            <p>Saldo no clube Cremoso</p>
            <h2>
              <IceCreamCone /> 100 pts
            </h2>
          </div>
        </div>

        <div className="enderecos">
          <p>
            <Store size={76} strokeWidth={3} /> Rua Ennes Reis Rodrigues 285
          </p>
          <p>
            <MapPin size={18} /> Rua General Osorio 216{" "}
            <ChevronRight
              size={30}
              strokeWidth={3}
              onClick={handleTrocarEndereco}
              style={{ cursor: "pointer" }}
            />
          </p>
        </div>
      </header>

      {/* SLIDER DE CATEGORIAS */}
      <section
        className="categorias-slider"
        ref={(el) => {
          if (el && !dragStateRef.current[el]) {
            dragStateRef.current[el] = { isDown: false };
          }
        }}
        onPointerDown={(e) => {
          const ref = e.currentTarget;
          dragStateRef.current[ref] = {
            isDown: true,
            startX: e.clientX || (e.touches?.[0]?.clientX ?? 0),
            scrollLeft: ref.scrollLeft,
          };
          ref.classList.add("dragging");
        }}
        onPointerMove={(e) => {
          const ref = e.currentTarget;
          const state = dragStateRef.current[ref];
          if (!state?.isDown) return;
          const x = e.clientX || (e.touches?.[0]?.clientX ?? 0);
          const walk = (x - state.startX) * 1.2;
          ref.scrollLeft = state.scrollLeft - walk;
        }}
        onPointerUp={(e) => {
          const ref = e.currentTarget;
          dragStateRef.current[ref] = { isDown: false };
          ref.classList.remove("dragging");
        }}
        onPointerCancel={(e) => {
          const ref = e.currentTarget;
          dragStateRef.current[ref] = { isDown: false };
          ref.classList.remove("dragging");
        }}
        onPointerLeave={(e) => {
          const ref = e.currentTarget;
          dragStateRef.current[ref] = { isDown: false };
          ref.classList.remove("dragging");
        }}
      >
        {categorias.map((cat) => (
          <div
            key={cat.idCategoria}
            className="categoria-card"
            onClick={() =>
              document
                .getElementById(`cat-${cat.idCategoria}`)
                .scrollIntoView({ behavior: "smooth" })
            }
          >
            <img
              src={
                cat.imagemUrl?.startsWith("/uploadsFront") ||
                cat.imagemUrl?.startsWith("/imgs")
                  ? cat.imagemUrl
                  : cat.imagemUrl?.startsWith("/")
                  ? `${URL_BACKEND}${cat.imagemUrl}`
                  : cat.imagemUrl
                  ? `${URL_BACKEND}/${cat.imagemUrl}`
                  : "/imgs/placeholder-categoria.jpg"
              }
              alt={cat.nome}
              className="categoria-imagem"
            />
            <p>{cat.nome}</p>
          </div>
        ))}
      </section>

      {/* PRODUTOS AGRUPADOS POR CATEGORIA */}
      <main className="conteudo-principal">
        {categorias.map((categoria) => {
          const produtos = produtosPorCategoria[categoria.idCategoria] || [];

          return (
            <section
              id={`cat-${categoria.idCategoria}`}
              key={categoria.idCategoria}
              className="categoria-bloco"
            >
              <h2 className="categoria-titulo">{categoria.nome}</h2>

              <div className="slider-completo">
                <button
                  className="slider-btn prev"
                  aria-label="Produto anterior"
                  onClick={() => scrollSlider(categoria.idCategoria, "prev")}
                >
                  <ChevronLeft size={24} />
                </button>

                <div
                  ref={(el) => {
                    if (el) {
                      sliderRefs.current[`slider-${categoria.idCategoria}`] =
                        el;
                      if (!dragStateRef.current[el]) {
                        dragStateRef.current[el] = { isDown: false };
                      }
                    }
                  }}
                  className="produtos-slider"
                  onPointerDown={(e) => {
                    const ref = e.currentTarget;
                    dragStateRef.current[ref] = {
                      isDown: true,
                      startX: e.clientX || (e.touches?.[0]?.clientX ?? 0),
                      scrollLeft: ref.scrollLeft,
                    };
                    ref.classList.add("dragging");
                  }}
                  onPointerMove={(e) => {
                    const ref = e.currentTarget;
                    const state = dragStateRef.current[ref];
                    if (!state?.isDown) return;
                    const x = e.clientX || (e.touches?.[0]?.clientX ?? 0);
                    const walk = (x - state.startX) * 1.2;
                    ref.scrollLeft = state.scrollLeft - walk;
                  }}
                  onPointerUp={(e) => {
                    const ref = e.currentTarget;
                    dragStateRef.current[ref] = { isDown: false };
                    ref.classList.remove("dragging");
                  }}
                  onPointerCancel={(e) => {
                    const ref = e.currentTarget;
                    dragStateRef.current[ref] = { isDown: false };
                    ref.classList.remove("dragging");
                  }}
                  onPointerLeave={(e) => {
                    const ref = e.currentTarget;
                    dragStateRef.current[ref] = { isDown: false };
                    ref.classList.remove("dragging");
                  }}
                >
                  {produtos.map(renderProdutoCard)}
                </div>

                <button
                  className="slider-btn next"
                  aria-label="Próximo produto"
                  onClick={() => scrollSlider(categoria.idCategoria, "next")}
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
};

export default Home;
