import React, {Component, createContext} from 'react';
import PropTypes from 'prop-types';
import {CognitoUserPool, CognitoUser, AuthenticationDetails} from 'amazon-cognito-identity-js';
import {withRouter} from 'react-router';
import {setDebugging, CognitoAuthHandlers, DEFAULT_PROPS} from './Helpers';

const Context = createContext();
const {Provider, Consumer} = Context;

class IdentityProvider extends Component {
  static intervalCheck = null;

  authHandlers = null;

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
    // eslint-disable-next-line
    unprotectedRoutes: PropTypes.string
  };

  static defaultProps = DEFAULT_PROPS;

  constructor(props) {
    super(props);
    const {DEBUG: DebugMode, history} = props;
    setDebugging(DebugMode);
    this.authHandlers = CognitoAuthHandlers.bind(this, this)();
    history.listen(this.onRouteUpdate.bind(this));
  }

  state = {
    cognitoUser: null,
    // eslint-disable-next-line
    session: null,
    // eslint-disable-next-line
    lastError: null,
    userPool: null,
    // eslint-disable-next-line
    challengeParameters: null,
    // eslint-disable-next-line
    answerAuthChallenge: () => {},
    // eslint-disable-next-line
    logout: () => {},
    // eslint-disable-next-line
    login: () => {},
    // eslint-disable-next-line
    accessToken: this.accessToken,
    // eslint-disable-next-line
    authenticated: null,
    lastPage: null
  };

  componentDidMount() {
    const {UserPoolId, ClientId, location} = this.props;

    const userPool = new CognitoUserPool({
      ClientId: ClientId || '',
      UserPoolId: UserPoolId || '',
    });

    const currentUser = userPool.getCurrentUser();

    this.setState({
      userPool,
      cognitoUser: currentUser,
      // eslint-disable-next-line
      login: (params) => this.signIn(params),
      // eslint-disable-next-line
      logout: (invalidateAllSessions = false) => this.signOut(invalidateAllSessions),
      // eslint-disable-next-line
      answerAuthChallenge: ({answer} = {answer: ''}) => {
        const {cognitoUser: user} = this.state;
        const {FlowType} = this.props;
        if (FlowType === 'CUSTOM_AUTH') {
          user.sendCustomChallengeAnswer(answer, this.authHandlers);
        }
      }
    }, () => {
      this.checkAuth({redirect: this.shouldEnforceRoute(location.pathname)});
    });
  }

  onRouteUpdate(ev) {
    const {eventCallback} = this.props;
    eventCallback.call(this, null, {message: 'Navigation occured'});
    if (this.shouldEnforceRoute(ev.pathname)) {
      eventCallback.call(this, null, {message: 'Should check session'});
    }
    this.checkAuth({redirect: this.shouldEnforceRoute(ev.pathname)});
  }

  redirectTo(path) {
    const {history, location, eventCallback} = this.props;
    if (!history) {
      eventCallback.call(this, new Error('Router not instantiated!'));
      return;
    }
    const lastPage = location.pathname;
    eventCallback.call(this, null, {lastPage, path});
    if (path === lastPage) {
      return;
    }
    this.setState({
      lastPage
    });
    history.push(path);
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
        cognitoUser.globalSignOut((err, data) => {
          eventCallback.call(this, err, data);
        });
      } else {
        cognitoUser.signOut();
      }
    }
    this.redirectTo(logoutRedirect);
  }

  shouldEnforceRoute(location) {
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

  checkAuth({redirect} = {redirect: false}) {
    const {cognitoUser} = this.state;
    const {eventCallback, loginRedirect} = this.props;
    if (!cognitoUser) {
      eventCallback.call(this, null, 'Unable to obtain an active session.');
      this.setState({
        // eslint-disable-next-line
        authenticated: false
      });
      if (redirect) {
        this.redirectTo(loginRedirect);
      }
      return;
    }
    cognitoUser.getSession((err, session) => {
      eventCallback.call(
        this,
        null,
        `Current session is ${!session || !session.isValid() ? 'in' : ''}valid.`
      );
      this.setState({
        // eslint-disable-next-line
        session,
        // eslint-disable-next-line
        authenticated: session && session.isValid()
      }, () => {
        if ((!session || !session.isValid()) && redirect) {
          this.redirectTo(loginRedirect);
        }
        // Start timer to refresh
        if (!IdentityProvider.intervalCheck && session.isValid()) {
          const {checkInterval} = this.props;
          IdentityProvider.intervalCheck = setInterval(
            this.checkAuth.bind(this, [{redirect}]),
            checkInterval * 1000
          );
        }
      });
    });
  }

  signIn({username, password} = {username: null, password: null}) {
    const {cognitoUser} = this.state;

    // Clear currently logged in session
    if (cognitoUser) {
      cognitoUser.signOut();
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

      const cognitoUser = new CognitoUser({
        Username: username,
        Pool: state.userPool
      });

      const authenticationDetails = new AuthenticationDetails({
        Username: username,
        Password: password
      });

      cognitoUser.setAuthenticationFlowType(FlowType);

      if (FlowType === 'USER_PASSWORD_AUTH' || FlowType === 'USER_SRP_AUTH') {
        cognitoUser.authenticateUser(authenticationDetails, this.authHandlers);
      } else {
        cognitoUser.initiateAuth(authenticationDetails, this.authHandlers);
      }

      this.setState({
        // eslint-disable-next-line
        cognitoUser
      });
    });
  }

  clearWatch() {
    if (IdentityProvider.intervalCheck) {
      clearInterval(IdentityProvider.intervalCheck);
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

const AuthenticationProviderWithRouter = withRouter(IdentityProvider);

export {AuthenticationProviderWithRouter as default, Consumer};
