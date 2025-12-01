import React, { useState, useEffect } from "react";
import {
  criarProduto,
  listarCategorias,
  uploadImagem,
} from "../../../api/endpoints";
import "./Produto.css";

const CadastroProduto = () => {
  const [formData, setFormData] = useState({
    descricao: "",
    quantidade: 0,
    preco: 0,
    ativo: true,
    categoria: null,
    imagemUrl: "",
    precoEmPontos: 0,
    ganhoDePontos: 0,
  });
  const [categorias, setCategorias] = useState([]);
  const [file, setfile] = useState(null);
  const [imagemPreview, setImagemPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    listarCategorias()
      .then(({ data }) => setCategorias(data))
      .catch(console.error);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (name === "categoria") {
      const categoriaSelecionada = categorias.find(
        (cat) => cat.idCategoria === parseInt(value)
      );
      setFormData((prev) => ({ ...prev, categoria: categoriaSelecionada }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]:
          type === "checkbox"
            ? checked
            : [
                "quantidade",
                "preco",
                "precoEmPontos",
                "ganhoDePontos",
              ].includes(name)
            ? Number(value)
            : value,
      }));
    }
  };

  const handleImagemChange = (e) => {
    const arquivo = e.target.files[0];
    if (arquivo) {
      setfile(arquivo);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagemPreview(reader.result);
      };
      reader.readAsDataURL(arquivo);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSucesso("");

    try {
      let urlImagem = "";

      // 1. UPLOAD DA IMAGEM PRIMEIRO
      if (file) {
       
        const uploadRes = await uploadImagem(file, "produtos", (progress) => {
          setUploadProgress(progress);
        });
        urlImagem = uploadRes.data.url; // Backend retorna a URL
        
      }

      // 2. CADASTRO DO PRODUTO
      const dadosProduto = {
        ...formData,
        categoria: { idCategoria: formData.categoria?.idCategoria },
        imagemUrl: urlImagem,
      };

    
      await criarProduto(dadosProduto);

      setSucesso("✅ Produto cadastrado com sucesso!");
      setFormData({
        descricao: "",
        quantidade: 0,
        preco: 0,
        ativo: true,
        categoria: null,
        imagemUrl: "",
        precoEmPontos: 0,
        ganhoDePontos: 0,
      });
      setfile(null);
      setImagemPreview("");
      setUploadProgress(0);
    } catch (error) {
      console.error("❌ Erro:", error.response?.data || error.message);
      setSucesso("❌ Erro no cadastro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cadastro-produto-container">
      <h2>Cadastrar Produto</h2>
      {sucesso && <div className="sucesso">{sucesso}</div>}

      <form
        onSubmit={handleSubmit}
        className="cadastro-produto-form"
        encType="multipart/form-data"
      >
        <label>Descrição *</label>
        <input
          name="descricao"
          value={formData.descricao}
          onChange={handleChange}
          required
          maxLength={100}
        />

        <label>Quantidade *</label>
        <input
          name="quantidade"
          type="number"
          value={formData.quantidade}
          onChange={handleChange}
          required
          min={0}
        />

        <label>Preço *</label>
        <input
          name="preco"
          type="number"
          step="0.01"
          value={formData.preco}
          onChange={handleChange}
          required
          min={0}
        />

        <label>Categoria *</label>
        <select
          name="categoria"
          onChange={handleChange}
          required
          value={formData.categoria?.idCategoria || ""}
        >
          <option value="" disabled>
            Selecione uma categoria
          </option>
          {categorias.map((cat) => (
            <option key={cat.idCategoria} value={cat.idCategoria}>
              {cat.nome}
            </option>
          ))}
        </select>

        <label>Imagem *</label>
        <input
          name="imagem"
          type="file"
          onChange={handleImagemChange}
          accept="image/png, image/jpeg, image/jpg"
          required={!imagemPreview}
        />

        {imagemPreview && (
          <div className="imagem-preview">
            <img src={imagemPreview} alt="Preview" />
            {uploadProgress > 0 && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        <label>Preço em Pontos</label>
        <input
          name="precoEmPontos"
          type="number"
          value={formData.precoEmPontos}
          onChange={handleChange}
          min={0}
        />

        <label>Ganho de Pontos</label>
        <input
          name="ganhoDePontos"
          type="number"
          value={formData.ganhoDePontos}
          onChange={handleChange}
          min={0}
        />

        <label>
          <input
            type="checkbox"
            name="ativo"
            checked={formData.ativo}
            onChange={handleChange}
          />
          Ativo
        </label>

        <button className="btn-cadastrar" type="submit" disabled={loading}>
          {loading ? "Cadastrando..." : "Cadastrar Produto"}
        </button>
      </form>
    </div>
  );
};

export default CadastroProduto;
