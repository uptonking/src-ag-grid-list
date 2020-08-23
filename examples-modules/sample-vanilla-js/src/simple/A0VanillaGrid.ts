import { Grid, GridOptions, ModuleRegistry } from '@ag-grid-community/core';
import { ClientSideRowModelModule } from '@ag-grid-community/client-side-row-model';
import '@ag-grid-community/core/dist-copy/styles/ag-grid.scss';
import '@ag-grid-community/core/dist-copy/styles/ag-theme-alpine/sass/ag-theme-alpine.scss';

ModuleRegistry.register(ClientSideRowModelModule);

export class SimpleGrid {
  private gridOptions: GridOptions = <GridOptions>{};

  constructor() {
    this.gridOptions = {
      columnDefs: this.createColumnDefs(),
      rowData: this.createRowData(),
    };

    let eGridDiv: HTMLElement = <HTMLElement>document.querySelector('#app');
    new Grid(eGridDiv, this.gridOptions);
  }

  // specify the columns
  private createColumnDefs() {
    return [
      { headerName: 'Make', field: 'make' },
      { headerName: 'Model', field: 'model' },
      { headerName: 'Price', field: 'price' },
    ];
  }
  // specify the data
  private createRowData() {
    return [
      { make: 'Toyota 丰田', model: 'Celica', price: 240000 },
      { make: 'Ford 福特', model: 'Mondeo', price: 220000 },
      { make: 'Porsche 保时捷', model: 'Boxter', price: 500000 },
    ];
  }
}

export default SimpleGrid
