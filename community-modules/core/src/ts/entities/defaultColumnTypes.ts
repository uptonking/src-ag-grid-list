import { ColDef } from './colDef';

/** 内置的预定义表头列类型 */
export const DefaultColumnTypes: { [key: string]: ColDef } = {
  numericColumn: {
    headerClass: 'ag-right-aligned-header',
    cellClass: 'ag-right-aligned-cell',
  },
  rightAligned: {
    headerClass: 'ag-right-aligned-header',
    cellClass: 'ag-right-aligned-cell',
  },
};
