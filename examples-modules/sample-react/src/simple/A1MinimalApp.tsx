import React from 'react';
import { AgGridReact } from 'ag-grid-react';

import '@ag-grid-community/core/dist-copy/styles/ag-grid.css';
import '@ag-grid-community/core/dist-copy/styles/ag-theme-alpine.css';

export class App extends React.Component<{}, any> {
  constructor(props) {
    super(props);
    this.state = {
      columnDefs: [
        { headerName: 'Make', field: 'make' },
        { headerName: 'Model', field: 'model' },
        { headerName: 'Price', field: 'price' },
      ],
      rowData: [
        { make: 'Toyota', model: 'Celica', price: 35000 },
        { make: 'Ford', model: 'Mondeo', price: 32000 },
        { make: 'Porsche', model: 'Boxter', price: 72000 },
      ],
    };
  }

  render() {
    return (
      <div
        className='ag-theme-alpine'
        style={{ height: '200px', width: '600px' }}
      >
        <AgGridReact
          columnDefs={this.state.columnDefs}
          rowData={this.state.rowData}
        ></AgGridReact>
      </div>
    );
  }
}

export default App;
