import * as PropTypes from 'prop-types';
import React, {Component} from 'react';
import {Consumer} from './IdentityProvider';

const SignUpContext = React.createContext({state: {}});
const {Provider: SignUpProvider} = SignUpContext;
const SignUpConsumer = SignUpContext.Consumer;

class SignUp extends Component {
  static propTypes = {
    children: PropTypes.any
  };

  render() {
    const {children} = this.props;
    return (
      <Consumer>
        {
          ({state}) => {
            const {error, importantDetail, signUp, newUser} = state;
            const newState = {error, importantDetail, signUp, newUser};
            return (
              <SignUpProvider value={newState}>
                <SignUpConsumer>
                  {children}
                </SignUpConsumer>
              </SignUpProvider>
            );
          }
        }
      </Consumer>
    );
  }
}

export default SignUp;
