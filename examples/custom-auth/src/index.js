import React from 'react';
import { render } from 'react-dom';
import { App } from './App';
import {BrowserRouter as Router} from "react-router-dom";

const WrappedApp = (
  <Router>
    <App/>
  </Router>
);

render(WrappedApp, document.getElementById('root'));