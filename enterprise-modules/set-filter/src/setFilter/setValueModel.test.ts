import { SetValueModel, SetFilterModelValuesType } from './setValueModel';
import { Constants, ColDef, RowNode, IClientSideRowModel, ValueFormatterService } from '@ag-grid-community/core';
import { mock } from '../test-utils/mock';

function createSetValueModel(
    gridValues: any[] = ['A', 'B', 'C'],
    filterParams?: any,
    doesRowPassOtherFilters: (row: RowNode) => boolean = _ => true,
    suppressSorting = false) {
    const colDef = { filterParams } as ColDef;
    const rowModel = {
        getType: () => Constants.ROW_MODEL_TYPE_CLIENT_SIDE,
        forEachLeafNode: (callback: (node: RowNode) => void) => {
            const nodes = gridValues.map(v => ({ data: { value: v } }));
            nodes.forEach(callback);
        }
    } as IClientSideRowModel;

    const valueFormatterService = mock<ValueFormatterService>('formatValue');
    valueFormatterService.formatValue.mockImplementation((_1, _2, _3, value) => value);

    return new SetValueModel(
        rowModel,
        colDef,
        null,
        node => node.data.value,
        doesRowPassOtherFilters,
        suppressSorting,
        _ => { },
        valueFormatterService,
        key => key === 'blanks' ? 'Blanks' : null);
}

function getDisplayedValues(model: SetValueModel) {
    const values = [];

    for (let i = 0; i < model.getDisplayedValueCount(); i++) {
        values.push(model.getDisplayedValue(i));
    }

    return values;
}

function delayAssert(done: (error?: Error) => void, ...assertions: (() => void)[]) {
    setTimeout(() => asyncAssert(done, ...assertions), 0);
}

function asyncAssert(done: (error?: Error) => void, ...assertions: (() => void)[]) {
    try {
        assertions.forEach(a => a());
        done();
    } catch (error) {
        done(error);
    }
}

describe('isFilterActive', () => {
    it('returns false by default', () => {
        const model = createSetValueModel();

        expect(model.isFilterActive()).toBe(false);
    });

    it('returns true if any value is deselected', () => {
        const model = createSetValueModel();

        model.deselectValue('B');

        expect(model.isFilterActive()).toBe(true);
    });

    it('returns true if all values are deselected', () => {
        const model = createSetValueModel();

        model.deselectAllMatchingMiniFilter();

        expect(model.isFilterActive()).toBe(true);
    });

    it('returns false if value is deselected then selected again', () => {
        const model = createSetValueModel();
        const value = 'B';

        model.deselectValue(value);
        model.selectValue(value);

        expect(model.isFilterActive()).toBe(false);
    });
});

describe('value selection', () => {
    it('has all values selected by default', () => {
        const model = createSetValueModel();

        expect(model.isEverythingVisibleSelected()).toBe(true);
    });

    it('can change value selection', () => {
        const model = createSetValueModel();
        const value = 'A';

        expect(model.isValueSelected(value)).toBe(true);

        model.deselectValue(value);

        expect(model.isValueSelected(value)).toBe(false);

        model.selectValue(value);

        expect(model.isValueSelected(value)).toBe(true);
    });

    it('keeps value selections when values are refreshed', done => {
        const model = createSetValueModel();
        const value = 'A';

        model.deselectValue(value);

        expect(model.isValueSelected(value)).toBe(false);

        model.refreshValues().then(() => {
            asyncAssert(done, () => expect(model.isValueSelected(value)).toBe(false));
        });
    });

    it('can reset value selections when values are refreshed', done => {
        const model = createSetValueModel();
        const value = 'A';

        model.deselectValue(value);

        expect(model.isValueSelected(value)).toBe(false);

        model.refreshValues(false).then(() => {
            asyncAssert(done, () => expect(model.isValueSelected(value)).toBe(true));
        });
    });

    it.each(['windows', 'mac'])('only uses visible values in set when first value is deselected in %s Excel mode', excelMode => {
        const values = ['A', 'B', 'C'];
        const doesRowPassOtherFilters = (row: RowNode) => row.data.value != 'B';
        const model = createSetValueModel(values, { excelMode }, doesRowPassOtherFilters);

        model.deselectValue('C');

        expect(model.getModel()).toStrictEqual(['A']);
    });

    it('uses all values in set when first value is deselected when not in Excel mode', () => {
        const values = ['A', 'B', 'C'];
        const doesRowPassOtherFilters = (row: RowNode) => row.data.value != 'B';
        const model = createSetValueModel(values, undefined, doesRowPassOtherFilters);

        model.deselectValue('C');

        expect(model.getModel()).toStrictEqual(['A', 'B']);
    });
});

