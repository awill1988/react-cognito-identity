import React, {Component, createContext} from 'react';
import PropTypes from 'prop-types';
import {CognitoUser, CognitoUserSession} from 'amazon-cognito-identity-js';
import {AuthClass} from '@aws-amplify/auth';
import {withRouter} from 'react-router';
import {
  setDebugging,
  DEFAULT_PROPS,
  eventCallback,
  Configure,
  initialState,
  clearSession,
} from './Helpers';

let AmplifyInstance: AuthClass;

const Context = createContext<{state:ICognitoIdentityState}>({state: initialState()});

const {Provider, Consumer} = Context;

class IdentityProvider extends Component<ICognitoIdentityProvider, ICognitoIdentityState> {
  static intervalCheck?: number|null = undefined;

  static propTypes = {
    DEBUG: PropTypes.bool,
    awsAuthConfig: PropTypes.any,
    routingConfig: PropTypes.any,
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    eventCallback: PropTypes.func,
    checkInterval: PropTypes.number,
    rememberSession: PropTypes.bool,
  };

  static defaultProps = DEFAULT_PROPS;

  state = initialState();

  constructor(props: ICognitoIdentityProvider) {
    super(props);
    const {DEBUG: DebugMode, rememberSession, awsAuthConfig} = props;
    if (rememberSession && awsAuthConfig.username) {
      sessionStorage.setItem('cognito-username', awsAuthConfig.username);
    }
    if (!awsAuthConfig.username && rememberSession) {
      awsAuthConfig.username = sessionStorage.getItem('cognito-username') || undefined;
    }
    setDebugging(DebugMode);
  }

  componentDidMount() {
    const {
      awsAuthConfig,
      routingConfig,
      location,
      history,
    } = this.props;
    history.listen(this.onRouteUpdate.bind(this));
    const {username, config} = Configure(awsAuthConfig);
    eventCallback.call(this,null, 'Provided default username', username);
    eventCallback.call(this, null, `${routingConfig ? 'has' : 'does not have'} routing configuration`);
    clearSession.bind(this)(() => {
      AmplifyInstance = new AuthClass(config);
      AmplifyInstance.currentUserPoolUser()
        .then((user: CognitoUser) => {
          if (user.getUsername() !== awsAuthConfig.username) {
            AmplifyInstance.signOut({global: false}).then(
              () => this.checkAuth({redirect: this.shouldEnforceRoute(location.pathname)})
            ).catch((error) => eventCallback.call(this, error));
          } else {
            eventCallback.call(this,undefined, user);
            this.checkAuth({redirect: this.shouldEnforceRoute(location.pathname)});
          }
        })
        .catch(reason => {
          eventCallback.call(this,undefined, reason);
          this.checkAuth({redirect: this.shouldEnforceRoute(location.pathname)});
        });
    });
  }

  onRouteUpdate(ev: {pathname: string}) {
    eventCallback.call(this, null, {message: 'Navigation occured'});
    if (this.shouldEnforceRoute(ev.pathname)) {
      eventCallback.call(this, null, {message: 'Should check session'});
    }
    this.checkAuth({redirect: this.shouldEnforceRoute(ev.pathname)});
  }

  redirectTo(path: string, callback?: (error: null|Error, data: any) => void) {
    const {history, location} = this.props;
    if (!history) {
      eventCallback.call(this, new Error('Router not instantiated!'), null);
      if (callback) {
        callback(null, null);
      }
      return;
    }
    const lastPage = location.pathname;
    eventCallback.call(this, null, {lastPage, path});
    if (path === lastPage) {
      if (callback) {
        callback(null, null);
      }
      return;
    }
    this.setState({
      lastPage
    }, () => {
      history.push(path);
      if (callback) {
        callback(null, null);
      }
    });
  }

  goBack() {
    const {history} = this.props;
    const {lastPage} = this.state;
    if (!lastPage) {
      return;
    }
    if (!history) {
      eventCallback.call(this, new Error('Router not instantiated!'));
      return;
    }
    history.goBack();
  }

  signOut(invalidateAllSessions = false) {
    const {routingConfig, awsAuthConfig} = this.props;
    AmplifyInstance.currentUserPoolUser()
      .then(() => {
        AmplifyInstance.signOut({global: invalidateAllSessions})
          .then(() => clearSession.apply(this, [() => {
              const {logout, login} = routingConfig || {login: null, logout: null};
              if ((login || logout) && !awsAuthConfig.oauth) {
                this.redirectTo(logout || login || '');
              }
            }])
          )
          .catch(error => clearSession.apply(this, [
            () => {
              eventCallback.call(this, error);
              const {logout, login} = routingConfig || {login: null, logout: null};
              if ((login || logout) && !awsAuthConfig.oauth) {
                this.redirectTo(logout || login || '');
              }
            }
          ]));
      })
      .catch(e => eventCallback.call(this, e));
  }

  shouldEnforceRoute(location: string) {
    const {routingConfig} = this.props;
    if (!routingConfig) {
      return false;
    }
    eventCallback.call(this, null, {message: 'Navigation occured'});
    let shouldEnforceRoute = false;
    if (routingConfig.ignorePathRegex) {
      const regexp = new RegExp(routingConfig.ignorePathRegex);
      shouldEnforceRoute = !regexp.test(location)
        && location !== routingConfig.login
        && location !== routingConfig.logout;
      eventCallback.call(this, null, {
        event: {regexp, path: location, shouldEnforceRoute},
        message: `${location} is ${!shouldEnforceRoute ? 'un' : ''}protected`
      });
      return shouldEnforceRoute;
    }
    return true;
  }

