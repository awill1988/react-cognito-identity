import React, {Component, createContext} from 'react';
import PropTypes from 'prop-types';
import {Consumer} from './IdentityProvider';

const SessionContext = createContext();
const {Provider: SessionProvider, Consumer: SessionConsumer} = SessionContext;

class Session extends Component {
  render() {
    const {children} = this.props;
    return (
      <Consumer>
        {
          ({state}) => {
            const {session, authenticated} = state;
            return (
              <SessionProvider value={{session, authenticated}}>
                <SessionConsumer value={{state}}>
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

Session.propTypes = {
  children: PropTypes.any
};

export default Session;