describe('overrideValues', () => {
    it('sets new values', done => {
        const model = createSetValueModel(['A1', 'B1', 'C1']);
        const values = ['A2', 'B2', 'C2'];

        model.overrideValues(values).then(() => {
            asyncAssert(done, () => expect(getDisplayedValues(model)).toStrictEqual(values));
        });
    });

    it('updates values type to provided list', done => {
        const model = createSetValueModel(['A1', 'B1', 'C1']);
        const values = ['A2', 'B2', 'C2'];

        model.overrideValues(values).then(() => {
            asyncAssert(done, () => expect(model.getValuesType()).toBe(SetFilterModelValuesType.PROVIDED_LIST));
        });
    });

    it('keeps existing selection', done => {
        const value = 'B1';
        const model = createSetValueModel(['A1', value, 'C1']);
        const values = ['A2', value, 'C2'];

        model.deselectValue(value);
        model.overrideValues(values).then(() => {
            asyncAssert(done, () => expect(model.isValueSelected(value)).toBe(false));
        });
    });

    it('can reset existing selection', done => {
        const value = 'B1';
        const model = createSetValueModel(['A1', value, 'C1']);
        const values = ['A2', value, 'C2'];

        model.deselectValue(value);
        model.overrideValues(values, false).then(() => {
            asyncAssert(done, () => expect(model.isValueSelected(value)).toBe(true));
        });
    });
});

describe('values from grid', () => {
    it('shows all values by default', () => {
        const values = ['A', 'B', 'C'];
        const model = createSetValueModel(values);

        expect(getDisplayedValues(model)).toStrictEqual(values);
    });

    it('only shows distinct values', () => {
        const values = ['A', 'B', 'A', 'B', 'C', 'A'];
        const model = createSetValueModel(values);

        expect(getDisplayedValues(model)).toStrictEqual(['A', 'B', 'C']);
    });

    it('sorts values alphabetically by default', () => {
        const model = createSetValueModel(['1', '5', '10', '50']);

        expect(getDisplayedValues(model)).toStrictEqual(['1', '10', '5', '50']);
    });

    it('can sort values using provided comparator', () => {
        const comparator = (a: string, b: string) => parseInt(a) - parseInt(b);
        const model = createSetValueModel(['1', '10', '5', '50'], { comparator });

        expect(getDisplayedValues(model)).toStrictEqual(['1', '5', '10', '50']);
    });

    it('will preserve original order if sorting is suppressed', () => {
        const values = ['A', 'C', 'B', 'F', 'D'];
        const model = createSetValueModel(values, undefined, undefined, true);

        expect(getDisplayedValues(model)).toStrictEqual(values);
    });

    it('only shows values that pass other filters', () => {
        const value = 'B';
        const values = ['A', value, 'C'];
        const doesRowPassOtherFilters = (row: RowNode) => row.data.value != value;
        const model = createSetValueModel(values, undefined, doesRowPassOtherFilters);

        expect(getDisplayedValues(model)).toStrictEqual(['A', 'C']);
    });

    it('updates available values when refreshAfterAnyFilterChanged is called', () => {
        const value = 'B';
        const values = ['A', value, 'C'];
        const filteredValues = new Set<string>(values);
        const doesRowPassOtherFilters = (row: RowNode) => filteredValues.has(row.data.value);
        const model = createSetValueModel(values, undefined, doesRowPassOtherFilters);

        expect(getDisplayedValues(model)).toStrictEqual(values);

        filteredValues.delete(value);

        model.refreshAfterAnyFilterChanged();

        expect(getDisplayedValues(model)).toStrictEqual(['A', 'C']);
    });

    it('shows all values regardless of whether they pass other filters if suppressRemoveEntries = true', () => {
        const value = 'B';
        const values = ['A', value, 'C'];
        const doesRowPassOtherFilters = (row: RowNode) => row.data.value != value;
        const model = createSetValueModel(values, { suppressRemoveEntries: true }, doesRowPassOtherFilters);

        expect(getDisplayedValues(model)).toStrictEqual(['A', 'B', 'C']);
    });

    it.each([undefined, null, ''])('turns "%s" into null entry', value => {
        const model = createSetValueModel([value]);

        expect(getDisplayedValues(model)).toStrictEqual([null]);
    });

    it('orders null first by default', () => {
        const values = ['A', 'B', null, 'C'];
        const model = createSetValueModel(values);

        expect(getDisplayedValues(model)).toStrictEqual([null, 'A', 'B', 'C']);
    });

    it.each(['windows', 'mac'])('orders null last in %s Excel Model', excelMode => {
        const values = ['A', 'B', null, 'C'];
        const model = createSetValueModel(values, { excelMode });

        expect(getDisplayedValues(model)).toStrictEqual(['A', 'B', 'C', null]);
    });

    it('extracts multiple values into separate entries', () => {
        const model = createSetValueModel([['A', 'B'], ['A', undefined, 'C'], ['D', 'B', null], ['']]);

        expect(getDisplayedValues(model)).toStrictEqual([null, 'A', 'B', 'C', 'D']);
    });
});

