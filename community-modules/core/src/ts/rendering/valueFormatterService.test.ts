import { GridOptionsWrapper } from '../gridOptionsWrapper';
import { mock } from '../test-utils/mock';
import { ExpressionService } from '../valueService/expressionService';
import { ValueFormatterService } from './valueFormatterService';
import { Column } from '../entities/column';
import { ColDef, ValueFormatterParams } from '../entities/colDef';
import { RowNode } from '../entities/rowNode';

let colDef: ColDef;
let column: jest.Mocked<Column>;
let gridOptionsWrapper: jest.Mocked<GridOptionsWrapper>;
let expressionService: jest.Mocked<ExpressionService>;
let valueFormatterService: ValueFormatterService;

describe('formatValue', () => {
  beforeEach(() => {
    colDef = {};
    column = mock<Column>('getColDef');
    column.getColDef.mockReturnValue(colDef);

    gridOptionsWrapper = mock<GridOptionsWrapper>(
      'getApi',
      'getColumnApi',
      'getContext',
    );
    expressionService = mock<ExpressionService>('evaluate');
    valueFormatterService = new ValueFormatterService();
    (valueFormatterService as any).gridOptionsWrapper = gridOptionsWrapper;
    (valueFormatterService as any).expressionService = expressionService;
  });

  it('uses supplied formatter if provided', () => {
    const returnValue = 'foo';
    const formatter = (value: string) => value.toString();
    const value = 'bar';

    expressionService.evaluate.mockReturnValue(returnValue);

    const formattedValue = valueFormatterService.formatValue(
      column,
      null,
      null,
      value,
      formatter,
    );

    expect(formattedValue).toBe(returnValue);
    expect(expressionService.evaluate).toHaveBeenCalledTimes(1);
    expect(expressionService.evaluate).toHaveBeenCalledWith(
      formatter,
      expect.anything(),
    );
  });

  it('uses value formatter from column definition if no formatter provided', () => {
    const returnValue = 'foo';
    const formatter = (params: ValueFormatterParams) => params.value.toString();
    colDef.valueFormatter = formatter;
    const value = 'bar';

    expressionService.evaluate.mockReturnValue(returnValue);

    const formattedValue = valueFormatterService.formatValue(
      column,
      null,
      null,
      value,
    );

    expect(formattedValue).toBe(returnValue);
    expect(expressionService.evaluate).toHaveBeenCalledTimes(1);
    expect(expressionService.evaluate).toHaveBeenCalledWith(
      formatter,
      expect.anything(),
    );
  });

  it('does not use value formatter from column definition if disabled', () => {
    const formatter = (params: ValueFormatterParams) => params.value.toString();
    colDef.valueFormatter = formatter;
    const formattedValue = valueFormatterService.formatValue(
      column,
      null,
      null,
      'bar',
      undefined,
      false,
    );

    expect(formattedValue).toBeNull();
    expect(expressionService.evaluate).toHaveBeenCalledTimes(0);
  });

  it('uses pinned value formatter from column definition if row is pinned', () => {
    const returnValue = 'foo';
    const formatter = (params: ValueFormatterParams) => params.value.toString();
    colDef.pinnedRowValueFormatter = formatter;
    const value = 'bar';
    const node = mock<RowNode>();
    node.rowPinned = 'top';

    expressionService.evaluate.mockReturnValue(returnValue);

    const formattedValue = valueFormatterService.formatValue(
      column,
      node,
      null,
      value,
    );

    expect(formattedValue).toBe(returnValue);
    expect(expressionService.evaluate).toHaveBeenCalledTimes(1);
    expect(expressionService.evaluate).toHaveBeenCalledWith(
      formatter,
      expect.anything(),
    );
  });

  it('looks at refData if no formatter found', () => {
    const value = 'foo';
    const refDataValue = 'bar';
    colDef.refData = { [value]: refDataValue };
    const formattedValue = valueFormatterService.formatValue(
      column,
      null,
      null,
      value,
    );

    expect(formattedValue).toBe(refDataValue);
  });

  it('returns empty string if refData exists but key cannot be found', () => {
    colDef.refData = {};
    const formattedValue = valueFormatterService.formatValue(
      column,
      null,
      null,
      'foo',
    );

    expect(formattedValue).toBe('');
  });

  it('does not use refData if formatter is found', () => {
    const value = 'foo';
    const returnValue = 'bar';
    const formatter = (value: string) => value.toString();
    colDef.refData = { [value]: 'bob' };

    expressionService.evaluate.mockReturnValue(returnValue);

    const formattedValue = valueFormatterService.formatValue(
      column,
      null,
      null,
      value,
      formatter,
    );

    expect(formattedValue).toBe(returnValue);
  });

  it('formats array values with spaces by default if not otherwise formatted', () => {
    const value = [1, 2, 3];
    const formattedValue = valueFormatterService.formatValue(
      column,
      null,
      null,
      value,
    );

    expect(formattedValue).toBe('1, 2, 3');
  });
});
