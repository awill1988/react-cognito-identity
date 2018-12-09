import * as React from 'react';
import { Component, ClassAttributes, createContext, ReactNode } from 'react';
import * as PropTypes from 'prop-types';
import {CognitoUser, CognitoUserPool} from 'amazon-cognito-identity-js';
import {AuthClass} from 'aws-amplify';
import {AuthOptions} from '@aws-amplify/auth/lib/types';
import {withRouter} from 'react-router';
import {setDebugging, CognitoAuthHandlers, DEFAULT_PROPS} from './Helpers';

let AmplifyInstance: AuthClass;

let amplifyConfig: AuthOptions = {

  // REQUIRED only for Federated Authentication - Amazon Cognito Identity Pool ID
  identityPoolId: '',

  // REQUIRED - Amazon Cognito Region
  region: '',

  mandatorySignIn: false,

  // OPTIONAL - Amazon Cognito Federated Identity Pool Region
  // Required only if it's different from Amazon Cognito Region
  identityPoolRegion: '',

  // OPTIONAL - Amazon Cognito User Pool ID
  userPoolId: '',

  // OPTIONAL - Amazon Cognito Web Client ID (26-char alphanumeric string)
  userPoolWebClientId: '',

  // OPTIONAL - Configuration for cookie storage
  cookieStorage: {
    // REQUIRED - Cookie domain (only required if cookieStorage is provided)
    domain: '.yourdomain.com',
    // OPTIONAL - Cookie path
    path: '/',
    // OPTIONAL - Cookie expiration in days
    expires: 365,
    // OPTIONAL - Cookie secure flag
    secure: true
  },

  // OPTIONAL - Manually set the authentication flow type. Default is 'USER_SRP_AUTH'
  authenticationFlowType: 'USER_PASSWORD_AUTH',

  oauth: {
    awsCognito: {
      domain: '',
      redirectSignIn: '',
      redirectSignOut: '',
      responseType: '',
      scope: [],
    }
  }
};

const Context = createContext<{state:ICognitoIdentityState}>({
  state: {
    cognitoUser: null,
    session: null,
    lastError: null,
    userPool: null,
    challengeParameters: null,
    // tslint:disable-next-line
    answerAuthChallenge: () => {},
    // tslint:disable-next-line
    logout: () => {},
    // tslint:disable-next-line
    login: () => {},
    accessToken: null,
    authenticated: null,
    lastPage: null
  }
});

const {Provider, Consumer} = Context;

class IdentityProvider extends Component<ICognitoIdentityProvider, ICognitoIdentityState> {
  static intervalCheck?: number|null = undefined;

  static propTypes = {
    DEBUG: PropTypes.bool,
    ClientId: PropTypes.string,
    UserPoolId: PropTypes.string,
    FlowType: PropTypes.string,
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
    loginRedirect: PropTypes.string,
    logoutRedirect: PropTypes.string,
    eventCallback: PropTypes.func,
    checkInterval: PropTypes.number,
    unprotectedRoutes: PropTypes.string,
    cookieDomain: PropTypes.string,
    UserPoolRegion: PropTypes.string,
    OAuthConfig: PropTypes.object,
    Username: PropTypes.string
  };

  static defaultProps = DEFAULT_PROPS;

  state = {
    cognitoUser: null,
    session: null,
    lastError: null,
    userPool: null,
    challengeParameters: null,
    // tslint:disable-next-line
    answerAuthChallenge: () => {},
    // tslint:disable-next-line
    logout: () => {},
    // tslint:disable-next-line
    login: () => {},
    accessToken: null,
    authenticated: null,
    lastPage: null
  };

  constructor(props: ICognitoIdentityProvider) {
    super(props);
    const {DEBUG: DebugMode, history} = props;
    setDebugging(DebugMode);
    history.listen(this.onRouteUpdate.bind(this));
  }

