import React from 'react';
import {render} from 'react-dom';
import {BrowserRouter as Router} from 'react-router-dom';
import {App} from './App';

const WrappedApp = (
  <Router>
    <App/>
  </Router>
);

render(WrappedApp, document.getElementById('root'));
