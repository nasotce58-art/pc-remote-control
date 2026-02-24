import React, { useState, useEffect } from 'react';

export default function SystemMonitor() {
  const [stats, setStats] = useState({
    cpu: 0,
    ram: 0,
    gpu: 0,
    temperature: 0,
    network: { up: 0, down: 0 },
    processes: [],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        if (window.electron) {
          const response = await window.electron.callAPI('/monitor/stats');
          setStats(response);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Update every 5 seconds
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const getPerformanceColor = (percentage) => {
    if (percentage < 30) return '#4caf50'; // green
    if (percentage < 70) return '#ff9800'; // orange
    return '#f44336'; // red
  };

  const ProgressBar = ({ value, max = 100 }) => (
    <div style={{
      width: '100%',
      height: '8px',
      background: '#404040',
      borderRadius: '4px',
      marginTop: '8px',
      overflow: 'hidden',
    }}>
      <div style={{
        height: '100%',
        width: `${(value / max) * 100}%`,
        background: getPerformanceColor(value),
        transition: 'width 0.3s ease',
        borderRadius: '4px',
      }} />
    </div>
  );

  return (
    <div className="section">
      <h2>📈 Мониторинг системы</h2>

      {loading && <p style={{ color: '#999' }}>⏳ Загрузка данных...</p>}

      <h3 style={{ marginBottom: '15px', marginTop: '20px', color: '#4da6ff' }}>💻 Основные показатели</h3>
      <div className="status-grid">
        <div className="status-card">
          <h3>Процессор</h3>
          <div className="value">{stats.cpu}%</div>
          <ProgressBar value={stats.cpu} />
        </div>
        <div className="status-card">
          <h3>Оперативная память</h3>
          <div className="value">{stats.ram}%</div>
          <ProgressBar value={stats.ram} />
        </div>
        <div className="status-card">
          <h3>Видеокарта</h3>
          <div className="value">{stats.gpu}%</div>
          <ProgressBar value={stats.gpu} />
        </div>
        <div className="status-card">
          <h3>Температура</h3>
          <div className="value" style={{
            color: getPerformanceColor(stats.temperature > 80 ? 90 : stats.temperature)
          }}>
            {stats.temperature}°C
          </div>
          <ProgressBar value={stats.temperature} max={100} />
        </div>
      </div>

      <h3 style={{ marginBottom: '15px', marginTop: '20px', color: '#4da6ff' }}>🌐 Сеть</h3>
      <div style={{
        background: 'rgba(45, 45, 45, 0.5)',
        border: '1px solid #404040',
        borderRadius: '8px',
        padding: '20px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px',
      }}>
        <div>
          <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>Отправлено</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4da6ff' }}>
            {stats.network?.up || 0} Kb/s
          </div>
        </div>
        <div>
          <div style={{ fontSize: '14px', color: '#999', marginBottom: '8px' }}>Получено</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
            {stats.network?.down || 0} Kb/s
          </div>
        </div>
      </div>

      <h3 style={{ marginBottom: '15px', marginTop: '20px', color: '#4da6ff' }}>📋 Процессы</h3>
      <div style={{
        background: 'rgba(45, 45, 45, 0.5)',
        border: '1px solid #404040',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        <table style={{
          width: '100%',
          fontSize: '14px',
          borderCollapse: 'collapse',
        }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #404040' }}>
              <th style={{ padding: '12px', textAlign: 'left', color: '#4da6ff' }}>Процесс</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#4da6ff' }}>Память</th>
              <th style={{ padding: '12px', textAlign: 'right', color: '#4da6ff' }}>CPU</th>
            </tr>
          </thead>
          <tbody>
            {stats.processes && stats.processes.slice(0, 10).map((proc, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #2d2d2d' }}>
                <td style={{ padding: '12px', color: '#ffffff' }}>{proc.name}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#4da6ff' }}>{proc.memory}MB</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#4caf50' }}>{proc.cpu}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!stats.processes || stats.processes.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            Нет данных о процессах
          </div>
        )}
      </div>
    </div>
  );
}
