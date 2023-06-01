import { RefSelector } from '../../../widgets/componentAnnotations';
import { Promise } from '../../../utils';
import {
  SimpleFilter,
  ConditionPosition,
  ISimpleFilterModel,
} from '../simpleFilter';
import { ScalarFilter, Comparator, IScalarFilterParams } from '../scalarFilter';
import { AgInputNumberField } from '../../../widgets/agInputNumberField';
import { IAfterGuiAttachedParams } from '../../../interfaces/iAfterGuiAttachedParams';
import { makeNull } from '../../../utils/generic';
import { setDisplayed } from '../../../utils/dom';

export interface NumberFilterModel extends ISimpleFilterModel {
  filter?: number;
  filterTo?: number;
}

export interface INumberFilterParams extends IScalarFilterParams {}

export class NumberFilter extends ScalarFilter<NumberFilterModel, number> {
  private static readonly FILTER_TYPE = 'number';

  public static DEFAULT_FILTER_OPTIONS = [
    ScalarFilter.EQUALS,
    ScalarFilter.NOT_EQUAL,
    ScalarFilter.LESS_THAN,
    ScalarFilter.LESS_THAN_OR_EQUAL,
    ScalarFilter.GREATER_THAN,
    ScalarFilter.GREATER_THAN_OR_EQUAL,
    ScalarFilter.IN_RANGE,
  ];

  @RefSelector('eValueFrom1') private eValueFrom1: AgInputNumberField;
  @RefSelector('eValueFrom2') private eValueFrom2: AgInputNumberField;

  @RefSelector('eValueTo1') private eValueTo1: AgInputNumberField;
  @RefSelector('eValueTo2') private eValueTo2: AgInputNumberField;

  protected mapRangeFromModel(filterModel: NumberFilterModel): {
    from: number;
    to: number;
  } {
    return {
      from: filterModel.filter,
      to: filterModel.filterTo,
    };
  }

  protected getDefaultDebounceMs(): number {
    return 500;
  }

  protected resetUiToDefaults(silent?: boolean): Promise<void> {
    return super.resetUiToDefaults(silent).then(() => {
      const fields = [
        this.eValueFrom1,
        this.eValueFrom2,
        this.eValueTo1,
        this.eValueTo2,
      ];

      fields.forEach((field) => field.setValue(null, silent));

      this.resetPlaceholder();
    });
  }

  protected setConditionIntoUi(
    model: NumberFilterModel,
    position: ConditionPosition,
  ): void {
    const positionOne = position === ConditionPosition.One;
    const eValueFrom = positionOne ? this.eValueFrom1 : this.eValueFrom2;
    const eValueTo = positionOne ? this.eValueTo1 : this.eValueTo2;

    eValueFrom.setValue(model ? '' + model.filter : null);
    eValueTo.setValue(model ? '' + model.filterTo : null);
  }

  protected setValueFromFloatingFilter(value: string): void {
    this.eValueFrom1.setValue(value);
    this.eValueFrom2.setValue(null);
    this.eValueTo1.setValue(null);
    this.eValueTo2.setValue(null);
  }

  protected comparator(): Comparator<number> {
    return (left: number, right: number): number => {
      if (left === right) {
        return 0;
      }
      if (left < right) {
        return 1;
      }

      return -1;
    };
  }

  protected setParams(params: INumberFilterParams): void {
    super.setParams(params);

    this.addValueChangedListeners();
  }

  private addValueChangedListeners(): void {
    const listener = () => this.onUiChanged();

    this.eValueFrom1.onValueChange(listener);
    this.eValueFrom2.onValueChange(listener);
    this.eValueTo1.onValueChange(listener);
    this.eValueTo2.onValueChange(listener);
  }

  private resetPlaceholder(): void {
    const isRange1 = this.getCondition1Type() === ScalarFilter.IN_RANGE;
    const isRange2 = this.getCondition2Type() === ScalarFilter.IN_RANGE;

    this.eValueFrom1.setInputPlaceholder(
      this.translate(isRange1 ? 'inRangeStart' : 'filterOoo'),
    );
    this.eValueTo1.setInputPlaceholder(
      this.translate(isRange1 ? 'inRangeEnd' : 'filterOoo'),
    );

    this.eValueFrom2.setInputPlaceholder(
      this.translate(isRange2 ? 'inRangeStart' : 'filterOoo'),
    );
    this.eValueTo2.setInputPlaceholder(
      this.translate(isRange2 ? 'inRangeEnd' : 'filterOoo'),
    );
  }

