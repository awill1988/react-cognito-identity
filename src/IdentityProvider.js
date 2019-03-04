/* eslint-disable react/no-unused-state */
import React, {Component, createContext} from 'react';
import PropTypes from 'prop-types';
import {AuthClass} from '@aws-amplify/auth';
import {
  configure,
  resetState,
  shouldEnforceRoute,
} from './helpers/functions';
import {defaultState, defaultProps} from './helpers/defaults';
import {emitEvent, setDebugging} from './helpers/debug';

let Auth;

const Context = createContext({state: defaultState()});

const {Provider, Consumer} = Context;

class IdentityProvider extends Component {
  static propTypes = {
    DEBUG: PropTypes.bool,
    awsAuthConfig: PropTypes.any,
    routingConfig: PropTypes.any,
    history: PropTypes.object.isRequired,
    children: PropTypes.any,
  };

  static defaultProps = defaultProps;

  state = defaultState();

  unlisten = null;

  constructor(props) {
    super(props);
    const {DEBUG: DebugMode} = props;
    setDebugging(DebugMode);
    this.resetState = resetState.bind(this);
    this.maybeForceLoginPage = this.maybeForceLoginPage.bind(this);
    this.onAuthenticationResponse = this.onAuthenticationResponse.bind(this);
    this.challengeResponseCallback = this.challengeResponseCallback.bind(this);
    this.signIn = this.signIn.bind(this);
    this.navigateOnSuccess = this.navigateOnSuccess.bind(this);
    this.navigateToLogin = this.navigateToLogin.bind(this);
    this.signOut = this.signOut.bind(this);
    this.onRouteUpdate = this.onRouteUpdate.bind(this);
    this.obtainAWSCredentials = this.obtainAWSCredentials.bind(this);
    this.maybeRestoreSession = this.maybeRestoreSession.bind(this);
    this.forgotPassword = this.forgotPassword.bind(this);
    this.resetPassword = this.resetPassword.bind(this);
    this.signUp = this.signUp.bind(this);
    this.confirmSignUp = this.confirmSignUp.bind(this);
    this.reset = this.reset.bind(this);
  }

  componentDidMount() {
    const {
      awsAuthConfig,
      routingConfig,
      history,
    } = this.props;
    const location = window.location;
    this.unlisten = history.listen(this.onRouteUpdate.bind(this));
    const {username, config} = configure(awsAuthConfig);
    if (username) {
      emitEvent.call(this, null, 'Provided default username', username);
    }
    emitEvent.call(this, null, `${routingConfig ? 'has' : 'does not have'} routing configuration`);

    this.reset(() => {
      if (process.env.NODE_ENV !== 'offline') {
        Auth = new AuthClass(config);
        Auth.currentAuthenticatedUser()
          .then((user) => {
            const shouldDestroyPreviousSession = username !== null
              && username !== undefined
              && user.getUsername() !== username;
            if (shouldDestroyPreviousSession) {
              emitEvent.call(this, null, 'Removing previous session for', user.getUsername());
              Auth.signOut({global: false})
                .then(() => this.maybeRestoreSession({
                  redirect: shouldEnforceRoute(location.pathname, routingConfig),
                }))
                .catch((error) => emitEvent.call(this, error));
            } else {
              emitEvent.call(this, undefined, 'restoring session');
              this.maybeRestoreSession({redirect: shouldEnforceRoute(location.pathname, routingConfig)});
            }
          })
          .catch(() => {
            this.maybeRestoreSession({redirect: shouldEnforceRoute(location.pathname, routingConfig)});
          });
      }
    });
  }

  componentWillUnmount() {
    if (this.unlisten) {
      this.unlisten();
    }
  }

  challengeResponseCallback = (user) => ({answer, newPassword = null}) => {
    // Responding to custom auth challenges
    if (user.authenticationFlowType === 'CUSTOM_AUTH') {
      Auth.sendCustomChallengeAnswer(user, answer)
        .then((success) => {
          emitEvent.call(this, null, 'Succeeded', success);
          return this.onAuthenticationResponse(user);
        })
        .catch(error => emitEvent.call(this, error));
    } else if (user.challengeName === 'NEW_PASSWORD_REQUIRED') {
      // If user needs to set a new password
      emitEvent.call(this, null, 'Submitting new password...');
      Auth.completeNewPassword(
        user, // the Cognito User Object
        newPassword, // the new password
        {}
      )
        .then((success) => {
          emitEvent.call(this, null, 'Succeeded', success);
          return this.onAuthenticationResponse(user);
        })
        .catch((error) => emitEvent.call(this, error));
    }
  };

