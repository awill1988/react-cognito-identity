import {emitEvent} from './debug';
import {AmplifyConfig, defaultState} from './defaults';

export const configure = (awsAuthConfig) => {
  const config = AmplifyConfig();
  let providedUsername;
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
    } = awsAuthConfig;

    providedUsername = username;
    config.authenticationFlowType = flowType;
    config.userPoolId = userPoolId;
    config.userPoolWebClientId = clientId;
    config.region = region;

    if (!cookieDomain) {
      delete config.cookieStorage;
    } else {
      config.cookieStorage.domain = cookieDomain;
    }
    if (!oauth) {
      delete config.oauth;
    } else {
      config.oauth.awsCognito = oauth;
    }

    config.identityPoolId = identityPoolId || '';
  }
  return {config, username: providedUsername};
};

export function resetState(callback) {
  // @ts-ignore
  const {forgotPassword, resetPassword, reset} = this;
  // @ts-ignore
  this.setState({
    ...defaultState(),
    // @ts-ignore
    login: (params) => this.signIn(params),
    // @ts-ignore
    logout: (invalidateAllSessions = false) => this.signOut(invalidateAllSessions),
    forgotPassword,
    resetPassword,
    reset,
    location: window.location,
  }, callback);
}

export function shouldEnforceRoute(location, routingConfig) {
  if (!routingConfig) {
    return false;
  }
  let shouldEnforce = false;
  if (routingConfig.ignorePathRegex) {
    const regexp = new RegExp(routingConfig.ignorePathRegex);
    shouldEnforce = !regexp.test(location)
      && location !== routingConfig.login
      && location !== routingConfig.logout;
    emitEvent.call(undefined, null, {
      event: {regexp, path: location, shouldEnforce},
      message: `${location} is ${!shouldEnforce ? 'un' : ''}protected`
    });
    return shouldEnforce;
  }
  return routingConfig.shouldRedirect && location !== routingConfig.login;
}
