import * as React from 'react';
import {Context, Component, ReactNode} from 'react';
import PropTypes from 'prop-types';
import {Consumer} from './IdentityProvider';

export interface ISessionProps {
    children: ReactNode
}

const SessionContext: Context<any> = React.createContext<any>({});
const {Provider: SessionProvider, Consumer: SessionConsumer} = SessionContext;

class Session extends Component<ISessionProps, any> {
    static propTypes = {
        children: PropTypes.node
    };

    render() {
        return (
            <Consumer>
                {
                    ({state}: any) => {
                        const {session, authenticated} = state;
                        return (
                            <SessionProvider value={{session, authenticated}}>
                                <SessionConsumer>
                                    {() => this.props.children}
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
