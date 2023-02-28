// React
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

// Import Store
import { store } from '../app/store/index';

// Import Fonts
import '@fontsource/source-sans-pro';
import '@fontsource/montserrat';

// Custom Components
import App from './App'

// Styles
import './styles/App.scss';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
)
