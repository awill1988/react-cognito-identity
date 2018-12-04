import * as React from 'react';
import {Route, Switch} from 'react-router-dom';
import {IdentityProvider, Session} from 'react-cognito-identity';
import Home from './Home';
import Login from './Login';

export const App = () => {
  return (
    <IdentityProvider
      DEBUG={true}
      ClientId="<AWS_USER_POOL_CLIENT_ID>"
      UserPoolId="<AWS_USER_POOL_ID>"
      FlowType="CUSTOM_AUTH"
      loginRedirect="/login"
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