  reset = (callback = () => {}) => this.resetState(callback);

  forgotPassword = ({username}) => {
    emitEvent(null, 'Initiating forgot password for', username);
    Auth.forgotPassword(username)
      .then(importantDetail => this.setState({importantDetail, authenticated: false}))
      .catch(error => emitEvent.call(this, error));
  };

  resetPassword = ({username, newPassword, code}) => {
    Auth.forgotPasswordSubmit(username, code, newPassword)
      .then(importantDetail => this.setState({importantDetail, authenticated: false}))
      .catch(error => emitEvent.call(this, error));
  };

  onAuthenticationResponse = (cognitoUser) => {
    const {awsAuthConfig} = this.props;
    const {challengeParam: challengeParameters, signInUserSession: session} = cognitoUser;
    this.setState({
      authenticated: session !== undefined && session !== null,
      session,
      challengeParameters,
      answerAuthChallenge: this.challengeResponseCallback(cognitoUser),
    });
    if (challengeParameters) {
      emitEvent.call(this, null, 'Received Auth Challenge');
    }

    // For identity pool and direct AwS Resource access
    if (session && awsAuthConfig.identityPoolId) {
      this.obtainAWSCredentials(cognitoUser, (error, data) => {
        emitEvent.call(this, error, data);
        if (!error) {
          this.setState({
            authenticated: true,
            session: data.session,
            awsCredentials: data.credentials,
          });
        }
      });
    }

    if (session) {
      const {routingConfig} = this.props;
      if (routingConfig && routingConfig.loginSuccess) {
        this.navigateToLogin(routingConfig.loginSuccess);
      } else {
        this.navigateOnSuccess();
      }
    }
  };

  onRouteUpdate = (ev) => {
    const {routingConfig} = this.props;
    const {lastPage} = this.state;
    if (lastPage === ev.pathname) {
      return;
    }
    this.setState({lastPage: ev.pathname}, () => {
      const {session} = this.state;
      emitEvent.call(this, null, ev);
      if (shouldEnforceRoute(ev.pathname, routingConfig) && !session) {
        emitEvent.call(this, null, {message: 'Should check session'});
        this.maybeRestoreSession({redirect: shouldEnforceRoute(ev.pathname, routingConfig)});
      }
    });
  };

  navigateToLogin = (path, callback) => {
    const {history} = this.props;
    let {lastPage} = this.state;
    if (!lastPage) {
      lastPage = window.location.pathname;
    }
    if (!history) {
      emitEvent.call(this, new Error('Router not instantiated!'), null);
      if (callback) {
        callback(null, null);
      }
      return;
    }
    emitEvent.call(this, null, {lastPage, path});
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
  };

  navigateOnSuccess = () => {
    const {history} = this.props;
    const {lastPage} = this.state;
    if (!lastPage) {
      return;
    }
    if (!history) {
      emitEvent.call(this, new Error('Router not instantiated!'));
      return;
    }
    history.goBack();
  };

  obtainAWSCredentials = (user, callback = () => {}) => {
    const session = user.getSignInUserSession();
    if (!session) {
      return callback(new Error('No user'));
    }
    return Auth.currentUserCredentials()
      .then((credentials) => callback(undefined, {credentials, session}))
      .catch(callback);
  };

  maybeForceLoginPage = (redirect, Username) => {
    const {routingConfig} = this.props;
    const location = window.location;
    if (Username) {
      emitEvent.call(this, undefined, `Attempting sign-in for ${Username}`);
    }
    if (shouldEnforceRoute(location.pathname, routingConfig)) {
      this.navigateToLogin(routingConfig.login, () => {
        emitEvent.call(this, null, 'Redirection completed');
        if (!Username) {
          this.setState({
            error: 'No User',
          });
          return;
        }
        this.signIn({username: Username});
      });
    } else if (Username) {
        this.signIn({username: Username});
      } else {
      this.setState({
        error: 'No User',
      });
    }
  };

