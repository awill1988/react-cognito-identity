import React from 'react';
import {render} from 'react-dom';
import {Router} from 'react-router';
import {createBrowserHistory} from 'history';
import {IdentityProvider} from 'react-cognito-identity';
import {App} from './App';
import './style.css';

const awsAuthConfig = {
  identityPoolId: null, // If you intend to access AWS Resources directly
  region: '',
  clientId: '',
  userPoolId: '',
  flowType: 'USER_PASSWORD_AUTH',
  storage: undefined,
  oauth: null
};

const routingConfig = {
  shouldRedirect: true,
  login: '/login',
  loginSuccess: '/',
  logout: '/'
};

export const history = createBrowserHistory();

const WrappedApp = (
  <IdentityProvider
    DEBUG={true}
    history={history}
    // eslint-disable-next-line
    location={location}
    awsAuthConfig={awsAuthConfig}
    routingConfig={routingConfig}
  >
    <Router history={history}>
      <App/>
    </Router>
  </IdentityProvider>
);

render(WrappedApp, document.getElementById('root'));
