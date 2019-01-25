import React, {Component} from 'react';
import {Authentication} from 'react-cognito-identity';

export default class Login extends Component {
  loginFormRef = React.createRef();

  constructor(props) {
    super(props);
    this.SignOutComponent = this.SignOutComponent.bind(this);
    this.onSubmitUsernamePassword = this.onSubmitUsernamePassword.bind(this);
    this.onSubmitNewPassword = this.onSubmitNewPassword.bind(this);
    this.onForgotPassword = this.onForgotPassword.bind(this);
    this.Error = this.Error.bind(this);
  }

  SignOutComponent = (props) => {
    const {logout} = props;
    console.log(logout);
    return (
      <div className="session--valid login">
        <b>You are currently logged in!</b>
        <button type="button" onClick={() => logout(false)}>Sign-Out</button>
      </div>
    );
  };

  onSubmitUsernamePassword = (event, loginFunction) => {
    event.preventDefault();
    console.log(event);
    const username = event.target.children['username'].value;
    const password = event.target.children['password'].value;
    loginFunction({username, password});
    return true;
  };

  onForgotPassword = (event, form, forgotPassword) => {
    event.preventDefault();
    const username = form.current.children['username'].value;
    forgotPassword({username});
    return false;
  };

  onSubmitNewPassword = (event, answerAuthChallenge) => {
    event.preventDefault();
    console.log('new password', answerAuthChallenge);
    const newPassword = event.target.children['password'].value;
    answerAuthChallenge({newPassword});
    return true;
  };

  Error = (props) => {
    const {error} = props;
    if (!error || error === 'No User') {
      return null;
    }
    return (
      <span className="error">{error.message}</span>
    )
  };

  render() {
    const {SignOutComponent, Error} = this;
    return (
      <Authentication>
        {
          ({logout, login, authenticated, challengeParameters, answerAuthChallenge, error, forgotPassword, importantDetail, reset}) => {
            if (importantDetail) {
              if (importantDetail.Destination) {
                return (
                  <div>
                    <b>
                      Instructions sent to
                      {importantDetail.Destination}
                    </b>
                  </div>
                );
              }
            }
            if (authenticated) {
              return (
                <SignOutComponent
                  logout={logout}
                />
              )
            }
            if (challengeParameters) {
              return (
                <form name="new-password" onSubmit={(e) => this.onSubmitNewPassword(e, answerAuthChallenge)}>
                  <b>Please create a new password</b>
                  <Error/>
                  <input type="password" name="password"/>
                  <button type="submit" name="submit-new-password">
                    Create New Password
                  </button>
                </form>
              );
            }
            return (
              <form ref={this.loginFormRef} name="login" onSubmit={(e) => this.onSubmitUsernamePassword(e, login)}>
                <b>Please sign-in</b>
                <Error error={error}/>
                <input type="string" name="username" required={true}/>
                <input type="password" name="password"/>
                <button type="submit">
                  Login
                </button>
                <button onClick={(e) => this.onForgotPassword(e, this.loginFormRef, forgotPassword)} type="submit" name="forgot">
                  Forgot Password
                </button>
              </form>
            );
          }
        }
      </Authentication>
    );
  }
}
