import { Bean } from '../context/context';
import { BeanStub } from '../context/beanStub';
import { Column } from './column';
import { RowPosition } from './rowPosition';

// this is what gets pass into and out of the api, as JavaScript users
export interface CellPosition extends RowPosition {
  column: Column;
}

/**
 * cell操作类，包括 createIdFromValues, equals(cellA,cellB)
 */
@Bean('cellPositionUtils')
export class CellPositionUtils extends BeanStub {
  public createId(cellPosition: CellPosition): string {
    const { rowIndex, rowPinned, column } = cellPosition;
    return this.createIdFromValues(rowIndex, column, rowPinned);
  }

  public createIdFromValues(
    rowIndex: number,
    column: Column,
    rowPinned: string | undefined,
  ): string {
    return `${rowIndex}.${
      rowPinned == null ? 'null' : rowPinned
    }.${column.getId()}`;
  }

  public equals(cellA: CellPosition, cellB: CellPosition): boolean {
    const colsMatch = cellA.column === cellB.column;
    const floatingMatch = cellA.rowPinned === cellB.rowPinned;
    const indexMatch = cellA.rowIndex === cellB.rowIndex;
    return colsMatch && floatingMatch && indexMatch;
  }
}
