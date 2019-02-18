# React Cognito Identity

**Disclaimer** This is my first open-source contribution, please let me know if 
you have any notes or would like to contribute.

React Cognito-Identity includes components that will secure your web
application with the `amplify-js` javascript library. While you can definitely do a lot with that library alone, this can be a simpler options with a couple extra features. This library simply provides two React Context Consumers for you to use, wherever, however you wish.

### When to use it
Use these components for your SPA when the following applies:
- You plan to use Amazon Web Services: Cognito User Pools or Identity Pools (or both)
- You are using ReactJS (v16.3 or greater)
- You need to authenticate users and authorize access to your servers
- You want automatic redirection to your login page (assuming it's also handled by your app and not elsewhere)
- You want to keep some paths public in your app publically accessible and don't want any kind of redirection

#### Installation
`npm install --save react-cognito-identity`

#### Examples
- [`CUSTOM_AUTH` flow](https://github.com/awill1988/react-cognito-identity/tree/master/examples/custom-auth)
- [`USER_PASSWORD_AUTH` flow](https://github.com/awill1988/react-cognito-identity/tree/master/examples/user-password)
