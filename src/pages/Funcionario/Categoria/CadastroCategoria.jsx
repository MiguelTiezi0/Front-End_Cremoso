import React, { useState } from 'react';
import { criarCategoria, uploadImagem } from '../../../api/endpoints';
import './Categoria.css';

const CadastroCategoria = () => {
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    imagemUrl: '',
    ativa: true
  });
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState('');
  
  // estados para imagem
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

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
    setUploadProgress(0);

    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(selected);
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setSucesso('');

  try {
    let imagemUrl = formData.imagemUrl;

    // se tem arquivo novo, faz upload primeiro - CORREÇÃO AQUI
    if (file) {
      const resUpload = await uploadImagem(file, 'categorias', (progress) => {
        setUploadProgress(progress);
      });
      imagemUrl = resUpload.data.url;
    }

    const payload = { ...formData, imagemUrl };
    await criarCategoria(payload);
    
    setSucesso('Categoria cadastrada com sucesso!');
    setFormData({ nome: '', descricao: '', imagemUrl: '', ativa: true });
    setFile(null);
    setPreview('');
    setUploadProgress(0); // reset progresso
  } catch (error) {
    console.error('Erro ao cadastrar:', error);
    alert('Erro ao cadastrar categoria.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="cadastro-container">
      <h2>Cadastrar Categoria</h2>
      {sucesso && <div className="sucesso">{sucesso}</div>}
      
      <form onSubmit={handleSubmit} className="cadastro-form">
        <div className="input-group">
          <label>Nome *</label>
          <input
            type="text"
            name="nome"
            value={formData.nome}
            onChange={handleChange}
            required
            placeholder="Ex: Bebidas"
          />
        </div>

        <div className="input-group">
          <label>Descrição</label>
          <textarea
            name="descricao"
            value={formData.descricao}
            onChange={handleChange}
            placeholder="Descrição da categoria"
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

          {file && (
            <small>
              {file.name}
              {uploadProgress > 0 && uploadProgress < 100 && ` (${uploadProgress}%)`}
            </small>
          )}
        </div>

        <div className="input-group">
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

        <button type="submit" disabled={loading} className="btn-cadastrar">
          {loading ? 'Cadastrando...' : 'Cadastrar Categoria'}
        </button>
      </form>
    </div>
  );
};

export default CadastroCategoria;
