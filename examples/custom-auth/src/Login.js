import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {Authentication} from 'react-cognito-identity';

export default class Login extends Component {
  static propTypes = {
    logout: PropTypes.func
  };

  constructor(props) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.ChallengeComponent = this.ChallengeComponent.bind(this);
    this.SignOutComponent = this.SignOutComponent.bind(this);
    this.handleChoiceSubmit = this.handleChoiceSubmit.bind(this);
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

  ChallengeComponent = (props) => {
    const {challengeParameters, answerAuthChallenge} = props;
    switch (challengeParameters.type) {
      case 'multi-choice':
        return (
          <form className="login" onSubmit={(e) => this.handleChoiceSubmit(e, answerAuthChallenge)}>
            <label htmlFor="answer">{challengeParameters.question}</label>
            <fieldset name={challengeParameters.type}>
              {challengeParameters.choices.split(challengeParameters.splitChar).map(
                (choice, i) => (
                  <div key={`answer-${i}`} className="choice">
                    <input name={challengeParameters.type} type="radio"/>
                    <span name="choice-answer">{choice}</span>
                  </div>
                )
              )}
            </fieldset>
            <button type="submit">Submit</button>
          </form>
        );
      default:
        return (
          <form id="login" onSubmit={(e) => this.handleSubmit(e, answerAuthChallenge, ['answer'])}>
            <label htmlFor="answer">{challengeParameters.question}</label>
            <input name="answer" type="text" minLength="4" placeholder="Enter Correct Answer"/>
            <button type="submit">Submit</button>
          </form>
        );
    }
  };

  handleSubmit(e, func, fields = []) {
    e.preventDefault();
    // eslint-disable-next-line
    const obj = {};
    fields.forEach(field => obj[field] = e.target.children.namedItem(field).value);
    func(obj);
    return true;
  }

  // eslint-disable-next-line
  handleChoiceSubmit(e, func) {
    e.preventDefault();
    const choices = e.target.children.namedItem('multi-choice').children;
    let selected;
    for (let i = 0; i < choices.length; i++) {
      if (choices[i].children.namedItem('multi-choice').checked) {
        selected = choices[i];
        break;
      }
    }
    const answer = selected
      .children
      .namedItem('choice-answer')
      .innerHTML
      .toUpperCase();
    func({answer});
    return true;
  }

  render() {
    const {ChallengeComponent, SignOutComponent} = this;
    return (
      <Authentication>
        {
          ({logout, answerAuthChallenge, challengeParameters, authenticated}) => {
            if (authenticated) {
              return (
                <SignOutComponent
                  logout={logout}
                />
              )
            }
            return challengeParameters
              ? (
                <ChallengeComponent
                  answerAuthChallenge={answerAuthChallenge}
                  challengeParameters={challengeParameters}
                />
              )
              : []
          }
        }
      </Authentication>
    );
  }
}
