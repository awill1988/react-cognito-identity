import React, {Component, createContext} from 'react';
import PropTypes from 'prop-types';
import {Consumer} from './IdentityProvider';

const AuthenticationContext = createContext();
const {Provider: AuthenticationProvider, Consumer: AuthenticationConsumer} = AuthenticationContext;

class Authentication extends Component {
  render() {
    const {children} = this.props;
    return (
      <Consumer>
        {
          ({state}) => {
            const {login, logout, challengeParameters, answerAuthChallenge, authenticated} = state;
            return (
              <AuthenticationProvider value={{login, logout, challengeParameters, answerAuthChallenge, authenticated}}>
                <AuthenticationConsumer value={{state}}>
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

Authentication.propTypes = {
  children: PropTypes.any
};

export default Authentication;
