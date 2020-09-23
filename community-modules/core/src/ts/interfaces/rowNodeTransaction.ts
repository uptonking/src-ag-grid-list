import { RowNode } from '../entities/rowNode';
/** Contains Row Nodes, the grid-created objects that wrap row data items. */
export interface RowNodeTransaction {
  add: RowNode[];
  remove: RowNode[];
  update: RowNode[];
}