  maybeRestoreSession = ({redirect, force}) => {
    return new Promise(resolve => {
      const {awsAuthConfig} = this.props;
      let username = awsAuthConfig.username;
      Auth.currentAuthenticatedUser()
        .then((user) => {
          username = user.getUsername() || username;
          emitEvent.call(this, undefined, username);
          if (awsAuthConfig.identityPoolId) {
            this.obtainAWSCredentials(user, (error, data) => {
              if (!error) {
                const {session, credentials} = data;
                if (session && session.isValid()) {
                  this.setState({
                    session,
                    awsCredentials: credentials,
                    tapSession: () => this.maybeRestoreSession({redirect, force: true}),
                    authenticated: true,
                  }, () => {
                    resolve(session);
                  });
                } else {
                  this.setState({
                    session: null,
                    authenticated: false,
                  }, () => {
                    resolve(undefined);
                    this.maybeForceLoginPage(redirect || false, username);
                  });
                }
              } else {
                emitEvent.call(this, undefined, error.message);
                this.setState({
                  session: null,
                  authenticated: false,
                }, () => {
                  resolve(undefined);
                  this.maybeForceLoginPage(redirect || false, username);
                });
              }
            });
          } else {
            Auth.currentSession()
              .then((session) => {
                if ((!session || !session.isValid())) {
                  this.setState({
                    session: null,
                    authenticated: false,
                  }, () => {
                    resolve(undefined);
                    this.maybeForceLoginPage(redirect || false, username);
                  });
                } else if (force) {
                  user.refreshSession(session.refreshToken, (error, result) => {
                    if (error) {
                      emitEvent.call(this, undefined, error.message);
                      this.setState({
                        authenticated: false,
                      }, () => {
                        resolve(undefined);
                        this.maybeForceLoginPage(redirect, username);
                      });
                    } else {
                      emitEvent.call(this, undefined, 'current session', session.isValid());
                      this.setState({
                        session: result,
                        authenticated: true,
                        tapSession: () => this.maybeRestoreSession({redirect, force: true}),
                      }, () => {
                        resolve(result);
                      });
                    }
                  });
                } else {
                    emitEvent.call(this, undefined, 'current session', session.isValid());
                    this.setState({
                      session,
                      authenticated: true,
                      tapSession: () => this.maybeRestoreSession({redirect, force: true}),
                    }, () => {
                      resolve(session);
                    });
                  }
                })
              .catch((error) => {
                emitEvent.call(this, undefined, error.message);
                this.setState({
                  authenticated: false,
                }, () => {
                  resolve(undefined);
                  this.maybeForceLoginPage(redirect, username);
                });
              });
          }
        })
        .catch((error) => {
          emitEvent.call(this, undefined, error.message);
          this.setState({
            authenticated: false,
          }, () => {
            resolve(undefined);
            this.maybeForceLoginPage(redirect, username);
          });
        });
    });
  };

  signIn = ({username, password}) => {
    this.setState({
      error: null,
    }, () => {
      Auth.signIn(username, password)
        .then(this.onAuthenticationResponse)
        .catch(error => emitEvent.call(this, error));
    });
  };

  confirmSignUp = ({username, code}) => {
    Auth.confirmSignUp(username, code)
      .then(() => {
        this.setState({error: null});
      })
      .catch((error) => this.setState({error}));
  };

  signUp = ({attributes, password, username, validationData}) => {
    const {routingConfig} = this.props;
    const location = window.location;
    Auth.signUp({attributes, password, username, validationData})
      .then(({user, userConfirmed, userSub}) => { // eslint-disable-line
        if (user && userConfirmed) {
          this.maybeRestoreSession({
            redirect: shouldEnforceRoute(location.pathname, routingConfig),
          });
        } else {
          this.setState({
            error: null,
            newUser: {user, userConfirmed, userSub}
          });
        }
      })
      .catch((error) => this.setState({error}));
  };

  signOut = (invalidateAllSessions = false) => {
    const {routingConfig, awsAuthConfig} = this.props;
    const location = window.location;
    if (this.unlisten) {
      this.unlisten();
    }
    Auth.signOut({global: invalidateAllSessions})
      .then(() => this.reset(() => {
          const {logout, login} = routingConfig || {login: null, logout: null};
          if ((login || logout) && !awsAuthConfig.oauth) {
            if (shouldEnforceRoute(location.pathname, routingConfig)) {
              this.navigateToLogin(logout || login || '');
            }
          }
        })
      )
      .catch(error => this.reset(() => {
        emitEvent.call(this, error);
        const {logout, login} = routingConfig || {login: null, logout: null};
        if ((login || logout) && !awsAuthConfig.oauth) {
          this.navigateToLogin(logout || login || '');
        }
      }));
  };

  resetState;

  render() {
    const {children} = this.props;
    const {state} = this;
    return (
      <Provider value={{state}}>
        {children}
      </Provider>
    );
  }
}

export {IdentityProvider as default, Consumer};
/* eslint-enable react/no-unused-state */
