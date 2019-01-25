let AUTH_PROVIDER_DEBUG = false;

export const setDebugging = (setting) => AUTH_PROVIDER_DEBUG = setting;

export function print(...args) {
  if (AUTH_PROVIDER_DEBUG) {
    // eslint-disable-next-line
    console.group('IdentityProvider');
    // eslint-disable-next-line
    console.log(...args);
    // eslint-disable-next-line
    console.groupEnd();
  }
}

export function emitEvent(error, ...args) {
  if (error !== undefined && error !== null) {
    // eslint-disable-next-line
    console.error('Error', error);
    this.setState({
      error,
    });
  }
  print(...args);
}
