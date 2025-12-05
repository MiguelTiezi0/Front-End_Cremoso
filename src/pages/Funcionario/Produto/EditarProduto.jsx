import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  buscarProduto,
  atualizarProduto,
  listarCategorias,
  uploadImagem
} from '../../../api/endpoints';
import './Produto.css';

const EditarProduto = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    descricao: '',
    quantidade: 0,
    preco: 0,
    ativo: true,
    categoria: null,
    imagemUrl: '',
    precoEmPontos: 0,
    ganhoDePontos: 0
  });

  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [file, setFile] = useState(null);           // arquivo selecionado
  const [preview, setPreview] = useState('');       // preview da imagem
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    Promise.all([buscarProduto(id), listarCategorias()])
      .then(([produtoRes, categoriasRes]) => {
        const produto = produtoRes.data;
        setFormData({
          descricao: produto.descricao,
          quantidade: produto.quantidade,
          preco: produto.preco,
          ativo: produto.ativo,
          categoria: produto.categoria,
          imagemUrl: produto.imagemUrl || '',
          precoEmPontos: produto.precoEmPontos || 0,
          ganhoDePontos: produto.ganhoDePontos || 0
        });
        setCategorias(categoriasRes.data);
        setPreview(produto.imagemUrl || '');
      })
      .catch(error => {
        console.error('Erro ao carregar dados:', error);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (name === 'categoria') {
      const categoriaSelecionada = categorias.find(
        cat => cat.idCategoria === parseInt(value, 10)
      );
      setFormData(prev => ({ ...prev, categoria: categoriaSelecionada }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]:
          type === 'checkbox'
            ? checked
            : ['quantidade', 'preco', 'precoEmPontos', 'ganhoDePontos'].includes(name)
            ? Number(value)
            : value
      }));
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files && e.target.files[0];
    if (!selected) return;

    setFile(selected);
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result); // preview local
    };
    reader.readAsDataURL(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);

    try {
      let imagemUrl = formData.imagemUrl;

      // se o usuário escolheu um novo arquivo, faz upload primeiro
      if (file) {
         const resUpload = await uploadImagem(file, 'produtos', (progress) => {
               setUploadProgress(progress);
             });
        imagemUrl = resUpload.data.url; // ex.: /uploads/produtos/arquivo.jpg
      }

      const payload = {
        ...formData,
        imagemUrl
      };

      await atualizarProduto(id, payload);
      alert('Produto atualizado com sucesso!');
      navigate('/');
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      alert('Erro ao atualizar produto.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <div className="loading">Carregando produto...</div>;

  return (
    <div className="editar-produto-container">
      <h2>Editar Produto</h2>

      <form onSubmit={handleSubmit} className="editar-produto-form">
        <div className="input-group">
          <label>Descrição *</label>
          <input
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            required
            maxLength={100}
          />
        </div>

        <div className="input-group">
          <label>Quantidade *</label>
          <input
            name="quantidade"
            type="number"
            value={formData.quantidade}
            onChange={handleChange}
            required
            min={0}
          />
        </div>

        <div className="input-group">
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
        </div>

        <div className="input-group">
          <label>Categoria *</label>
          <select
            name="categoria"
            value={formData.categoria?.idCategoria || ''}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Selecione uma categoria
            </option>
            {categorias.map(cat => (
              <option key={cat.idCategoria} value={cat.idCategoria}>
                {cat.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Imagem: preview + upload arquivo */}
        <div className="input-group">
          <label>Imagem do Produto</label>

          {preview && (
            <div className="preview-imagem">
              <img src={preview.startsWith('http') ? preview : `http://localhost:8080${preview}`} alt="Preview" />
            </div>
          )}

          <input
        
            type="file" className="ImgFile"
            accept="image/*"
            onChange={handleFileChange}
          />



          {file && (
            <small>
              Arquivo selecionado: {file.name}
              {uploadProgress > 0 && uploadProgress < 100 && ` (${uploadProgress}%)`}
            </small>
          )}
        </div>

        <div className="input-group">
          <label>Preço em Pontos</label>
          <input
            name="precoEmPontos"
            type="number"
            value={formData.precoEmPontos}
            onChange={handleChange}
            min={0}
          />
        </div>

        <div className="input-group">
          <label>Ganho de Pontos</label>
          <input
            name="ganhoDePontos"
            type="number"
            value={formData.ganhoDePontos}
            onChange={handleChange}
            min={0}
          />
        </div>

        <div className="input-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="ativo"
              checked={formData.ativo}
              onChange={handleChange}
            />
            Ativo
          </label>
        </div>

        <div className="botoes">
          <button type="submit" disabled={salvando} className="btn-salvar">
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-cancelar"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditarProduto;
