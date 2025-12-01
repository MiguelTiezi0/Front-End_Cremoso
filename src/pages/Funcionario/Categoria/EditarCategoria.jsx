import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { buscarCategoria, atualizarCategoria, uploadImagem } from '../../../api/endpoints';
import './Categoria.css';

const EditarCategoria = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    imagemUrl: '',
    ativa: true
  });
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // estados para imagem
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');

  useEffect(() => {
    carregarCategoria();
  }, [id]);

  const carregarCategoria = async () => {
    try {
      const response = await buscarCategoria(id);
      const categoria = response.data;
      setFormData(categoria);
      setPreview(categoria.imagemUrl ? `http://localhost:8080${categoria.imagemUrl}` : '');
    } catch (error) {
      console.error('Erro ao carregar categoria:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;

    setFile(selected);

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(selected);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSalvando(true);

    try {
      let imagemUrl = formData.imagemUrl;

      // se tem arquivo novo, faz upload primeiro
      if (file) {
         const resUpload = await uploadImagem(file, 'categorias');
        imagemUrl = resUpload.data.url;
      }

      const payload = { ...formData, imagemUrl };
      await atualizarCategoria(id, payload);
      
      alert('Categoria atualizada com sucesso!');
      navigate('/categorias');
    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar categoria.');
    } finally {
      setSalvando(false);
    }
  };

  if (loading) return <div>Carregando categoria...</div>;

  return (
    <div className="editar-container">
      <h2>Editar Categoria</h2>
      
      <form onSubmit={handleSubmit} className="editar-form">
        <div className="input-group">
          <label>Nome *</label>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
          />
        </div>

        <div className="input-group">
          <label>Descrição</label>
          <textarea
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            rows="3"
          />
        </div>

        {/* Imagem com preview e upload */}
        <div className="input-group">
          <label>Imagem da Categoria</label>
          
          {preview && (
            <div className="preview-imagem">
              <img 
                src={preview} 
                alt="Preview" 
                style={{ maxWidth: '200px', maxHeight: '150px' }} 
              />
            </div>
          )}

          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />

          {file && <small>Arquivo selecionado: {file.name}</small>}
        </div>

        <div className="input-group checkbox-group">
          <label>
            <input
              type="checkbox"
              name="ativa"
              checked={formData.ativa}
              onChange={(e) => setFormData({ ...formData, ativa: e.target.checked })}
            />
            Ativa
          </label>
        </div>

        <div className="botoes">
          <button type="submit" disabled={salvando} className="btn-salvar">
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>
          <button type="button" onClick={() => navigate('/categorias')} className="btn-cancelar">
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditarCategoria;
