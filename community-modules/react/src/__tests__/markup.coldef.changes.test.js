import React, { Component } from 'react';
import { AgGridReact } from '../agGridReact';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';

import { ensureGridApiHasBeenSet, wait } from './utils';

import { mount } from 'enzyme';
import { AgGridColumn } from '../../main';

let component = null;
let agGridReact = null;

beforeEach((done) => {
  component = mount(<DeclarativeColumnsGrid />);
  agGridReact = component.find(AgGridReact).instance();
  // don't start our tests until the grid is ready
  ensureGridApiHasBeenSet(component).then(() => setTimeout(() => done(), 20));
});

afterEach(() => {
  component.unmount();
  agGridReact = null;
});

it('declarative grid renders as expected', () => {
  expect(
    component
      .render()
      .find('.ag-pinned-left-header .ag-header-cell-text')
      .text(),
  ).toEqual('Name');
  expect(
    component.render().find('.ag-header-viewport .ag-header-cell-text').text(),
  ).toEqual('Country');
  expect(component.render().find('.ag-header-cell-text').text()).toEqual(
    'NameCountry',
  );
  expect(component.render().find('.ag-cell-value').text()).toEqual(
    '24South Africa',
  );
});

it('declarative grid hiding a column removes it from the dom', async () => {
  component.setState({
    hideCountry: true,
  });

  await wait(10);

  expect(
    component
      .render()
      .find('.ag-pinned-left-header .ag-header-cell-text')
      .text(),
  ).toEqual('Name');
  expect(
    component.render().find('.ag-header-viewport .ag-header-cell-text').text(),
  ).toEqual('');
  expect(component.render().find('.ag-header-cell-text').text()).toEqual(
    'Name',
  );
  expect(component.render().find('.ag-cell-value').text()).toEqual('24');
});

it('declarative grid unpinning a column moves it to the center header section', async () => {
  component.setState({
    pinName: false,
  });

  await wait(10);

  expect(
    component
      .render()
      .find('.ag-pinned-left-header .ag-header-cell-text')
      .text(),
  ).toEqual('');
  expect(
    component.render().find('.ag-header-viewport .ag-header-cell-text').text(),
  ).toEqual('NameCountry');
  expect(component.render().find('.ag-header-cell-text').text()).toEqual(
    'NameCountry',
  );
  expect(component.render().find('.ag-cell-value').text()).toEqual(
    '24South Africa',
  );
});

class DeclarativeColumnsGrid extends Component {
  constructor(props) {
    super(props);

    this.state = {
      rowData: [{ name: 24, country: 'South Africa' }],
      pinName: true,
      hideCountry: false,
    };
  }

  onGridReady(params) {
    this.api = params.api;
  }

  render() {
    return (
      <div style={{ height: 200, width: 500 }} className='ag-theme-balham'>
        <AgGridReact
          onGridReady={this.onGridReady.bind(this)}
          rowData={this.state.rowData}
          modules={[ClientSideRowModelModule]}
        >
          <AgGridColumn
            field='name'
            width={150}
            pinned={this.state.pinName}
            editable
          />
          <AgGridColumn
            field='country'
            width={150}
            hide={this.state.hideCountry}
          />
        </AgGridReact>
        />
      </div>
    );
  }
}
