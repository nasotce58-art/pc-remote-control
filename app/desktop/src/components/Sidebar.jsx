import React from 'react';

export default function Sidebar({ onMenuSelect, currentView }) {
  const menuItems = [
    { id: 'dashboard', label: '📊 Главная', icon: '📊' },
    { id: 'power', label: '⚡ Питание', icon: '⚡' },
    { id: 'monitor', label: '📈 Мониторинг', icon: '📈' },
    { id: 'files', label: '📁 Файлы', icon: '📁' },
    { id: 'settings', label: '⚙️ Настройки', icon: '⚙️' },
  ];

  return (
    <div className="sidebar">
      <div className="nav">
        <h2>Управление</h2>
        <ul>
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onMenuSelect(item.id)}
                style={{
                  background: currentView === item.id ? 'rgba(77, 166, 255, 0.2)' : 'transparent',
                  borderColor: currentView === item.id ? '#4da6ff' : '#404040',
                  color: currentView === item.id ? '#4da6ff' : '#ffffff',
                }}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
