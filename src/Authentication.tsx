import * as React from 'react';
import * as PropTypes from 'prop-types';
import {Consumer} from './IdentityProvider';
import {ReactNode, Component} from "react";

const AuthenticationContext = React.createContext({});
const {Provider: AuthenticationProvider, Consumer: AuthenticationConsumer} = AuthenticationContext;

export interface IAuthenticationProps {
    children: ReactNode
}

class Authentication extends Component<IAuthenticationProps> {
    static propTypes = {
        children: PropTypes.any
    };

    render() {
        return (
            <Consumer>
                {
                    ({state}: any) => {
                        const {login, logout, challengeParameters, answerAuthChallenge, authenticated} = state;
                        return (
                            <AuthenticationProvider value={{login, logout, challengeParameters, answerAuthChallenge, authenticated}}>
                                <AuthenticationConsumer>
                                    {() => this.props.children}
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