describe('provided values list', () => {
    it('only shows distinct provided values', () => {
        const model = createSetValueModel(undefined, { values: ['A2', 'B2', 'C2', 'B2', 'C2'] });

        expect(getDisplayedValues(model)).toStrictEqual(['A2', 'B2', 'C2']);
    });

    it('sorts provided values alphabetically by default', () => {
        const model = createSetValueModel(undefined, { values: ['1', '5', '10', '50'] });

        expect(getDisplayedValues(model)).toStrictEqual(['1', '10', '5', '50']);
    });

    it('can sort provided values using provided comparator', () => {
        const comparator = (a: string, b: string) => parseInt(a) - parseInt(b);
        const model = createSetValueModel(undefined, { values: ['1', '10', '5', '50'], comparator });

        expect(getDisplayedValues(model)).toStrictEqual(['1', '5', '10', '50']);
    });

    it('will preserve original provided order if sorting is suppressed', () => {
        const values = ['A', 'C', 'B', 'F', 'D'];
        const model = createSetValueModel(undefined, { values }, undefined, true);

        expect(getDisplayedValues(model)).toStrictEqual(values);
    });

    it('always shows all provided values regardless of whether they pass other filters', () => {
        const value = 'B';
        const values = ['A', value, 'C'];
        const doesRowPassOtherFilters = (row: RowNode) => row.data.value != value;
        const model = createSetValueModel(undefined, { values }, doesRowPassOtherFilters);

        expect(getDisplayedValues(model)).toStrictEqual(['A', 'B', 'C']);
    });
});

describe('provided callback values', () => {
    it('only shows distinct provided callback values', done => {
        const model = createSetValueModel(undefined, { values: (params: any) => params.success(['A2', 'B2', 'C2', 'B2', 'C2']) });

        delayAssert(done, () => expect(getDisplayedValues(model)).toStrictEqual(['A2', 'B2', 'C2']));
    });

    it('sorts provided callback values alphabetically by default', done => {
        const model = createSetValueModel(undefined, { values: (params: any) => params.success(['1', '5', '10', '50']) });

        delayAssert(done, () => expect(getDisplayedValues(model)).toStrictEqual(['1', '10', '5', '50']));
    });

    it('can sort provided callback values using provided comparator', done => {
        const comparator = (a: string, b: string) => parseInt(a) - parseInt(b);
        const model = createSetValueModel(undefined, { values: (params: any) => params.success(['1', '10', '5', '50']), comparator });

        delayAssert(done, () => expect(getDisplayedValues(model)).toStrictEqual(['1', '5', '10', '50']));
    });

    it('will preserve original provided order from callback if sorting is suppressed', done => {
        const values = ['A', 'C', 'B', 'F', 'D'];
        const model = createSetValueModel(undefined, { values: (params: any) => params.success(values) }, undefined, true);

        delayAssert(done, () => expect(getDisplayedValues(model)).toStrictEqual(values));
    });

    it('always shows all provided callback values regardless of whether they pass other filters', done => {
        const value = 'B';
        const values = ['A', value, 'C'];
        const doesRowPassOtherFilters = (row: RowNode) => row.data.value != value;
        const model = createSetValueModel(undefined, { values: (params: any) => params.success(values) }, doesRowPassOtherFilters);

        delayAssert(done, () => expect(getDisplayedValues(model)).toStrictEqual(['A', 'B', 'C']));
    });
});

