import { Autowired, Bean, PostConstruct } from '../../context/context';
import { IComponent } from '../../interfaces/iComponent';
import { AgGridComponentFunctionInput } from './userComponentRegistry';
import { AgComponentUtils } from './agComponentUtils';
import { BeanStub } from '../../context/beanStub';

export interface ComponentMetadata {
  mandatoryMethodList: string[];
  optionalMethodList: string[];
  functionAdapter?: (callback: AgGridComponentFunctionInput) => {
    new (): IComponent<any>;
  };
}

/**
 * 组件元数据操作，只提供2个方法，retrieve，postConstruct
 */
@Bean('componentMetadataProvider')
export class ComponentMetadataProvider extends BeanStub {
  private componentMetaData: { [key: string]: ComponentMetadata };

  @Autowired('agComponentUtils')
  private agComponentUtils: AgComponentUtils;

  @PostConstruct
  public postConstruct() {
    this.componentMetaData = {
      dateComponent: {
        mandatoryMethodList: ['getDate', 'setDate'],
        optionalMethodList: ['afterGuiAttached', 'setInputPlaceholder'],
      },
      detailCellRenderer: {
        mandatoryMethodList: [],
        optionalMethodList: ['refresh'],
      },
      headerComponent: {
        mandatoryMethodList: [],
        optionalMethodList: [],
      },
      headerGroupComponent: {
        mandatoryMethodList: [],
        optionalMethodList: [],
      },
      loadingCellRenderer: {
        mandatoryMethodList: [],
        optionalMethodList: [],
      },
      loadingOverlayComponent: {
        mandatoryMethodList: [],
        optionalMethodList: [],
      },
      noRowsOverlayComponent: {
        mandatoryMethodList: [],
        optionalMethodList: [],
      },
      floatingFilterComponent: {
        mandatoryMethodList: ['onParentModelChanged'],
        optionalMethodList: ['afterGuiAttached'],
      },
      floatingFilterWrapperComponent: {
        mandatoryMethodList: [],
        optionalMethodList: [],
      },
      cellRenderer: {
        mandatoryMethodList: [],
        optionalMethodList: ['refresh', 'afterGuiAttached'],
        functionAdapter: this.agComponentUtils.adaptCellRendererFunction.bind(
          this.agComponentUtils,
        ),
      },
      cellEditor: {
        mandatoryMethodList: ['getValue'],
        optionalMethodList: [
          'isPopup',
          'isCancelBeforeStart',
          'isCancelAfterEnd',
          'getPopupPosition',
          'focusIn',
          'focusOut',
          'afterGuiAttached',
        ],
      },
      innerRenderer: {
        mandatoryMethodList: [],
        optionalMethodList: ['afterGuiAttached'],
        functionAdapter: this.agComponentUtils.adaptCellRendererFunction.bind(
          this.agComponentUtils,
        ),
      },
      fullWidthCellRenderer: {
        mandatoryMethodList: [],
        optionalMethodList: ['refresh', 'afterGuiAttached'],
        functionAdapter: this.agComponentUtils.adaptCellRendererFunction.bind(
          this.agComponentUtils,
        ),
      },
      pinnedRowCellRenderer: {
        mandatoryMethodList: [],
        optionalMethodList: ['refresh', 'afterGuiAttached'],
        functionAdapter: this.agComponentUtils.adaptCellRendererFunction.bind(
          this.agComponentUtils,
        ),
      },
      groupRowInnerRenderer: {
        mandatoryMethodList: [],
        optionalMethodList: ['afterGuiAttached'],
        functionAdapter: this.agComponentUtils.adaptCellRendererFunction.bind(
          this.agComponentUtils,
        ),
      },
      groupRowRenderer: {
        mandatoryMethodList: [],
        optionalMethodList: ['afterGuiAttached'],
        functionAdapter: this.agComponentUtils.adaptCellRendererFunction.bind(
          this.agComponentUtils,
        ),
      },
      filter: {
        mandatoryMethodList: [
          'isFilterActive',
          'doesFilterPass',
          'getModel',
          'setModel',
        ],
        optionalMethodList: [
          'afterGuiAttached',
          'onNewRowsLoaded',
          'getModelAsString',
          'onFloatingFilterChanged',
        ],
      },
      filterComponent: {
        mandatoryMethodList: [
          'isFilterActive',
          'doesFilterPass',
          'getModel',
          'setModel',
        ],
        optionalMethodList: [
          'afterGuiAttached',
          'onNewRowsLoaded',
          'getModelAsString',
          'onFloatingFilterChanged',
        ],
      },
      statusPanel: {
        mandatoryMethodList: [],
        optionalMethodList: ['afterGuiAttached'],
      },
      toolPanel: {
        mandatoryMethodList: [],
        optionalMethodList: ['refresh', 'afterGuiAttached'],
      },
      tooltipComponent: {
        mandatoryMethodList: [],
        optionalMethodList: [],
      },
    };
  }

  /**
   *
   */
  public retrieve(name: string): ComponentMetadata {
    return this.componentMetaData[name];
  }
}
