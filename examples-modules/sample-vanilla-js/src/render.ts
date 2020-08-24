// import { App } from './demo';
// import { SimpleGrid as App } from './simple/A0VanillaGrid';
import './demo';

// const render = (Component) => {
//   new Component();
// };
// render(App);

if ((module as any).hot) {
  (module as any).hot.accept('./demo.ts', () => {
    // render(App);

    import('./demo')

  });
}
