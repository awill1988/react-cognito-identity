import * as React from 'react';
import {Component, createContext} from 'react';
import * as PropTypes from 'prop-types';
import {CognitoUser, CognitoUserSession} from 'amazon-cognito-identity-js';
import {AuthClass} from 'aws-amplify';
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
  };

  static defaultProps = DEFAULT_PROPS;

  state = initialState();

  constructor(props: ICognitoIdentityProvider) {
    super(props);
    const {DEBUG: DebugMode, history} = props;
    setDebugging(DebugMode);
    history.listen(this.onRouteUpdate.bind(this));
  }

  componentDidMount() {
    const {
      awsAuthConfig,
      routingConfig,
      location,
    } = this.props;
    const {username, config} = Configure(awsAuthConfig);
    eventCallback(null, 'Provided default username', username);
    eventCallback(null, `${routingConfig ? 'has' : 'does not have'} routing configuration`);
    clearSession.bind(this)(() => {
      AmplifyInstance = new AuthClass(config);
      AmplifyInstance.currentUserPoolUser()
        .then(user => {
          eventCallback(null, user);
          this.checkAuth({redirect: this.shouldEnforceRoute(location.pathname)});
        })
        .catch(reason => {
          eventCallback(null, reason);
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
      eventCallback(new Error('Router not instantiated!'));
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
              eventCallback(error);
              const {logout, login} = routingConfig || {login: null, logout: null};
              if ((login || logout) && !awsAuthConfig.oauth) {
                this.redirectTo(logout || login || '');
              }
            }
          ]));
      })
      .catch(e => eventCallback(e));
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
    this.getCredentials(cognitoUser, (error: Error|null|undefined, data: any) => {
      eventCallback(error, data);
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
    AmplifyInstance.currentUserPoolUser()
      .then(() => {
        AmplifyInstance.currentSession()
          .then(session => {
            eventCallback.call(
              this,
              null,
              `Current session is ${!session || !session.isValid() ? 'in' : ''}valid.`
            );

            this.setState({
              session,
              authenticated: (session && session.isValid()) as boolean
            }, () => {
              if ((!session || !session.isValid()) && redirect && routingConfig) {
                this.redirectTo(routingConfig.login);
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
            });
          });
      })
      .catch(() => {
        eventCallback( null, 'Unable to obtain an active session.');
        this.setState({
          authenticated: false
        });
        if (routingConfig && redirect) {
          this.redirectTo(routingConfig.login, () => {
            eventCallback(null, 'Redirection completed');
            if (awsAuthConfig.username) {
              eventCallback(null, 'Attempting to auto-login with username', awsAuthConfig.username);
              this.signIn({username: awsAuthConfig.username});
            }
          });
        }
        return;
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
                  .catch(error => eventCallback(error));
              }
            }
          }, () => {
            this.clearWatch();
            eventCallback(null,
              {
                message: 'Received Challenge Parameters',
                challengeParameters
              });
          });
        }
      })
      .catch(error => {
        eventCallback(null, error);
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
