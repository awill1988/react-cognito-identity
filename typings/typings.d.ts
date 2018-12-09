// import * as React from "react" />
// import * as Amplify from "aws-amplify";

interface ICognitoIdentityProvider {
  DEBUG: boolean;
  ClientId: string;
  UserPoolId: string;
  FlowType: string;
  location: object|any;
  UserPoolRegion?: string;
  cookieDomain?: string;
  history: any|null;
  loginRedirect?: string;
  logoutRedirect?: string;
  eventCallback: (error: Error|null, ...args: any)=>void;
  checkInterval: number;
  OAuthConfig?: any;
  unprotectedRoutes: string|null;
  children: React.ReactNode;
  Username?: string;
}

interface ICognitoIdentityState {
  cognitoUser: AWSCognito.CognitoUser|null,
  session?: null|AWSCognito.CognitoUserSession,
  lastError: null|string,
  userPool: null|AWSCognito.CognitoUserPool,
  challengeParameters: null|any,
  answerAuthChallenge: ({answer}: any) => void,
  logout: () => void,
  login: (params: any) => void,
  accessToken: null,
  authenticated: null|boolean,
  lastPage: null,
}

interface IAuthenticationState {
  login: any,
  logout: any,
  challengeParameters: any,
  answerAuthChallenge: any,
  authenticated: any
}