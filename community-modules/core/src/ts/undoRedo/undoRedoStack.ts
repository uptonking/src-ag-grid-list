import { CellRange } from '../interfaces/iRangeController';

export interface CellValueChange {
  rowPinned?: string;
  rowIndex: number;
  columnId: string;
  oldValue: any;
  newValue: any;
}

export interface LastFocusedCell {
  rowPinned?: string;
  rowIndex: number;
  columnId: string;
}

export class UndoRedoAction {
  cellValueChanges: CellValueChange[];

  constructor(cellValueChanges: CellValueChange[]) {
    this.cellValueChanges = cellValueChanges;
  }
}

export class FillUndoRedoAction extends UndoRedoAction {
  initialRange: CellRange;
  finalRange: CellRange;

  constructor(
    cellValueChanges: CellValueChange[],
    initialRange: CellRange,
    finalRange: CellRange,
  ) {
    super(cellValueChanges);
    this.initialRange = initialRange;
    this.finalRange = finalRange;
  }
}

export class UndoRedoStack {
  private static DEFAULT_STACK_SIZE = 10;

  private readonly maxStackSize: number;

  private actionStack: UndoRedoAction[] = [];

  constructor(maxStackSize?: number) {
    this.maxStackSize = maxStackSize
      ? maxStackSize
      : UndoRedoStack.DEFAULT_STACK_SIZE;
    this.actionStack = new Array<UndoRedoAction>(this.maxStackSize);
  }

  public pop(): UndoRedoAction {
    return this.actionStack.pop();
  }

  public push(item: UndoRedoAction): void {
    const shouldAddActions =
      item.cellValueChanges && item.cellValueChanges.length > 0;
    if (!shouldAddActions) {
      return;
    }

    if (this.actionStack.length === this.maxStackSize) {
      this.actionStack.shift();
    }

    this.actionStack.push(item);
  }

  public clear(): void {
    this.actionStack = [];
  }
}
