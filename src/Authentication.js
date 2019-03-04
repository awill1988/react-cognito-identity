import * as PropTypes from 'prop-types';
import React, {Component} from 'react';
import {Consumer} from './IdentityProvider';

const AuthenticationContext = React.createContext({state: {}});
const {Provider: AuthenticationProvider} = AuthenticationContext;
const AuthenticationConsumer = AuthenticationContext.Consumer;

class Authentication extends Component {
  static propTypes = {
    children: PropTypes.any
  };

  render() {
    const {children} = this.props;
    return (
      <Consumer>
        {
          ({state}) => {
            const {login, logout, challengeParameters, answerAuthChallenge, confirmSignUp, authenticated, error, forgotPassword, resetPassword, importantDetail, reset} = state;
            const newState = {login, logout, challengeParameters, confirmSignUp, answerAuthChallenge, authenticated, error, forgotPassword, resetPassword, importantDetail, reset};
            return (
              <AuthenticationProvider value={newState}>
                <AuthenticationConsumer>
                  {children}
                </AuthenticationConsumer>
              </AuthenticationProvider>
            );
          }
        }
      </Consumer>
    );
  }
}

export default Authentication;
