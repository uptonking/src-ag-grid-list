import { Column } from '../entities/column';
import { CellPosition } from '../entities/cellPosition';
import { GridPanel } from '../gridPanel/gridPanel';
import { RowPosition } from '../entities/rowPosition';
import { CellComp } from '../rendering/cellComp';

export interface IRangeController {
  isEmpty(): boolean;
  removeAllCellRanges(): void;
  getCellRangeCount(cell: CellPosition): number;
  isCellInAnyRange(cell: CellPosition): boolean;
  isCellInSpecificRange(cell: CellPosition, range: CellRange): boolean;
  isBottomRightCell(cellRange: CellRange, cell: CellPosition): boolean;
  isContiguousRange(cellRange: CellRange): boolean;
  isMoreThanOneCell(): boolean;
  onDragStart(mouseEvent: MouseEvent): void;
  onDragStop(): void;
  onDragging(mouseEvent: MouseEvent): void;
  getCellRanges(): CellRange[];
  setRangeToCell(cell: CellPosition, appendRange?: boolean): void;
  setCellRange(params: CellRangeParams): void;
  addCellRange(params: CellRangeParams): void;
  extendLatestRangeInDirection(key: number): CellPosition | undefined;
  extendLatestRangeToCell(cell: CellPosition): void;
  updateRangeEnd(
    cellRange: CellRange,
    cellPosition: CellPosition,
    silent?: boolean,
  ): void;
  registerGridComp(gridPanel: GridPanel): void;
  getRangeStartRow(cellRange: CellRange): RowPosition;
  getRangeEndRow(cellRange: CellRange): RowPosition;
  createCellRangeFromCellRangeParams(
    params: CellRangeParams,
  ): CellRange | undefined;
  setCellRanges(cellRanges: CellRange[]): void;
}

export interface ISelectionHandle {
  getGui(): HTMLElement;
  getType(): SelectionHandleType;
  refresh(cellComp: CellComp): void;
}

export interface ISelectionHandleFactory {
  createSelectionHandle(type: SelectionHandleType): ISelectionHandle;
}

export enum SelectionHandleType {
  FILL,
  RANGE,
}

export enum CellRangeType {
  VALUE,
  DIMENSION,
}

export interface CellRange {
  id?: string;
  type?: CellRangeType;
  startRow?: RowPosition;
  endRow?: RowPosition;
  columns: Column[];
  startColumn: Column;
}

export interface CellRangeParams {
  rowStartIndex?: number;
  rowStartPinned?: string;
  rowEndIndex?: number;
  rowEndPinned?: string;
  columnStart?: string | Column;
  columnEnd?: string | Column;
  columns?: (string | Column)[];
}

/** @deprecated */
// instead of this, we now use CellRange
export interface RangeSelection {
  start: CellPosition;
  end: CellPosition;
  columns: Column[] | null;
}

/** @deprecated */
// instead of this, we now use AddCellRangeParams
export interface AddRangeSelectionParams {
  rowStart: number;
  floatingStart: string;
  rowEnd: number;
  floatingEnd: string;
  columnStart: string | Column;
  columnEnd: string | Column;
}
