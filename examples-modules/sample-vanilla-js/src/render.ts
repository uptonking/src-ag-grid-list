// import { App } from './demo';
import { SimpleGrid as App } from './simple/A0VanillaGrid';

const render = (Component) => {
  new Component();
};
render(App);

if ((module as any).hot) {
  (module as any).hot.accept('./simple/A0VanillaGrid.ts', () => {
    render(App);
  });
}