describe('mini filter', () => {
    it('sets mini filter text', () => {
        const miniFilterText = 'foo';
        const model = createSetValueModel();

        model.setMiniFilter(miniFilterText);

        expect(model.getMiniFilter()).toBe(miniFilterText);
    });

    it('returns true if mini filter text has changed', () => {
        const model = createSetValueModel();
        expect(model.setMiniFilter('foo')).toBe(true);
    });

    it('returns false if mini filter text has not changed', () => {
        const model = createSetValueModel();
        const miniFilterText = 'foo';

        model.setMiniFilter(miniFilterText);

        expect(model.setMiniFilter(miniFilterText)).toBe(false);
    });

    it.each([undefined, null, ''])('turns "%s" to null value', value => {
        const model = createSetValueModel();
        model.setMiniFilter(value);

        expect(model.getMiniFilter()).toBeNull();
    });

    it('updates displayed values to only show those that match, ignoring case', () => {
        const expectedValues = ['foo', 'fooA', 'Bfoo', 'DfooD', 'FoOE'];
        const values = ['A', 'B', 'foCo', ...expectedValues, 'F', 'G'];
        const model = createSetValueModel(values, undefined, undefined, true);

        model.setMiniFilter('foo');

        expect(getDisplayedValues(model)).toStrictEqual(expectedValues);

        model.setMiniFilter('FOO');

        expect(getDisplayedValues(model)).toStrictEqual(expectedValues);
    });

    it('resets to show all values if mini filter is removed', () => {
        const value = 'foo';
        const values = ['A', 'B', value, 'C', 'D'];
        const model = createSetValueModel(values, undefined, undefined, true);

        model.setMiniFilter(value);
        model.setMiniFilter(null);

        expect(getDisplayedValues(model)).toStrictEqual(values);
    });

    it('shows nothing if no values match', () => {
        const values = ['A', 'B', 'C', 'D'];
        const model = createSetValueModel(values);

        model.setMiniFilter('foo');

        expect(getDisplayedValues(model)).toStrictEqual([]);
    });

    it('does not show Blanks entry if mini filter matches', () => {
        const values = ['A', null, 'B'];
        const model = createSetValueModel(values);

        model.setMiniFilter('bla');

        expect(getDisplayedValues(model)).toStrictEqual([]);
    });

    it.each(['windows', 'mac'])('shows Blanks entry if mini filter matches in %s Excel mode', excelMode => {
        const values = ['A', null, 'B'];
        const model = createSetValueModel(values, { excelMode });

        model.setMiniFilter('bla');

        expect(getDisplayedValues(model)).toStrictEqual([null]);
    });
});

describe('selectAllMatchingMiniFilter', () => {
    it('selects all values if no mini filter', () => {
        const values = ['A', 'B', 'C'];
        const model = createSetValueModel(values);

        values.forEach(v => model.deselectValue(v));

        model.selectAllMatchingMiniFilter();

        values.forEach(v => expect(model.isValueSelected(v)).toBe(true));
    });

    it('selects all values that match mini filter', () => {
        const values = ['A', 'B', 'C'];
        const model = createSetValueModel(values);

        model.deselectValue('B');
        model.deselectValue('C');
        model.setMiniFilter('B');
        model.selectAllMatchingMiniFilter();

        expect(model.isValueSelected('A')).toBe(true);
        expect(model.isValueSelected('B')).toBe(true);
        expect(model.isValueSelected('C')).toBe(false);
    });

    it.each([undefined, 'windows', 'mac'])('selects all values that match mini filter, replacing existing selection if requested, for excelMode = %s', excelMode => {
        const values = ['A', 'B', 'C'];
        const model = createSetValueModel(values, { excelMode });

        model.deselectValue('B');
        model.deselectValue('C');
        model.setMiniFilter('B');
        model.selectAllMatchingMiniFilter(true);

        expect(model.isValueSelected('A')).toBe(false);
        expect(model.isValueSelected('B')).toBe(true);
        expect(model.isValueSelected('C')).toBe(false);
    });
});

