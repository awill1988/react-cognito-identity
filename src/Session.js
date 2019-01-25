import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Consumer} from './IdentityProvider';

const SessionContext = React.createContext({
  awsCredentials: null,
  session: null,
  authenticated: false,
  error: undefined,
});
const {Provider: SessionProvider} = SessionContext;

const SessionConsumer = SessionContext.Consumer;

class Session extends Component {
  static propTypes = {
    children: PropTypes.any
  };

  render() {
    const {children} = this.props;
    return (
      <Consumer>
        {
          ({state}) => {
            const {awsCredentials, session, authenticated, error, tapSession} = state;
            return (
              <SessionProvider value={{awsCredentials, session, authenticated, error, tapSession}}>
                <SessionConsumer>
                  {children}
                </SessionConsumer>
              </SessionProvider>
            );
          }
        }
      </Consumer>
    );
  }
}

export default Session;
