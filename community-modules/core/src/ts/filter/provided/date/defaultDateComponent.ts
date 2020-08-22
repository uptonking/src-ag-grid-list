import { AgInputTextField } from '../../../widgets/agInputTextField';
import { Component } from '../../../widgets/component';
import { IDateComp, IDateParams } from '../../../rendering/dateComponent';
import { RefSelector } from '../../../widgets/componentAnnotations';
import { serialiseDate, parseDateTimeFromString } from '../../../utils/date';
import {
  isBrowserChrome,
  isBrowserFirefox,
  isBrowserIE,
} from '../../../utils/browser';

export class DefaultDateComponent extends Component implements IDateComp {
  @RefSelector('eDateInput') private eDateInput: AgInputTextField;

  private listener: () => void;

  constructor() {
    super(/* html */ `
            <div class="ag-filter-filter">
                <ag-input-text-field class="ag-date-filter" ref="eDateInput"></ag-input-text-field>
            </div>`);
  }

  // this is a user component, and IComponent has "public destroy()" as part of the interface.
  // so we need to override destroy() just to make the method public.
  public destroy(): void {
    super.destroy();
  }

  public init(params: IDateParams): void {
    if (this.shouldUseBrowserDatePicker(params)) {
      if (isBrowserIE()) {
        console.warn(
          'ag-grid: browserDatePicker is specified to true, but it is not supported in IE 11, reverting to plain text date picker',
        );
      } else {
        (this.eDateInput.getInputElement() as HTMLInputElement).type = 'date';
      }
    }

    this.listener = params.onDateChanged;

    this.addManagedListener(this.eDateInput.getInputElement(), 'input', (e) => {
      if (e.target !== document.activeElement) {
        return;
      }

      this.listener();
    });
  }

  public getDate(): Date {
    return parseDateTimeFromString(this.eDateInput.getValue());
  }

  public setDate(date: Date): void {
    this.eDateInput.setValue(serialiseDate(date, false));
  }

  public setInputPlaceholder(placeholder: string): void {
    this.eDateInput.setInputPlaceholder(placeholder);
  }

  private shouldUseBrowserDatePicker(params: IDateParams): boolean {
    if (params.filterParams && params.filterParams.browserDatePicker != null) {
      return params.filterParams.browserDatePicker;
    } else {
      return isBrowserChrome() || isBrowserFirefox();
    }
  }
}
