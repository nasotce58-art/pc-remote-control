import React, { useState } from 'react';

export default function FileManager() {
  const [currentPath, setCurrentPath] = useState('C:\\');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleOpenFile = async (filename) => {
    setLoading(true);
    try {
      if (window.electron) {
        await window.electron.callAPI(`/files/open/${filename}`);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (filename) => {
    if (window.confirm(`Удалить файл "${filename}"?`)) {
      setLoading(true);
      try {
        if (window.electron) {
          await window.electron.callAPI(`/files/delete/${filename}`);
        }
      } catch (error) {
        console.error('Failed to delete file:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  const FileItem = ({ file, type }) => (
    <div style={{
      background: 'rgba(45, 45, 45, 0.5)',
      border: '1px solid #404040',
      borderRadius: '8px',
      padding: '15px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '10px',
      transition: 'all 0.3s ease',
    }} onMouseEnter={(e) => {
      e.currentTarget.style.borderColor = '#4da6ff';
      e.currentTarget.style.background = 'rgba(77, 166, 255, 0.05)';
    }} onMouseLeave={(e) => {
      e.currentTarget.style.borderColor = '#404040';
      e.currentTarget.style.background = 'rgba(45, 45, 45, 0.5)';
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>
          {type === 'folder' ? '📁' : type === 'image' ? '🖼️' : type === 'video' ? '🎬' : '📄'}
        </span>
        <div>
          <div style={{ fontWeight: 'bold' }}>{file}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>
            {type}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        {type !== 'folder' && (
          <>
            <button
              onClick={() => handleOpenFile(file)}
              disabled={loading}
              style={{
                padding: '8px 15px',
                background: 'rgba(77, 166, 255, 0.2)',
                border: '1px solid #4da6ff',
                color: '#4da6ff',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              Открыть
            </button>
            <button
              onClick={() => handleDeleteFile(file)}
              disabled={loading}
              style={{
                padding: '8px 15px',
                background: 'rgba(244, 67, 54, 0.1)',
                border: '1px solid #f44336',
                color: '#f44336',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 'bold',
              }}
            >
              Удалить
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="section">
      <h2>📁 Управление файлами</h2>

      <div style={{
        background: 'rgba(77, 166, 255, 0.1)',
        border: '1px solid #4da6ff',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
      }}>
        <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>Текущий путь</div>
        <div style={{ fontSize: '16px', color: '#4da6ff', fontWeight: 'bold', fontFamily: 'monospace' }}>
          {currentPath}
        </div>
      </div>

      <h3 style={{ marginBottom: '15px', color: '#4da6ff' }}>📂 Основные папки</h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '10px',
        marginBottom: '20px',
      }}>
        {['Документы', 'Загрузки', 'Рабочий стол', 'Видео', 'Музыка', 'Изображения'].map((folder) => (
          <button
            key={folder}
            onClick={() => setCurrentPath(`C:\\Users\\${folder}`)}
            style={{
              padding: '12px',
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              transition: 'all 0.3s ease',
            }} onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 118, 210, 0.3)';
            }} onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}>
              📂 {folder}
            </button>
          ))}
      </div>

      <h3 style={{ marginBottom: '15px', color: '#4da6ff' }}>📋 Файлы в папке</h3>
      <div>
        <FileItem file="Document.docx" type="file" />
        <FileItem file="Presentation.pptx" type="file" />
        <FileItem file="Spreadsheet.xlsx" type="file" />
        <FileItem file="Photo.jpg" type="image" />
        <FileItem file="Video.mp4" type="video" />
      </div>

      <div style={{
        marginTop: '20px',
        padding: '15px',
        background: 'rgba(255, 152, 0, 0.1)',
        border: '1px solid #ff9800',
        borderRadius: '8px',
        color: '#ff9800',
        fontSize: '14px',
      }}>
        <strong>ℹ️ Информация:</strong> Эта функция позволяет управлять файлами на ПК - открывать, удалять и просматривать содержимое папок.
      </div>
    </div>
  );
}
