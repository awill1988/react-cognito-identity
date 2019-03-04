export const defaultState = () => ({
  challengeParameters: null,
  awsCredentials: null,
  session: null,
  error: undefined,
  importantDetail: undefined,
  // tslint:disable-next-line
  answerAuthChallenge: undefined,
  // tslint:disable-next-line
  logout: () => {},
  // tslint:disable-next-line
  reset: () => {},
  // tslint:disable-next-line
  login: () => {},
  lastPage: window.location.pathname,
  confirmSignUp: () => {},
  // tslint:disable-next-line
  forgotPassword: () => {},
  // tslint:disable-next-line
  resetPassword: () => {},
  authenticated: null,
  location: null,
});

export const defaultProps = {
  DEBUG: false,
  awsAuthConfig: {
    clientId: '',
    userPoolId: '',
    flowType: '',
  },
  children: null,
  history: undefined,
  location: undefined,
  rememberSession: true,
};


export const AmplifyConfig = () => ({

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
});
