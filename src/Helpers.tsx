import {IAuthenticationCallback} from 'amazon-cognito-identity-js';
let AUTH_PROVIDER_DEBUG = false;

export const setDebugging = (setting: boolean) => AUTH_PROVIDER_DEBUG = setting;

export function DEBUG(...args: any) {
  if (AUTH_PROVIDER_DEBUG) {
    console.log('CognitoIdentity', ...args);
  }
}

export const CognitoAuthHandlers = (instance: any): IAuthenticationCallback => ({
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
      lastError: error,
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

export const DEFAULT_PROPS: ICognitoIdentityProvider = {
  DEBUG: false,
  ClientId: '',
  UserPoolId: '',
  FlowType: 'USER_SRP_AUTH',
  location: null,
  history: null,
  loginRedirect: '/',
  logoutRedirect: '/',
  checkInterval: 60,
  unprotectedRoutes: null,
  eventCallback: (error?: null|Error, data?: any) => {
    if (error) {
      console.error('Error', error);
    }
    DEBUG(data);
  },
  children: null,
  OAuthConfig: null
};