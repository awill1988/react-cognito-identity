import * as React from 'react';
import {Route, Switch} from 'react-router-dom';
import {IdentityProvider, Session} from 'react-cognito-identity';
import Home from './Home';
import Login from './Login';

const oauth = {
  domain: 'http://localhost:3000',
  scope: [
    'profile',
    'openid'
  ],
  redirectSignIn: 'http://localhost:3000/login',
  redirectSignOut: 'http://localhost:3000',
  responseType: 'token',
};

export const App = () => {
  return (
    <IdentityProvider
      DEBUG={true}
      ClientId=""
      UserPoolId=""
      FlowType="CUSTOM_AUTH"
      loginRedirect="/login"
      OAuthConfig={oauth}
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
}