import * as React from 'react';
import { Component, ClassAttributes, createContext, ReactNode } from 'react';
import * as PropTypes from 'prop-types';
import * as AWSCognito from 'amazon-cognito-identity-js';
import {AuthClass as Auth} from 'aws-amplify';
import {AuthOptions} from '@aws-amplify/auth/lib/types';
import {withRouter} from 'react-router';
import {setDebugging, CognitoAuthHandlers, DEFAULT_PROPS} from './Helpers';

let AmplifyInstance;

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
    answerAuthChallenge: () => {},
    logout: () => {},
    login: () => {},
    accessToken: null,
    authenticated: null,
    lastPage: null
  }
});

const {Provider, Consumer} = Context;

class IdentityProvider extends Component<ICognitoIdentityProvider, ICognitoIdentityState> {
  static intervalCheck?: number|null = undefined;

  authHandlers: null|AWSCognito.IAuthenticationCallback = null;

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
    OAuthConfig: PropTypes.object
  };

  static defaultProps = DEFAULT_PROPS;

  constructor(props: ICognitoIdentityProvider) {
    super(props);
    const {DEBUG: DebugMode, history} = props;
    setDebugging(DebugMode);
    this.authHandlers = CognitoAuthHandlers.bind(this, this)();
    history.listen(this.onRouteUpdate.bind(this));
  }

  state = {
    cognitoUser: null,
    session: null,
    lastError: null,
    userPool: null,
    challengeParameters: null,
    answerAuthChallenge: () => {},
    logout: () => {},
    login: () => {},
    accessToken: null,
    authenticated: null,
    lastPage: null
  };

  componentDidMount() {
    const {
      UserPoolId,
      ClientId,
      location,
      OAuthConfig,
      UserPoolRegion,
      cookieDomain,
      FlowType
    } = this.props;

    const userPool = new AWSCognito.CognitoUserPool({
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

    AmplifyInstance = new Auth(amplifyConfig);



    try {
      let currentUser = AmplifyInstance.currentUserPoolUser();
    } catch (error) {
      console.log('No session');
    }

    this.setState({
      userPool,
      cognitoUser: null,
      // eslint-disable-next-line
      login: (params: any) => this.signIn(params),
      // eslint-disable-next-line
      logout: (invalidateAllSessions = false) => this.signOut(invalidateAllSessions),
      // eslint-disable-next-line
      answerAuthChallenge: ({answer} = {answer: ''}) => {
        const {cognitoUser: user} = this.state;
        const {FlowType} = this.props;
        if (FlowType === 'CUSTOM_AUTH') {
          (user! as AWSCognito.CognitoUser).sendCustomChallengeAnswer(answer, this.authHandlers!);
        }
      }
    }, () => {
      this.checkAuth({redirect: this.shouldEnforceRoute(location.pathname)});
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

  redirectTo(path: string) {
    const {history, location, eventCallback} = this.props;
    if (!history) {
      eventCallback.call(this, new Error('Router not instantiated!'), null);
      return;
    }
    const lastPage = location.pathname;
    console.log(lastPage, path);
    eventCallback.call(this, null, {lastPage, path});
    if (path === lastPage) {
      return;
    }
    this.setState({
      lastPage
    }, () => {
      history.push(path);
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
      if (invalidateAllSessions) {
        (cognitoUser as AWSCognito.CognitoUser).globalSignOut({
          onSuccess(session) {
            eventCallback.call(this, null, session);
          },
          onFailure(error) {
            eventCallback.call(this, error, null);
          }
        });
      } else {
        (cognitoUser as AWSCognito.CognitoUser).signOut();
      }
    }
    this.setState({
      authenticated: false,
      session: null,
    }, () => {
      this.redirectTo(logoutRedirect!);
    });
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
        this.redirectTo(loginRedirect!);
      }
      return;
    }
    (cognitoUser as AWSCognito.CognitoUser).getSession(
      (err?: Error, session?: null|AWSCognito.CognitoUserSession) => {
        eventCallback.call(
          this,
          err,
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
      });
  }

  signIn({username, password} = {username: null, password: null}) {
    const {cognitoUser} = this.state;

    // Clear currently logged in session
    if (cognitoUser !== null) {
      (cognitoUser as AWSCognito.CognitoUser).signOut();
    }

    this.setState({
      // eslint-disable-next-line
      session: null,
      // eslint-disable-next-line
      authenticated: false,
      cognitoUser: null,
    }, () => {
      const {state} = this;
      const {FlowType} = this.props;

      const cognitoUser = new AWSCognito.CognitoUser({
        Username: username!,
        Pool: state.userPool!
      });

      const authenticationDetails = new AWSCognito.AuthenticationDetails({
        Username: username!,
        Password: password!
      });

      cognitoUser.setAuthenticationFlowType(FlowType);

      if (FlowType === 'USER_PASSWORD_AUTH' || FlowType === 'USER_SRP_AUTH') {
        cognitoUser.authenticateUser(authenticationDetails, this.authHandlers!);
      } else {
        cognitoUser.initiateAuth(authenticationDetails, this.authHandlers!);
      }

      this.setState({
        // eslint-disable-next-line
        cognitoUser
      });
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
