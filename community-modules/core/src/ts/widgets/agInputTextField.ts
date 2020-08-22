import { AgAbstractInputField, IInputField } from './agAbstractInputField';
import { _ } from '../utils';

export class AgInputTextField extends AgAbstractInputField<
  HTMLInputElement,
  string
> {
  protected className = 'ag-text-field';
  protected displayTag = 'input';
  protected inputType = 'text';

  protected config: IInputField;

  constructor(config?: IInputField) {
    super();
    this.setTemplate(this.TEMPLATE.replace(/%displayField%/g, this.displayTag));

    if (config) {
      this.config = config;
    }
  }

  public setValue(value: string, silent?: boolean): this {
    const ret = super.setValue(value, silent);

    if (this.eInput.value !== value) {
      this.eInput.value = _.exists(value) ? value : '';
    }

    return ret;
  }
}
