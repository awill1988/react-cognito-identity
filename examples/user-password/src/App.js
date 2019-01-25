import * as React from 'react';
import {Switch, Route} from 'react-router-dom';
import {Session} from 'react-cognito-identity';
import Home from './Home';
import Login from './Login';

export const App = () => {
  return (
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
  );
};
