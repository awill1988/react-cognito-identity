import React from 'react';
import { render } from 'react-dom';
import { IdentityProvider } from 'react-cognito-identity';

import { App } from './App';

const WrappedApp = (
  <IdentityProvider
    DEBUG={true}
  >
    <App />
  </IdentityProvider>
);

render(WrappedApp, document.getElementById('root'));