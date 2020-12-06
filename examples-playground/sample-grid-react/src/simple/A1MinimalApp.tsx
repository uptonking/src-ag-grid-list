import React, { useState } from 'react';
import { ModuleRegistry } from '@ag-grid-community/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import { AgGridReact, girdSolutions } from '@ag-grid-community/react';
import '@ag-grid-community/core/dist-copy/styles/ag-grid.css';
import '@ag-grid-community/core/dist-copy/styles/ag-theme-alpine.css';

ModuleRegistry.register(ClientSideRowModelModule);

export function App() {
  const [state, setState] = useState({
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
  });

  return (
    <div>
      {girdSolutions.ag ? girdSolutions.ag : 'undefinedGrid'}
      <div
        className='ag-theme-alpine'
        style={{ height: 200, width: 600 }}
        id='IDMinimalApp'
      >
        <AgGridReact
          columnDefs={state.columnDefs}
          rowData={state.rowData}
        ></AgGridReact>
      </div>
    </div>
  );
}

export default App;
