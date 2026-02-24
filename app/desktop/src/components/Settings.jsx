import React, { useState, useEffect } from 'react';

export default function Settings() {
  const [config, setConfig] = useState({
    workerUrl: '',
    deviceId: '',
    deviceToken: ''
  });
  const [status, setStatus] = useState('disconnected');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);

  useEffect(() => {
    loadConfig();
    loadSystemInfo();
    
    // Listen for settings open from menu
    window.electron.onOpenSettings(() => {
      console.log('Settings opened from menu');
    });

    return () => {
      window.electron.removeAllListeners('open-settings');
    };
  }, []);

  useEffect(() => {
    // Listen for connection status changes
    const unsubscribe = window.electron.onConnectionStatus((newStatus) => {
      setStatus(newStatus);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadConfig = async () => {
    try {
      const savedConfig = await window.electron.getConfig();
      if (savedConfig) {
        setConfig(savedConfig);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const loadSystemInfo = async () => {
    try {
      const info = await window.electron.getSystemInfo();
      setSystemInfo(info);
    } catch (error) {
      console.error('Error loading system info:', error);
    }
  };

  const handleSave = async () => {
    try {
      const success = await window.electron.saveConfig(config);
      if (success) {
        alert('Настройки сохранены!');
        const newStatus = await window.electron.getConnectionStatus();
        setStatus(newStatus);
      } else {
        alert('Ошибка сохранения настроек');
      }
    } catch (error) {
      alert('Ошибка: ' + error.message);
    }
  };

  const handleGenerateDeviceId = () => {
    const id = `${randomId()}-${randomId()}`;
    setConfig(prev => ({ ...prev, deviceId: id }));
  };

  const randomId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const result = await window.electron.testConnection(config);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'online': return '#4caf50';
      case 'offline': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'online': return '🟢 Подключено';
      case 'offline': return '🔴 Отключено';
      default: return '⚪ Неизвестно';
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>⚙️ Настройки</h1>

      {/* Connection Status */}
      <div style={{ ...styles.statusCard, borderLeft: `4px solid ${getStatusColor()}` }}>
        <div style={styles.statusLabel}>Статус подключения:</div>
        <div style={styles.statusText}>{getStatusText()}</div>
      </div>

      {/* Configuration Form */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>📡 Cloudflare Worker</h2>

        <div style={styles.formGroup}>
          <label style={styles.label}>Worker URL:</label>
          <input
            type="text"
            style={styles.input}
            value={config.workerUrl}
            onChange={(e) => setConfig(prev => ({ ...prev, workerUrl: e.target.value }))}
            placeholder="https://your-worker.workers.dev"
          />
          <small style={styles.hint}>URL вашего Cloudflare Worker</small>
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🆔 Устройство</h2>

        <div style={styles.formGroup}>
          <label style={styles.label}>Device ID:</label>
          <div style={styles.inputGroup}>
            <input
              type="text"
              style={{ ...styles.input, flex: 1 }}
              value={config.deviceId}
              onChange={(e) => setConfig(prev => ({ ...prev, deviceId: e.target.value.toUpperCase() }))}
              placeholder="XXXX-XXXX"
            />
            <button
              style={styles.buttonSecondary}
              onClick={handleGenerateDeviceId}
            >
              Генерировать
            </button>
          </div>
          <small style={styles.hint}>Уникальный идентификатор этого ПК</small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Device Token:</label>
          <input
            type="text"
            style={styles.input}
            value={config.deviceToken}
            onChange={(e) => setConfig(prev => ({ ...prev, deviceToken: e.target.value }))}
            placeholder="Автоматически при регистрации"
            disabled
          />
          <small style={styles.hint}>Токен устройства (автоматически)</small>
        </div>
      </div>

      {/* Test Connection */}
      <div style={styles.card}>
        <h2 style={styles.cardTitle}>🧪 Тест подключения</h2>
        
        <button
          style={styles.buttonPrimary}
          onClick={handleTestConnection}
          disabled={testing || !config.workerUrl || !config.deviceId}
        >
          {testing ? 'Проверка...' : 'Проверить подключение'}
        </button>

        {testResult && (
          <div style={{
            ...styles.testResult,
            backgroundColor: testResult.success ? '#e8f5e9' : '#ffebee'
          }}>
            {testResult.success ? (
              <div>✅ Подключение успешно!</div>
            ) : (
              <div>❌ Ошибка: {testResult.error || testResult.data?.error}</div>
            )}
          </div>
        )}
      </div>

      {/* System Info */}
      {systemInfo && (
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>💻 Информация о системе</h2>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>ОС:</span>
              <span>{systemInfo.platform}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Архитектура:</span>
              <span>{systemInfo.arch}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Имя ПК:</span>
              <span>{systemInfo.hostname}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>CPU:</span>
              <span>{systemInfo.cpus} ядер</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Память:</span>
              <span>{(systemInfo.totalMem / 1024 / 1024 / 1024).toFixed(2)} GB</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Версия:</span>
              <span>v{systemInfo.version}</span>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div style={styles.actions}>
        <button
          style={styles.buttonSuccess}
          onClick={handleSave}
        >
          💾 Сохранить настройки
        </button>
      </div>

      {/* Help */}
      <div style={styles.help}>
        <h3>📖 Как настроить:</h3>
        <ol style={styles.helpList}>
          <li>Разверните Cloudflare Worker (см. инструкцию)</li>
          <li>Введите URL вашего Worker</li>
          <li>Сгенерируйте или введите Device ID</li>
          <li>Нажмите "Проверить подключение"</li>
          <li>Сохраните настройки</li>
          <li>Откройте Telegram бота и подключите этот ПК</li>
        </ol>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  },
  title: {
    fontSize: '28px',
    marginBottom: '20px',
    color: '#333'
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: '15px 20px',
    borderRadius: '8px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  statusLabel: {
    fontSize: '14px',
    color: '#666'
  },
  statusText: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginTop: '5px'
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
  formGroup: {
    marginBottom: '15px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '5px',
    color: '#555'
  },
  input: {
    width: '100%',
    padding: '10px',
    fontSize: '14px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxSizing: 'border-box'
  },
  inputGroup: {
    display: 'flex',
    gap: '10px'
  },
  hint: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginTop: '5px'
  },
  buttonPrimary: {
    backgroundColor: '#2196f3',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    fontSize: '14px',
    borderRadius: '4px',
    cursor: 'pointer',
    marginRight: '10px'
  },
  buttonSecondary: {
    backgroundColor: '#757575',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    fontSize: '14px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  buttonSuccess: {
    backgroundColor: '#4caf50',
    color: '#fff',
    border: 'none',
    padding: '12px 24px',
    fontSize: '14px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  actions: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  testResult: {
    marginTop: '15px',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '14px'
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px'
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px'
  },
  infoLabel: {
    fontWeight: 'bold',
    color: '#555'
  },
  help: {
    backgroundColor: '#e3f2fd',
    padding: '15px',
    borderRadius: '8px',
    marginTop: '20px'
  },
  helpList: {
    marginTop: '10px',
    paddingLeft: '20px'
  }
};
