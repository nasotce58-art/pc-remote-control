import React, { useState } from 'react';
import './App.css';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import PowerControl from './components/PowerControl';
import SystemMonitor from './components/SystemMonitor';
import FileManager from './components/FileManager';
import Settings from './components/Settings';

export default function App() {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'power':
        return <PowerControl />;
      case 'monitor':
        return <SystemMonitor />;
      case 'files':
        return <FileManager />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="app">
      <Header />
      <div className="main-container">
        <Sidebar onMenuSelect={setCurrentView} currentView={currentView} />
        <div className="content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
