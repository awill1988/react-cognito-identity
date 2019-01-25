import * as React from 'react';
import {Route, Switch} from 'react-router-dom';
import {IdentityProvider, Session} from 'react-cognito-identity';
import Home from './Home';
import Login from './Login';

const awsAuthConfig = {
  username: null,
  identityPoolId: null,
  region: null,
  clientId: null,
  userPoolId: null,
  flowType: 'CUSTOM_AUTH',
  storage: undefined,
  cookieStorage: {
    // REQUIRED - Cookie domain (only required if cookieStorage is provided)
    domain: '.localhost:3000',
    // OPTIONAL - Cookie path
    path: '/',
    // OPTIONAL - Cookie expiration in days
    expires: 1,
    // OPTIONAL - Cookie secure flag
    secure: false
  },
  oauth: null
};

const routingConfig = {
  shouldRedirect: true,
  login: '/login',
  loginSuccess: '/',
  logout: '/'
};

export const App = () => {
  return (
    <IdentityProvider
      DEBUG={true}
      awsAuthConfig={awsAuthConfig}
      routingConfig={routingConfig}
    >
      <Session>
        {(context) => {
          // CognitoUserSession is now available by accessing context.session
          return (
            <Switch>
              <Route exact path="/" component={() => <Home session={context.session}/>}/>
              <Route exact path="/login" component={Login}/>
            </Switch>
          );
        }}
      </Session>
    </IdentityProvider>
  );
};
