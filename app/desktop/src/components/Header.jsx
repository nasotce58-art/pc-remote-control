import React from 'react';

export default function Header() {
  const [appVersion, setAppVersion] = React.useState('');

  React.useEffect(() => {
    if (window.electron) {
      window.electron.getAppVersion().then(version => {
        setAppVersion(version);
      }).catch(err => console.error('Failed to get app version:', err));
    }
  }, []);

  const handleMinimize = () => {
    if (window.electron) {
      window.electron.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electron) {
      window.electron.maximize();
    }
  };

  const handleClose = () => {
    if (window.electron) {
      window.electron.close();
    }
  };

  return (
    <div className="header">
      <div className="header-title">
        <h1>🖥️ PC Control Station</h1>
      </div>
      <div className="header-info">
        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>
          v{appVersion}
        </span>
      </div>
      <div className="header-controls">
        <button className="control-btn" onClick={handleMinimize} title="Minimize">
          ─
        </button>
        <button className="control-btn" onClick={handleMaximize} title="Maximize">
          ◻
        </button>
        <button className="control-btn close" onClick={handleClose} title="Close">
          ✕
        </button>
      </div>
    </div>
  );
}
