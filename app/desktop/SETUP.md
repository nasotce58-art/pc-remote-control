# Electron + React Setup Guide

## 1. Инициализация проекта

Для работы приложения нужны инструменты сборки. Создам конфигурацию для Vite.

## 2. Конфигурация Vite

Создать файл `vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true
  }
})
```

## 3. Обновить package.json

Добавить devDependencies:
- `vite` - сборщик модулей
- `@vitejs/plugin-react` - плагин для React
- `@testing-library/react` - тестирование

```bash
npm install --save-dev vite @vitejs/plugin-react @testing-library/react
```

## 4. Обновить скрипты запуска

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "electron": "electron .",
    "electron-dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && npm run electron\""
  }
}
```

## 5. Установить утилиты

```bash
npm install --save-dev concurrently wait-on
```

## 6. Обновить main.js

```javascript
const startUrl = process.env.REACT_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
```

## 7. Запуск приложения

```bash
# Development режим
npm run electron-dev

# Production сборка
npm run build
npm run electron
```

## 8. Результат

Готовое Electron приложение с React интерфейсом, работающее как на Windows, так и на других платформах.
