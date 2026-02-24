import React, { useState } from 'react';

export default function PowerControl() {
  const [isLoading, setIsLoading] = useState({});
  const [feedback, setFeedback] = useState('');

  const handlePowerAction = async (action) => {
    setIsLoading(prev => ({ ...prev, [action]: true }));
    try {
      if (window.electron) {
        await window.electron.callAPI(`/power/${action}`);
        setFeedback(`✅ Команда "${action}" отправлена`);
        setTimeout(() => setFeedback(''), 3000);
      }
    } catch (error) {
      setFeedback(`❌ Ошибка: ${error.message}`);
      setTimeout(() => setFeedback(''), 3000);
    } finally {
      setIsLoading(prev => ({ ...prev, [action]: false }));
    }
  };

  const powerActions = [
    { id: 'wake', label: 'Пробуждение', icon: '⚡', color: '#1976d2' },
    { id: 'lock', label: 'Заблокировать', icon: '🔒', color: '#f57c00' },
    { id: 'sleep', label: 'Спящий режим', icon: '😴', color: '#1565c0' },
    { id: 'shutdown', label: 'Выключить', icon: '🔴', color: '#d32f2f' },
    { id: 'restart', label: 'Перезагрузка', icon: '🔄', color: '#7b1fa2' },
    { id: 'monitor', label: 'Экран вкл/выкл', icon: '🖥️', color: '#00796b' },
  ];

  return (
    <div className="section">
      <h2>⚡ Управление питанием</h2>

      {feedback && (
        <div style={{
          marginBottom: '20px',
          padding: '15px',
          background: feedback.includes('✅') ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          border: `1px solid ${feedback.includes('✅') ? '#4caf50' : '#f44336'}`,
          borderRadius: '8px',
          color: feedback.includes('✅') ? '#4caf50' : '#f44336',
        }}>
          {feedback}
        </div>
      )}

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        {powerActions.map(action => (
          <button
            key={action.id}
            onClick={() => handlePowerAction(action.id)}
            disabled={isLoading[action.id]}
            style={{
              padding: '20px',
              background: `linear-gradient(135deg, ${action.color} 0%, ${action.color}cc 100%)`,
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              cursor: isLoading[action.id] ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              opacity: isLoading[action.id] ? 0.6 : 1,
              transform: isLoading[action.id] ? 'scale(0.95)' : 'scale(1)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '24px' }}>
              {isLoading[action.id] ? '⏳' : action.icon}
            </span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      <h3 style={{ marginBottom: '15px', color: '#4da6ff' }}>⏰ Таймер выключения</h3>
      <div style={{
        background: 'rgba(45, 45, 45, 0.5)',
        border: '1px solid #404040',
        borderRadius: '8px',
        padding: '20px',
      }}>
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '15px',
        }}>
          <button style={{
            padding: '10px 20px',
            background: 'rgba(77, 166, 255, 0.2)',
            border: '1px solid #4da6ff',
            color: '#4da6ff',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
          }} onMouseEnter={(e) => {
            e.target.style.background = 'rgba(77, 166, 255, 0.3)';
          }} onMouseLeave={(e) => {
            e.target.style.background = 'rgba(77, 166, 255, 0.2)';
          }}>
            15 минут
          </button>
          <button style={{
            padding: '10px 20px',
            background: 'rgba(77, 166, 255, 0.2)',
            border: '1px solid #4da6ff',
            color: '#4da6ff',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
          }} onMouseEnter={(e) => {
            e.target.style.background = 'rgba(77, 166, 255, 0.3)';
          }} onMouseLeave={(e) => {
            e.target.style.background = 'rgba(77, 166, 255, 0.2)';
          }}>
            30 минут
          </button>
          <button style={{
            padding: '10px 20px',
            background: 'rgba(77, 166, 255, 0.2)',
            border: '1px solid #4da6ff',
            color: '#4da6ff',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease',
          }} onMouseEnter={(e) => {
            e.target.style.background = 'rgba(77, 166, 255, 0.3)';
          }} onMouseLeave={(e) => {
            e.target.style.background = 'rgba(77, 166, 255, 0.2)';
          }}>
            1 час
          </button>
        </div>
        <p style={{ color: '#999', fontSize: '14px' }}>
          Выберите время для запуска таймера выключения ПК
        </p>
      </div>
    </div>
  );
}