describe('deselectAllMatchingMiniFilter', () => {
    it('deselects all values if no mini filter', () => {
        const values = ['A', 'B', 'C'];
        const model = createSetValueModel(values);

        model.deselectAllMatchingMiniFilter();

        values.forEach(v => expect(model.isValueSelected(v)).toBe(false));
    });

    it.each([undefined, 'windows', 'mac'])('deselects all values that match mini filter, for excelMode = %s', excelMode => {
        const values = ['A', 'B', 'C'];
        const model = createSetValueModel(values, { excelMode });

        model.deselectValue('C');
        model.setMiniFilter('B');
        model.deselectAllMatchingMiniFilter();

        expect(model.isValueSelected('A')).toBe(true);
        expect(model.isValueSelected('B')).toBe(false);
        expect(model.isValueSelected('C')).toBe(false);
    });
});

describe('isEverythingVisibleSelected', () => {
    it('returns true if all values are selected', () => {
        const values = ['A', 'B', 'C'];
        const model = createSetValueModel(values);

        values.forEach(v => model.selectValue(v));

        expect(model.isEverythingVisibleSelected()).toBe(true);
    });

    it('returns false if any values are not selected', () => {
        const values = ['A', 'B', 'C'];
        const model = createSetValueModel(values);

        model.deselectValue('B');

        expect(model.isEverythingVisibleSelected()).toBe(false);
    });

    it('returns true if everything that matches mini filter is selected', () => {
        const value = 'B';
        const values = ['A', value, 'C'];
        const model = createSetValueModel(values);

        values.forEach(v => model.deselectValue(v));

        model.selectValue(value);
        model.setMiniFilter(value);

        expect(model.isEverythingVisibleSelected()).toBe(true);
    });

    it('returns true if any values that match mini filter are not selected', () => {
        const values = ['A', 'fooB', 'Cfoo'];
        const model = createSetValueModel(values);

        values.forEach(v => model.deselectValue(v));
        model.selectValue('fooB');
        model.setMiniFilter('foo');

        expect(model.isEverythingVisibleSelected()).toBe(false);
    });
});

describe('isNothingVisibleSelected', () => {
    it('returns true if no values are selected', () => {
        const values = ['A', 'B', 'C'];
        const model = createSetValueModel(values);

        values.forEach(v => model.deselectValue(v));

        expect(model.isNothingVisibleSelected()).toBe(true);
    });

    it('returns false if any values are selected', () => {
        const values = ['A', 'B', 'C'];
        const model = createSetValueModel(values);

        values.forEach(v => model.deselectValue(v));
        model.selectValue('B');

        expect(model.isNothingVisibleSelected()).toBe(false);
    });

    it('returns true if everything that matches mini filter is not selected', () => {
        const values = ['A', 'B', 'C'];
        const model = createSetValueModel(values);

        values.forEach(v => model.deselectValue(v));

        model.selectValue('A');
        model.setMiniFilter('B');

        expect(model.isNothingVisibleSelected()).toBe(true);
    });

    it('returns false if any values that match mini filter are selected', () => {
        const values = ['A', 'fooB', 'Cfoo'];
        const model = createSetValueModel(values);

        values.forEach(v => model.deselectValue(v));
        model.selectValue('fooB');
        model.setMiniFilter('foo');

        expect(model.isNothingVisibleSelected()).toBe(false);
    });
});

describe('getModel', () => {
    it('returns null if filter is not active', () => {
        const model = createSetValueModel();

        expect(model.getModel()).toBe(null);
    });

    it('returns selected values if filter is active', () => {
        const expectedValues = ['B', 'C'];
        const values = ['A', ...expectedValues, 'D', 'E'];
        const model = createSetValueModel(values);

        values.forEach(v => model.deselectValue(v));
        expectedValues.forEach(v => model.selectValue(v));

        expect(model.getModel()).toStrictEqual(expectedValues);
    });
});

describe('setModel', () => {
    it('exclusively selects provided values', done => {
        const expectedValues = ['A', 'B'];
        const otherValues = ['C', 'D', 'E'];
        const model = createSetValueModel([...expectedValues, ...otherValues]);

        model.setModel(expectedValues).then(() => {
            asyncAssert(
                done,
                () => expectedValues.forEach(v => expect(model.isValueSelected(v)).toBe(true)),
                () => otherValues.forEach(v => expect(model.isValueSelected(v)).toBe(false)));
        });
    });

    it('selects all values if provided model is null', done => {
        const values = ['A', 'B', 'C', 'D', 'E'];
        const model = createSetValueModel(values);

        values.forEach(v => model.deselectValue(v));

        model.setModel(null).then(() => {
            asyncAssert(done, () => values.forEach(v => expect(model.isValueSelected(v)).toBe(true)));
        });
    });
});

