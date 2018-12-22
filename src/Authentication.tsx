import * as PropTypes from 'prop-types';
import {Consumer} from './IdentityProvider';
import React, {ReactNode, Component} from 'react';

const AuthenticationContext = React.createContext<IAuthenticationState|{}>({state: {}});
const {Provider: AuthenticationProvider} = AuthenticationContext;
const AuthenticationConsumer = AuthenticationContext.Consumer as any;

class Authentication extends Component<{children: ReactNode}> {
  static propTypes = {
    children: PropTypes.any
  };

  render() {
    const {children} = this.props;
    return (
      <Consumer>
        {
          ({state}: any) => {
            const {login, logout, challengeParameters, answerAuthChallenge, authenticated, error} = state;
            const newState = {login, logout, challengeParameters, answerAuthChallenge, authenticated, error};
            return (
              <AuthenticationProvider value={newState}>
                <AuthenticationConsumer children={children}/>
              </AuthenticationProvider>
            );
          }
        }
      </Consumer>
    );
  }
}

export default Authentication;
