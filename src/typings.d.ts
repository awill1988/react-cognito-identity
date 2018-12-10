// import * as React from "react" />
// import * as Amplify from "aws-amplify";

interface IAWSAuthConfig {
  username?: string;
  identityPoolId?: string;
  region?: string;
  identityRegion?: string;
  clientId: string;
  userPoolId: string;
  flowType: string;
  cookieDomain?: string;
  storage?: any;
  oauth?: any;
}

interface IRedirectConfig {
  shouldRedirect: boolean;
  login: string;
  loginSuccess?: string;
  logout?: string;
  ignorePathRegex: string;
}

interface ICognitoIdentityProvider {
  DEBUG: boolean;
  awsAuthConfig: IAWSAuthConfig;
  routingConfig?: IRedirectConfig;
  checkInterval: number;
  history: any;
  location: any;
  children: React.ReactNode;
}

interface ICognitoIdentityState {
  session: null|AWSCognito.CognitoUserSession,
  error: null|string,
  challengeParameters: any,
  answerAuthChallenge: ({answer}: any) => void,
  logout: () => void,
  login: (params: any) => void,
  authenticated: boolean|null,
  awsCredentials?: any,
  lastPage?: any
}

interface IAuthenticationState {
  login: any,
  logout: any,
  challengeParameters: any,
  answerAuthChallenge: any,
  authenticated: any
}