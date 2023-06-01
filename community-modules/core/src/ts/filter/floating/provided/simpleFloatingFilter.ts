import { Component } from '../../../widgets/component';
import { IFloatingFilterComp, IFloatingFilterParams } from '../floatingFilter';
import { ProvidedFilterModel } from '../../../interfaces/iFilter';
import {
  ICombinedSimpleModel,
  ISimpleFilterModel,
  SimpleFilter,
} from '../../provided/simpleFilter';
import { OptionsFactory } from '../../provided/optionsFactory';
import { IScalarFilterParams } from '../../provided/scalarFilter';
import { FilterChangedEvent } from '../../../events';

/**
 * Floating Filters are an additional row under the column headers where user
 * will be able to see and optionally edit the filters associated with each column.
 */
export abstract class SimpleFloatingFilter
  extends Component
  implements IFloatingFilterComp
{
  // this method is on IFloatingFilterComp. because it's not implemented at this level, we have to
  // define it as an abstract method. it gets implemented in sub classes.
  public abstract onParentModelChanged(
    model: ProvidedFilterModel,
    event: FilterChangedEvent,
  ): void;

  // creates text equivalent of FilterModel. if it's a combined model, this takes just one condition.
  protected abstract conditionToString(condition: ProvidedFilterModel): string;
  protected abstract getDefaultFilterOptions(): string[];
  protected abstract setEditable(editable: boolean): void;

  private lastType: string;

  private optionsFactory: OptionsFactory;

  protected getDefaultDebounceMs(): number {
    return 0;
  }

  // this is a user component, and IComponent has "public destroy()" as part of the interface.
  // so we need to override destroy() just to make the method public.
  public destroy(): void {
    super.destroy();
  }

  // used by:
  // 1) NumberFloatingFilter & TextFloatingFilter: Always, for both when editable and read only.
  // 2) DateFloatingFilter: Only when read only (as we show text rather than a date picker when read only)
  protected getTextFromModel(model: ProvidedFilterModel): string {
    if (!model) {
      return null;
    }

    const isCombined = (model as any).operator;

    if (isCombined) {
      const combinedModel = model as ICombinedSimpleModel<ISimpleFilterModel>;

      const con1Str = this.conditionToString(combinedModel.condition1);
      const con2Str = this.conditionToString(combinedModel.condition2);

      return `${con1Str} ${combinedModel.operator} ${con2Str}`;
    } else {
      const condition = model as ISimpleFilterModel;
      return this.conditionToString(condition);
    }
  }

  protected isEventFromFloatingFilter(event: FilterChangedEvent): boolean {
    return event && event.afterFloatingFilter;
  }

  protected getLastType(): string {
    return this.lastType;
  }

  protected setLastTypeFromModel(model: ProvidedFilterModel): void {
    // if no model provided by the parent filter use default
    if (!model) {
      this.lastType = this.optionsFactory.getDefaultOption();
      return;
    }

    const isCombined = (model as any).operator;

    let condition: ISimpleFilterModel;

    if (isCombined) {
      const combinedModel = model as ICombinedSimpleModel<ISimpleFilterModel>;
      condition = combinedModel.condition1;
    } else {
      condition = model as ISimpleFilterModel;
    }

    this.lastType = condition.type;
  }

  protected canWeEditAfterModelFromParentFilter(
    model: ProvidedFilterModel,
  ): boolean {
    if (!model) {
      // if no model, then we can edit as long as the lastType is something we can edit, as this
      // is the type we will provide to the parent filter if the user decides to use the floating filter.
      return this.isTypeEditable(this.lastType);
    }

    // never allow editing if the filter is combined (ie has two parts)
    const isCombined = (model as any).operator;

    if (isCombined) {
      return false;
    }

    const simpleModel = model as ISimpleFilterModel;

    return this.isTypeEditable(simpleModel.type);
  }

  public init(params: IFloatingFilterParams): void {
    this.optionsFactory = new OptionsFactory();
    this.optionsFactory.init(
      params.filterParams as IScalarFilterParams,
      this.getDefaultFilterOptions(),
    );
    this.lastType = this.optionsFactory.getDefaultOption();

    // we are editable if:
    // 1) there is a type (user has configured filter wrong if not type)
    //  AND
    // 2) the default type is not 'in range'
    const editable = this.isTypeEditable(this.lastType);
    this.setEditable(editable);
  }

  private doesFilterHaveHiddenInput(filterType: string) {
    const customFilterOption = this.optionsFactory.getCustomOption(filterType);
    return customFilterOption && customFilterOption.hideFilterInput;
  }

  private isTypeEditable(type: string): boolean {
    return (
      !this.doesFilterHaveHiddenInput(type) &&
      type &&
      type !== SimpleFilter.IN_RANGE &&
      type !== SimpleFilter.EMPTY
    );
  }
}
