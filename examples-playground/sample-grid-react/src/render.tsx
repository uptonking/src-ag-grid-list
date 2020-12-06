import React from 'react';
import ReactDOM from 'react-dom';
// import { App } from './demo';
import { ExampleListApp as App } from './ExampleListApp';

const render = (Component) => {
  ReactDOM.render(<Component />, document.getElementById('app'));
};
render(App);

if ((module as any).hot) {
  (module as any).hot.accept('./ExampleListApp.tsx', () => {
    render(App);
  });
}
