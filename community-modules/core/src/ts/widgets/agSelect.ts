import { AgAbstractField } from './agAbstractField';
import { AgPickerField } from './agPickerField';
import { IAgLabel } from './agAbstractLabel';
import { ListOption, AgList } from './agList';
import { Autowired, PostConstruct } from '../context/context';
import { PopupService } from './popupService';
import { _ } from '../utils';

type AgSelectConfig = ListOption & IAgLabel;

export class AgSelect extends AgPickerField<HTMLSelectElement, string> {
  protected displayTag = 'div';
  protected className = 'ag-select';
  protected pickerIcon = 'smallDown';
  protected listComponent: AgList;
  private hideList: (event?: any) => void;

  @Autowired('popupService') private popupService: PopupService;

  constructor(config?: AgSelectConfig) {
    super();
    this.setTemplate(this.TEMPLATE.replace(/%displayField%/g, this.displayTag));
  }

  @PostConstruct
  public init(): void {
    this.listComponent = new AgList('select');
    this.getContext().createBean(this.listComponent);
    this.listComponent.setParentComponent(this);
    this.eWrapper.tabIndex = 0;

    this.listComponent.addManagedListener(
      this.listComponent,
      AgList.EVENT_ITEM_SELECTED,
      () => {
        if (this.hideList) {
          this.hideList();
        }
      },
    );

    this.listComponent.addManagedListener(
      this.listComponent,
      AgAbstractField.EVENT_CHANGED,
      () => {
        this.setValue(this.listComponent.getValue(), false, true);
        if (this.hideList) {
          this.hideList();
        }
      },
    );
  }

  protected showPicker() {
    const listGui = this.listComponent.getGui();
    const mouseWheelFunc = this.addManagedListener(
      document.body,
      'wheel',
      (e: MouseEvent) => {
        if (!listGui.contains(e.target as HTMLElement) && this.hideList) {
          this.hideList();
        }
      },
    );
    const focusOutFunc = this.addManagedListener(
      listGui,
      'focusout',
      (e: FocusEvent) => {
        if (
          !listGui.contains(e.relatedTarget as HTMLElement) &&
          this.hideList
        ) {
          this.hideList();
        }
      },
    );

    this.hideList = this.popupService.addPopup(true, listGui, true, () => {
      this.hideList = null;
      focusOutFunc();
      mouseWheelFunc();
      if (this.isAlive()) {
        this.getFocusableElement().focus();
      }
    });

    _.setElementWidth(listGui, _.getAbsoluteWidth(this.eWrapper));
    listGui.style.maxHeight =
      _.getInnerHeight(this.popupService.getPopupParent()) + 'px';

    listGui.style.position = 'absolute';

    this.popupService.positionPopupUnderComponent({
      type: 'ag-list',
      eventSource: this.eWrapper,
      ePopup: listGui,
      keepWithinBounds: true,
    });

    this.listComponent.refreshHighlighted();

    return this.listComponent;
  }

  public addOptions(options: ListOption[]): this {
    options.forEach((option) => this.addOption(option));

    return this;
  }

  public addOption(option: ListOption): this {
    this.listComponent.addOption(option);

    return this;
  }

  public setValue(value: string, silent?: boolean, fromPicker?: boolean): this {
    if (this.value === value) {
      return;
    }

    if (!fromPicker) {
      this.listComponent.setValue(value, true);
    }

    const newValue = this.listComponent.getValue();

    if (newValue === this.getValue()) {
      return;
    }

    this.eDisplayField.innerHTML = this.listComponent.getDisplayValue();

    return super.setValue(value, silent);
  }

  protected destroy(): void {
    if (this.hideList) {
      this.hideList();
    }

    this.getContext().destroyBean(this.listComponent);
    super.destroy();
  }
}