  successHandler(cognitoUser: CognitoUser) {
    const {awsAuthConfig} = this.props;
    if (awsAuthConfig.identityPoolId) {
      this.getCredentials(cognitoUser, (error: Error|null|undefined, data: any) => {
        eventCallback.call(this, error, data);
        if (!error) {
          this.setState({
            authenticated: true,
            session: data.session,
            awsCredentials: data.credentials,
          }, () => {
            const {routingConfig} = this.props;
            if (routingConfig && routingConfig.loginSuccess) {
              this.redirectTo(routingConfig.loginSuccess);
            } else {
              this.goBack();
            }
          });
        }
      });
    } else {
      AmplifyInstance.currentSession()
        .then((session: CognitoUserSession) => {
          eventCallback.call(this, undefined, session);
          this.setState({
            session,
            authenticated: (session && session.isValid()) as boolean
          });
        })
        .catch((error) => {
          eventCallback.call(this, undefined, error.message);
        });
    }
  }

  getCredentials(user: CognitoUser, callback: any = () => {}) {
    const session = user.getSignInUserSession();
    if (!session) {
      return callback(new Error('No user'));
    }
    AmplifyInstance.currentUserCredentials()
      .then((credentials) => {
        callback(undefined, {credentials, session});
      })
      .catch((e) => {
        callback(e);
      });
  }

  checkAuth({redirect}: {redirect: boolean} = {redirect: false}) {
    const {routingConfig, awsAuthConfig} = this.props;

    let username = awsAuthConfig.username;

    const redirectAndSignIn = (Username?: string|null) => {
      eventCallback.call(this, undefined, `Attempting sign-in for ${Username}`);
      if (routingConfig && redirect) {
        this.redirectTo(routingConfig.login, () => {
          eventCallback.call(this,null, 'Redirection completed');
          if (!Username) {
            return;
          }
          this.signIn({username: Username});
        });
      } else {
        if (Username) {
          if (!Username) {
            return;
          }
          this.signIn({username: Username});
        }
      }
    };

    const success = (session: CognitoUserSession) => {
      eventCallback.call(this, undefined, session);
      if ((!session || !session.isValid()) && redirect && routingConfig) {
        redirectAndSignIn(username);
      }
      // Start timer to refresh
      if (!IdentityProvider.intervalCheck && session!.isValid()) {
        const {checkInterval} = this.props;
        const timer = setInterval(
          this.checkAuth.bind(this, {redirect}),
          checkInterval * 1000
        );
        IdentityProvider.intervalCheck = (timer as unknown) as number;
      }
    };

    eventCallback.call(this, undefined, 'Attempting to obtain user from pool config');
    AmplifyInstance.currentUserPoolUser()
      .then((user: CognitoUser) => {
        username = user.getUsername() || username;
        if (awsAuthConfig.identityPoolId) {
          this.getCredentials(user, (error: Error|null|undefined, data: any) => {
            if (!error) {
              const {session, credentials} = data;
              this.setState({
                session,
                awsCredentials: credentials,
                authenticated: (session && session.isValid()) as boolean
              }, success.bind(this, session));
            } else {
              this.setState({
                session: null,
                authenticated: false,
              });
            }
          });
        } else {
          AmplifyInstance.currentSession()
            .then((session: CognitoUserSession) => {
              eventCallback.call(this, undefined, session);
              if ((!session || !session.isValid()) && redirect && routingConfig) {
                redirectAndSignIn(username);
              }
              this.setState({
                session,
                authenticated: (session && session.isValid()) as boolean
              }, success.bind(this, session));
            })
            .catch((error) => {
              eventCallback.call(this, undefined, error.message);
            });
        }
      })
      .catch((error) => {
        eventCallback.call(this, undefined, error.message);
        this.setState({
          authenticated: false
        }, () => redirectAndSignIn(username));
      });
  }

  signIn({username, password}: {username: string, password?: string}) {
    const {awsAuthConfig} = this.props;
    AmplifyInstance.signIn(username, password)
      .then(value => {
        if (awsAuthConfig.flowType === 'CUSTOM_AUTH') {
          const {challengeParam: challengeParameters} = value;
          this.setState({
            challengeParameters,
            answerAuthChallenge: ({answer} = {answer: ''}) => {
              if (awsAuthConfig.flowType === 'CUSTOM_AUTH') {
                AmplifyInstance.sendCustomChallengeAnswer(value, answer)
                  .then(this.successHandler.bind(this))
                  .catch(error => eventCallback.call(this, error));
              }

            }
          }, () => {
            this.clearWatch();
            eventCallback.call(this, null,
              {
                message: 'Received Challenge Parameters',
                challengeParameters
              });
          });
        }
      })
      .catch(error => {
        eventCallback.call(this,null, error);
      });
  }

  clearWatch() {
    if (IdentityProvider.intervalCheck) {
      clearInterval(IdentityProvider.intervalCheck as number);
    }
  }

  watch() {
    this.clearWatch();
    const {checkInterval} = this.props;
    IdentityProvider.intervalCheck = setInterval(
      this.checkAuth.bind(this),
      checkInterval * 1000
    );
  }

  render() {
    const {state, props} = this;
    return (
      <Provider value={{state}}>
        {props.children}
      </Provider>
    );
  }
}

const AuthenticationProviderWithRouter = withRouter(IdentityProvider as any);

export {AuthenticationProviderWithRouter as default, Consumer};
