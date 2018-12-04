# React Cognito Identity

**Disclaimer** This is my first open-source contribution, please let me know if 
you have any notes or would like to contribute.

React Cognito-Identity includes components that will secure your web
application with the `amazon-cognito-identity-js` library. It does not
require any state management libraries. Instead, it provides React 
Context Consumers to easily propagate user sessions.

### When to use it
Use these components for your SPA when the following applies:
- You are using ReactJS (v16.3 or greater)
- You need to authenticate users and authorize access to your servers
- Your application will use React Router (v4 or above)
- You want automatic redirection to your login page
- You want to keep some paths public and don't want redirection
- You plan to use Amazon Web Services: Cognito User Pools

#### Installation

`npm install --save react-cognito-identity`

[Examples](https://github.com/awill1988/react-cognito-identity/examples)
- `CUSTOM_AUTH` flow