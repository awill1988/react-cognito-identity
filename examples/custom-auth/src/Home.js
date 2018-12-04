import * as React from "react";

export default (props) => {
  const {session} = props;
  return (
    <div>
      <h1>You're logged in!</h1>
      <div>
        <p>Access Token</p>
        <span>
          You can use the value below to authenticate to your backend servers
        </span>
        <br/>
        <textarea
          style={{resize: 'none'}}
          rows={20}
          cols={70}
          readOnly={true}
          disabled={true}
          draggable={false}
          value={session ? session.getAccessToken().getJwtToken(): ''}
        />
      </div>
    </div>
  );
}