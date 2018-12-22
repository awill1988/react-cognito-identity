let AUTH_PROVIDER_DEBUG = false;

export const setDebugging = (setting: boolean) => AUTH_PROVIDER_DEBUG = setting;

export function DEBUG(...args: any) {
  if (AUTH_PROVIDER_DEBUG) {
    // tslint:disable-next-line
    console.log('CognitoIdentity', ...args);
  }
}

export function eventCallback(error?: null|Error, ...args: any) {
  if (error) {
    console.error('Error', error);
  }
  DEBUG(...args);
}

export const DEFAULT_PROPS: ICognitoIdentityProvider = {
  DEBUG: false,
  awsAuthConfig: {
    clientId: '',
    userPoolId: '',
    flowType: '',
  },
  children: null,
  checkInterval: 1000 * 1800,
  history: undefined,
  location: undefined
};

export const DEFAULT_CONFIG = (): any => ({

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

export const Configure = (awsAuthConfig: IAWSAuthConfig): any => {
  const config = DEFAULT_CONFIG();
  let providedUsername = undefined;
  if (awsAuthConfig) {
    const {
      identityPoolId,
      region,
      clientId,
      cookieDomain,
      username,
      userPoolId,
      oauth,
      flowType
    } = awsAuthConfig!;

    providedUsername = username;
    config.authenticationFlowType = flowType;
    config.userPoolId = userPoolId;
    config.userPoolWebClientId = clientId;
    config.region = region;

    if (!cookieDomain) {
      delete config.cookieStorage;
    } else {
      config.cookieStorage!.domain = cookieDomain;
    }
    if (!oauth) {
      delete config.oauth;
    } else {
      config.oauth!.awsCognito = oauth;
    }

    config.identityPoolId = identityPoolId || '';
  }
  return {config, username: providedUsername};
};

export const initialState = (): ICognitoIdentityState => ({
  challengeParameters: null,
  awsCredentials: null,
  session: null,
  error: null,
  // tslint:disable-next-line
  answerAuthChallenge: () => {},
  // tslint:disable-next-line
  logout: () => {},
  // tslint:disable-next-line
  login: () => {},
  authenticated: null
});

export function clearSession(callback?: any) {
  // @ts-ignore
  this.setState({
    ...initialState(),
    // @ts-ignore
    login: (params: any) => this.signIn(params),
    // @ts-ignore
    logout: (invalidateAllSessions = false) => this.signOut(invalidateAllSessions),
  }, callback);
}