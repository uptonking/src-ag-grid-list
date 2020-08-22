import { AgColorPanel } from './agColorPanel';
import { AgDialog } from './agDialog';
import { IAgLabel } from './agAbstractLabel';
import { AgPickerField } from './agPickerField';
import { AgAbstractField } from './agAbstractField';
import { _ } from '../utils';

interface ColorPickerConfig extends IAgLabel {
  color: string;
}

export class AgColorPicker extends AgPickerField<HTMLElement, string> {
  protected displayTag = 'div';
  protected className = 'ag-color-picker';
  protected pickerIcon = 'colorPicker';

  constructor(config?: ColorPickerConfig) {
    super();
    this.setTemplate(this.TEMPLATE.replace(/%displayField%/g, this.displayTag));

    if (config && config.color) {
      this.value = config.color;
    }
  }

  protected postConstruct() {
    super.postConstruct();

    if (this.value) {
      this.setValue(this.value);
    }
  }

  protected showPicker() {
    const eGuiRect = this.getGui().getBoundingClientRect();
    const colorDialog = new AgDialog({
      closable: false,
      modal: true,
      hideTitleBar: true,
      minWidth: 190,
      width: 190,
      height: 250,
      x: eGuiRect.right - 190,
      y: eGuiRect.top - 250,
    });
    this.createBean(colorDialog);

    _.addCssClass(colorDialog.getGui(), 'ag-color-dialog');

    const colorPanel = new AgColorPanel({
      picker: this,
    });
    this.createBean(colorPanel);

    colorPanel.addDestroyFunc(() => {
      if (colorDialog.isAlive()) {
        this.destroyBean(colorDialog);
      }
    });

    colorDialog.setParentComponent(this);
    colorDialog.setBodyComponent(colorPanel);
    colorPanel.setValue(this.getValue());

    colorDialog.addDestroyFunc(() => {
      const wasDestroying = this.isDestroyingPicker;

      // here we check if the picker was already being
      // destroyed to avoid a stackoverflow
      if (!wasDestroying) {
        this.isDestroyingPicker = true;
        if (colorPanel.isAlive()) {
          this.destroyBean(colorPanel);
        }
      } else {
        this.isDestroyingPicker = false;
      }

      if (this.isAlive()) {
        this.getFocusableElement().focus();
      }
    });

    return colorDialog;
  }

  public setValue(color: string): this {
    if (this.value === color) {
      return this;
    }

    this.value = color;
    this.eDisplayField.style.backgroundColor = color;
    this.dispatchEvent({ type: AgAbstractField.EVENT_CHANGED });

    return this;
  }

  public getValue(): string {
    return this.value;
  }
}