  componentDidMount() {
    const {
      UserPoolId,
      ClientId,
      location,
      OAuthConfig,
      UserPoolRegion,
      cookieDomain,
      eventCallback,
      FlowType
    } = this.props;

    const userPool = new CognitoUserPool({
      ClientId: ClientId || '',
      UserPoolId: UserPoolId || '',
    });

    amplifyConfig.authenticationFlowType = FlowType;
    amplifyConfig.userPoolId = UserPoolId;
    amplifyConfig.userPoolWebClientId = ClientId;
    amplifyConfig.region = UserPoolRegion;

    if (!cookieDomain) {
      delete amplifyConfig.cookieStorage;
    } else {
      amplifyConfig.cookieStorage!.domain = cookieDomain;
    }
    if (!OAuthConfig) {
      delete amplifyConfig.oauth;
    } else {
      amplifyConfig.oauth!.awsCognito = OAuthConfig;
    }

    this.setState({
      // eslint-disable-next-line
      login: (params: any) => this.signIn(params),
      // eslint-disable-next-line
      logout: (invalidateAllSessions = false) => this.signOut(invalidateAllSessions),
    }, () => {
      AmplifyInstance = new AuthClass(amplifyConfig);

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
    const {eventCallback} = this.props;
    eventCallback.call(this, null, {message: 'Navigation occured'});
    if (this.shouldEnforceRoute(ev.pathname)) {
      eventCallback.call(this, null, {message: 'Should check session'});
    }
    this.checkAuth({redirect: this.shouldEnforceRoute(ev.pathname)});
  }

  redirectTo(path: string, callback?: (error: null|Error, data: any) => void) {
    const {history, location, eventCallback} = this.props;
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
    const {history, eventCallback} = this.props;
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
    const {cognitoUser} = this.state;
    const {logoutRedirect, eventCallback} = this.props;
    if (cognitoUser) {
      AmplifyInstance.signOut({global: invalidateAllSessions})
        .then(session => {
          eventCallback.call(this, null, session);
          this.setState({
            authenticated: false,
            session: null,
            cognitoUser: null,
          }, () => {
            this.redirectTo(logoutRedirect!);
          });
        })
        .catch(error => {
          eventCallback.call(this, error);
          this.setState({
            authenticated: false,
            session: null,
            cognitoUser: null,
          }, () => {
            this.redirectTo(logoutRedirect!);
          });
        });
    }

  }

  shouldEnforceRoute(location: string) {
    const {eventCallback, unprotectedRoutes, loginRedirect, logoutRedirect} = this.props;
    eventCallback.call(this, null, {message: 'Navigation occured'});
    let shouldEnforceRoute = false;
    if (unprotectedRoutes) {
      const regexp = new RegExp(unprotectedRoutes);
      shouldEnforceRoute = !regexp.test(location)
        && location !== loginRedirect
        && location !== logoutRedirect;
      eventCallback.call(this, null, {
        event: {regexp, path: location, shouldEnforceRoute},
        message: `${location} is ${!shouldEnforceRoute ? 'un' : ''}protected`
      });
      return shouldEnforceRoute;
    }
    return true;
  }

  checkAuth({redirect}: {redirect: boolean} = {redirect: false}) {
    const {cognitoUser} = this.state;
    const {eventCallback, loginRedirect} = this.props;
    if (!cognitoUser) {
      eventCallback.call(this, null, 'Unable to obtain an active session.');
      this.setState({
        authenticated: false
      });
      if (redirect) {
        this.redirectTo(loginRedirect!, () => {
          const {Username} = this.props;
          eventCallback(null, 'Redirection completed');
          if (Username) {
            eventCallback(null, 'Attempting to auto-login with username', Username);
            this.signIn({username: Username});
          }
        });
      }
      return;
    }
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
          if ((!session || !session.isValid()) && redirect) {
            this.redirectTo(loginRedirect!);
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
      })
      .catch(error => {
        eventCallback.call(this, error);
      });
  }

  signIn({username, password}: {username: string, password?: string}) {
    const {eventCallback, FlowType} = this.props;
    AmplifyInstance.signIn(username, password)
      .then(value => {
        if (FlowType === 'CUSTOM_AUTH') {
          const {challengeParam: challengeParameters} = value;
          this.setState({
            cognitoUser: value,
            challengeParameters,
            answerAuthChallenge: ({answer} = {answer: ''}) => {
              const {cognitoUser: user} = this.state;
              if (FlowType === 'CUSTOM_AUTH') {
                AmplifyInstance.sendCustomChallengeAnswer(value, answer)
                  .then((cognitoUser: CognitoUser)  => {
                    eventCallback(null, cognitoUser);
                    this.setState({
                      authenticated: true,
                      session: cognitoUser.getSignInUserSession()
                    })
                  })
                  .catch(error => {
                    eventCallback(error);
                  });
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
