import { AgAbstractLabel } from './agAbstractLabel';
import {
  setDisabled,
  addOrRemoveCssClass,
  setFixedWidth,
  addCssClass,
} from '../utils/dom';

export type FieldElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;
export abstract class AgAbstractField<T> extends AgAbstractLabel {
  public static EVENT_CHANGED = 'valueChange';

  protected abstract displayTag: string;
  protected abstract className: string;

  protected value: T;
  protected disabled: boolean = false;

  protected postConstruct(): void {
    super.postConstruct();

    addCssClass(this.getGui(), this.className);
  }

  public onValueChange(callbackFn: (newValue: T) => void) {
    this.addManagedListener(this, AgAbstractField.EVENT_CHANGED, () =>
      callbackFn(this.getValue()),
    );

    return this;
  }

  public getWidth(): number {
    return this.getGui().clientWidth;
  }

  public setWidth(width: number): this {
    setFixedWidth(this.getGui(), width);

    return this;
  }

  public getValue(): T {
    return this.value;
  }

  public setValue(value: T, silent?: boolean): this {
    if (this.value === value) {
      return this;
    }

    this.value = value;

    if (!silent) {
      this.dispatchEvent({ type: AgAbstractField.EVENT_CHANGED });
    }

    return this;
  }

  public setDisabled(disabled: boolean): this {
    disabled = !!disabled;

    const element = this.getGui();

    setDisabled(element, disabled);
    addOrRemoveCssClass(element, 'ag-disabled', disabled);

    this.disabled = disabled;

    return this;
  }

  public isDisabled(): boolean {
    return !!this.disabled;
  }
}