  public afterGuiAttached(params: IAfterGuiAttachedParams): void {
    super.afterGuiAttached(params);

    this.resetPlaceholder();
    this.eValueFrom1.getInputElement().focus();
  }

  protected getDefaultFilterOptions(): string[] {
    return NumberFilter.DEFAULT_FILTER_OPTIONS;
  }

  protected createValueTemplate(position: ConditionPosition): string {
    const positionOne = position === ConditionPosition.One;
    const pos = positionOne ? '1' : '2';

    return `<div class="ag-filter-body" ref="eCondition${pos}Body" role="presentation">
                    <ag-input-number-field class="ag-filter-from ag-filter-filter" ref="eValueFrom${pos}"></ag-input-number-field>
                    <ag-input-number-field class="ag-filter-to ag-filter-filter" ref="eValueTo${pos}"></ag-input-number-field>
                </div>`;
  }

  protected isConditionUiComplete(position: ConditionPosition): boolean {
    const positionOne = position === ConditionPosition.One;
    const option = positionOne
      ? this.getCondition1Type()
      : this.getCondition2Type();
    const eValue = positionOne ? this.eValueFrom1 : this.eValueFrom2;
    const eValueTo = positionOne ? this.eValueTo1 : this.eValueTo2;

    const value = this.stringToFloat(eValue.getValue());
    const valueTo = this.stringToFloat(eValueTo.getValue());

    if (option === SimpleFilter.EMPTY) {
      return false;
    }

    if (this.doesFilterHaveHiddenInput(option)) {
      return true;
    }

    if (option === SimpleFilter.IN_RANGE) {
      return value != null && valueTo != null;
    }

    return value != null;
  }

  protected areSimpleModelsEqual(
    aSimple: NumberFilterModel,
    bSimple: NumberFilterModel,
  ): boolean {
    return (
      aSimple.filter === bSimple.filter &&
      aSimple.filterTo === bSimple.filterTo &&
      aSimple.type === bSimple.type
    );
  }

  // needed for creating filter model
  protected getFilterType(): string {
    return NumberFilter.FILTER_TYPE;
  }

  private stringToFloat(value: string | number): number {
    if (typeof value === 'number') {
      return value;
    }

    let filterText = makeNull(value);

    if (filterText && filterText.trim() === '') {
      filterText = null;
    }

    let newFilter: number;

    if (filterText !== null && filterText !== undefined) {
      newFilter = parseFloat(filterText);
    } else {
      newFilter = null;
    }

    return newFilter;
  }

  protected createCondition(position: ConditionPosition): NumberFilterModel {
    const positionOne = position === ConditionPosition.One;
    const type = positionOne
      ? this.getCondition1Type()
      : this.getCondition2Type();
    const eValue = positionOne ? this.eValueFrom1 : this.eValueFrom2;
    const value = this.stringToFloat(eValue.getValue());
    const eValueTo = positionOne ? this.eValueTo1 : this.eValueTo2;
    const valueTo = this.stringToFloat(eValueTo.getValue());
    const model: NumberFilterModel = {
      filterType: NumberFilter.FILTER_TYPE,
      type: type,
    };

    if (!this.doesFilterHaveHiddenInput(type)) {
      model.filter = value;
      model.filterTo = valueTo; // FIX - should only populate this when filter choice has 'to' option
    }

    return model;
  }

  protected updateUiVisibility(): void {
    super.updateUiVisibility();

    this.resetPlaceholder();

    const showFrom1 = this.showValueFrom(this.getCondition1Type());
    setDisplayed(this.eValueFrom1.getGui(), showFrom1);

    const showTo1 = this.showValueTo(this.getCondition1Type());
    setDisplayed(this.eValueTo1.getGui(), showTo1);

    const showFrom2 = this.showValueFrom(this.getCondition2Type());
    setDisplayed(this.eValueFrom2.getGui(), showFrom2);

    const showTo2 = this.showValueTo(this.getCondition2Type());
    setDisplayed(this.eValueTo2.getGui(), showTo2);
  }
}
