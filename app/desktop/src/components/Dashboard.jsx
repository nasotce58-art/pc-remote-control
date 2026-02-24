import React, { useState, useEffect } from 'react';

export default function Dashboard() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [deviceConfig, setDeviceConfig] = useState(null);

  useEffect(() => {
    loadSystemInfo();
    loadConfig();
    
    // Listen for connection status changes
    const unsubscribe = window.electron.onConnectionStatus((status) => {
      setConnectionStatus(status);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadSystemInfo = async () => {
    try {
      const info = await window.electron.getSystemInfo();
      setSystemInfo(info);
    } catch (error) {
      console.error('Error loading system info:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const config = await window.electron.getConfig();
      setDeviceConfig(config);
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'online': return '#4caf50';
      case 'offline': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'online': return '🟢 Онлайн';
      case 'offline': return '🔴 Офлайн';
      default: return '⚪ Неизвестно';
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🖥️ PC Remote Control</h1>
      
      {/* Connection Status */}
      <div style={{ ...styles.statusCard, borderLeft: `4px solid ${getStatusColor()}` }}>
        <div style={styles.statusHeader}>
          <span style={styles.statusLabel}>Статус подключения:</span>
          <span style={{ ...styles.statusText, color: getStatusColor() }}>
            {getStatusText()}
          </span>
        </div>
        {deviceConfig?.deviceId && (
          <div style={styles.deviceId}>
            Device ID: <strong>{deviceConfig.deviceId}</strong>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>💻</div>
          <div style={styles.statValue}>
            {systemInfo ? systemInfo.hostname : 'Загрузка...'}
          </div>
          <div style={styles.statLabel}>Имя ПК</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🖥️</div>
          <div style={styles.statValue}>
            {systemInfo ? systemInfo.platform : 'N/A'}
          </div>
          <div style={styles.statLabel}>ОС</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>⚙️</div>
          <div style={styles.statValue}>
            {systemInfo ? `${systemInfo.cpus} ядер` : 'N/A'}
          </div>
          <div style={styles.statLabel}>CPU</div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statIcon}>🧠</div>
          <div style={styles.statValue}>
            {systemInfo ? `${(systemInfo.totalMem / 1024 / 1024 / 1024).toFixed(2)} GB` : 'N/A'}
          </div>
          <div style={styles.statLabel}>RAM</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>⚡ Быстрые действия</h2>
        <div style={styles.actionsGrid}>
          <div style={styles.actionCard}>
            <div style={styles.actionIcon}>⚡</div>
            <div style={styles.actionLabel}>Рестарт</div>
          </div>
          <div style={styles.actionCard}>
            <div style={styles.actionIcon}>💤</div>
            <div style={styles.actionLabel}>Сон</div>
          </div>
          <div style={styles.actionCard}>
            <div style={styles.actionIcon}>⏹️</div>
            <div style={styles.actionLabel}>Выключить</div>
          </div>
          <div style={styles.actionCard}>
            <div style={styles.actionIcon}>🔒</div>
            <div style={styles.actionLabel}>Блокировка</div>
          </div>
        </div>
        <p style={styles.hint}>
          💡 Используйте Telegram бота для управления ПК
        </p>
      </div>

      {/* Setup Instructions */}
      {!deviceConfig?.deviceId && (
        <div style={styles.setupCard}>
          <h2 style={styles.cardTitle}>🚀 Начало работы</h2>
          <ol style={styles.setupList}>
            <li>Перейдите в раздел <strong>⚙️ Настройки</strong></li>
            <li>Введите URL вашего Cloudflare Worker</li>
            <li>Сгенерируйте Device ID</li>
            <li>Сохраните настройки</li>
            <li>Подключите ПК через Telegram бота</li>
          </ol>
        </div>
      )}

      {/* System Info */}
      {systemInfo && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>📊 Информация о системе</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Платформа:</span>
              <span>{systemInfo.platform} {systemInfo.arch}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Версия приложения:</span>
              <span>v{systemInfo.version}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Electron:</span>
              <span>v{systemInfo.electron}</span>
            </div>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>Node.js:</span>
              <span>v{systemInfo.node}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  title: {
    fontSize: '28px',
    marginBottom: '20px',
    color: '#333'
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  statusHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  statusLabel: {
    fontSize: '14px',
    color: '#666'
  },
  statusText: {
    fontSize: '20px',
    fontWeight: 'bold'
  },
  deviceId: {
    fontSize: '14px',
    color: '#555',
    marginTop: '10px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '20px'
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  statIcon: {
    fontSize: '32px',
    marginBottom: '10px'
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '5px'
  },
  statLabel: {
    fontSize: '12px',
    color: '#888'
  },
  card: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  cardTitle: {
    fontSize: '18px',
    marginBottom: '15px',
    color: '#333'
  },
  actionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '15px'
  },
  actionCard: {
    backgroundColor: '#f5f5f5',
    padding: '20px',
    borderRadius: '8px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'translateY(-2px)'
    }
  },
  actionIcon: {
    fontSize: '32px',
    marginBottom: '10px'
  },
  actionLabel: {
    fontSize: '14px',
    color: '#555'
  },
  hint: {
    marginTop: '15px',
    fontSize: '14px',
    color: '#666',
    fontStyle: 'italic'
  },
  setupCard: {
    backgroundColor: '#e3f2fd',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  setupList: {
    marginTop: '10px',
    paddingLeft: '20px',
    fontSize: '14px',
    lineHeight: '1.8',
    color: '#1565c0'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px'
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px'
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#555'
  }
};
