let AUTH_PROVIDER_DEBUG = false;

export const setDebugging = (setting) => AUTH_PROVIDER_DEBUG = setting;

export function DEBUG(...args) {
  if (AUTH_PROVIDER_DEBUG) {
    // eslint-disable-next-line
    console.log('CognitoIdentity', ...args);
  }
}

export const CognitoAuthHandlers = (instance) => ({
  onSuccess(session) {
    instance.setState({
      authenticated: true,
      session,
      challengeParameters: null,
      error: null,
    }, () => {
      instance.props.eventCallback.call(instance, null, session);
      instance.goBack();
      instance.watch();
    });
  },
  onFailure(error) {
    instance.setState({
      error,
      challengeParameters: null,
      authenticated: false,
    }, () => {
      instance.clearWatch();
      instance.props.eventCallback.call(instance, error);
    });
  },
  customChallenge(challengeParameters) {
    instance.setState({
      authenticated: false,
      session: null,
      challengeParameters,
      error: null,
    }, () => {
      instance.clearWatch();
      instance.props.eventCallback.call(instance, null,
        {
          message: 'Received Challenge Parameters',
          challengeParameters
        });
    });
  }
});

export const DEFAULT_PROPS = {
  DEBUG: false,
  ClientId: '',
  UserPoolId: '',
  FlowType: 'USER_SRP_AUTH',
  location: null,
  history: null,
  loginRedirect: null,
  logoutRedirect: null,
  checkInterval: 60,
  unprotectedRoutes: null,
  eventCallback: (error, data) => {
    if (error) {
      console.error('Error', error);
    }
    DEBUG(data);
  }
};
