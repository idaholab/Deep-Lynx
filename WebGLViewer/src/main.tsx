import React from 'react'
import ReactDOM from 'react-dom/client'

import { store } from '../app/store/index';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';

import '@fontsource/source-sans-pro';

import App from './App'
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
