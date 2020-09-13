import { GridOptions } from './entities/gridOptions';
import { GridOptionsWrapper } from './gridOptionsWrapper';
import { SelectionController } from './selectionController';
import { ColumnApi } from './columnController/columnApi';
import { ColumnController } from './columnController/columnController';
import { RowRenderer } from './rendering/rowRenderer';
import { HeaderRootComp } from './headerRendering/headerRootComp';
import { FilterManager } from './filter/filterManager';
import { ValueService } from './valueService/valueService';
import { EventService } from './eventService';
import { GridPanel } from './gridPanel/gridPanel';
import { GridApi } from './gridApi';
import { GridCore } from './gridCore';
import { ColumnFactory } from './columnController/columnFactory';
import { DisplayedGroupCreator } from './columnController/displayedGroupCreator';
import { ExpressionService } from './valueService/expressionService';
import { TemplateService } from './templateService';
import { PopupService } from './widgets/popupService';
import { Logger, LoggerFactory } from './logger';
import { ColumnUtils } from './columnController/columnUtils';
import { AutoWidthCalculator } from './rendering/autoWidthCalculator';
import { HorizontalResizeService } from './headerRendering/horizontalResizeService';
import { ComponentMeta, Context, ContextParams } from './context/context';
import { StandardMenuFactory } from './headerRendering/standardMenu';
import { DragAndDropService } from './dragAndDrop/dragAndDropService';
import { DragService } from './dragAndDrop/dragService';
import { SortController } from './sortController';
import { FocusController } from './focusController';
import { MouseEventService } from './gridPanel/mouseEventService';
import { CellNavigationService } from './cellNavigationService';
import { Events, GridReadyEvent } from './events';
import { CellRendererFactory } from './rendering/cellRendererFactory';
import { ValueFormatterService } from './rendering/valueFormatterService';
import { AgCheckbox } from './widgets/agCheckbox';
import { AgRadioButton } from './widgets/agRadioButton';
import { VanillaFrameworkOverrides } from './vanillaFrameworkOverrides';
import { IFrameworkOverrides } from './interfaces/iFrameworkOverrides';
import { ScrollVisibleService } from './gridPanel/scrollVisibleService';
import { StylingService } from './styling/stylingService';
import { ColumnHoverService } from './rendering/columnHoverService';
import { ColumnAnimationService } from './rendering/columnAnimationService';
import { AutoGroupColService } from './columnController/autoGroupColService';
import { PaginationProxy } from './pagination/paginationProxy';
import { PaginationAutoPageSizeService } from './pagination/paginationAutoPageSizeService';
import { IRowModel } from './interfaces/iRowModel';
import { Constants } from './constants';
import { ValueCache } from './valueService/valueCache';
import { ChangeDetectionService } from './valueService/changeDetectionService';
import { AlignedGridsService } from './alignedGridsService';
import { UserComponentFactory } from './components/framework/userComponentFactory';
import {
  AgGridRegisteredComponentInput,
  UserComponentRegistry,
} from './components/framework/userComponentRegistry';
import { AgComponentUtils } from './components/framework/agComponentUtils';
import { ComponentMetadataProvider } from './components/framework/componentMetadataProvider';
import { Beans } from './rendering/beans';
import { Environment } from './environment';
import { AnimationFrameService } from './misc/animationFrameService';
import { NavigationService } from './gridPanel/navigationService';
import { MaxDivHeightScaler } from './rendering/maxDivHeightScaler';
import { SelectableService } from './rowNodes/selectableService';
import { AutoHeightCalculator } from './rendering/autoHeightCalculator';
import { PaginationComp } from './pagination/paginationComp';
import { ResizeObserverService } from './misc/resizeObserverService';
import { OverlayWrapperComponent } from './rendering/overlays/overlayWrapperComponent';
import { Module } from './interfaces/iModule';
import { AgGroupComponent } from './widgets/agGroupComponent';
import { AgDialog } from './widgets/agDialog';
import { AgPanel } from './widgets/agPanel';
import { AgInputTextField } from './widgets/agInputTextField';
import { AgInputTextArea } from './widgets/agInputTextArea';
import { AgSlider } from './widgets/agSlider';
import { AgColorPicker } from './widgets/agColorPicker';
import { AgInputNumberField } from './widgets/agInputNumberField';
import { AgInputRange } from './widgets/agInputRange';
import { AgSelect } from './widgets/agSelect';
import { AgAngleSelect } from './widgets/agAngleSelect';
import { AgToggleButton } from './widgets/agToggleButton';
import { DetailRowCompCache } from './rendering/detailRowCompCache';
import { RowPositionUtils } from './entities/rowPosition';
import { CellPositionUtils } from './entities/cellPosition';
import { PinnedRowModel } from './pinnedRowModel/pinnedRowModel';
import { IComponent } from './interfaces/iComponent';
import { ModuleRegistry } from './modules/moduleRegistry';
import { ModuleNames } from './modules/moduleNames';
import { UndoRedoService } from './undoRedo/undoRedoService';
import { Component } from './widgets/component';
import { AgStackComponentsRegistry } from './components/agStackComponentsRegistry';
import { HeaderPositionUtils } from './headerRendering/header/headerPosition';
import { HeaderNavigationService } from './headerRendering/header/headerNavigationService';
import { _ } from './utils';
import { logObjSer } from './utils/logUtils';

/** 主要是关于ag-grid module及第3方框架集成的配置 */
export interface GridParams {
  // used by Web Components
  globalEventListener?: Function;
  // these are used by ng1 only
  $scope?: any;
  $compile?: any;
  quickFilterOnScope?: any;
  // this allows the base frameworks (React, NG2, etc) to provide alternative cellRenderers and cellEditors
  frameworkOverrides?: IFrameworkOverrides;
  // bean instances to add to the context
  providedBeanInstances?: { [key: string]: any };
  // Alternative UI root class. Default is GridCore.
  rootComponent?: { new (): Component };
  // modules to be registered to ag-grid
  modules?: Module[];
}

/**
 * Grid数据及操作的入口。
 * 本文件全部是这一个class的内容。
 */
export class Grid {
  protected logger: Logger;

  /** 创建grid的上下文信息对象，会创建并保存各种bean */
  private context: Context;

  /** grid配置对象，主要包括properties、events和callbacks相关配置，与第3方框架无关 */
  private readonly gridOptions: GridOptions;

  /**
   * Grid初始化的任务：
   * 准备bean class及配置，
   * 创建基础bean对象，
   * 注册ag-grid内部使用的默认组件到注册表，
   * 创建gridCore对象并注入属性，
   * 将rowData计算处理成rowModel的结构，
   * 触发gridReady事件。
   *
   * @param eGridDiv grid最终添加到的DOM容器
   * @param gridOptions grid的各种配置
   * @param params ag-grid module相关配置
   */
  constructor(
    eGridDiv: HTMLElement,
    gridOptions: GridOptions,
    params?: GridParams,
  ) {
    if (!eGridDiv) {
      console.error('ag-Grid: no div element provided to the grid');
      return;
    }
    if (!gridOptions) {
      console.error('ag-Grid: no gridOptions provided to the grid');
      return;
    }

    const debug = !!gridOptions.debug;

    // console.log('==src-gridOptions, ', gridOptions);
    logObjSer('==src-gridOptions, ', gridOptions);
    this.gridOptions = gridOptions;

    // 获取注册的模块，如ClientSideRowModelModule
    const registeredModules: Module[] = this.getRegisteredModules(params);

    // 准备要创建bean的class，包含rowModel的class，存放到数组
    const beanClasses: any[] = this.createBeansList(registeredModules);
    // logObjSer('beanClasses, ', beanClasses);

    if (!beanClasses) {
      return; // happens when no row model found
    }

    // 创建一个包含配置信息及框架集成信息的对象，在context的bean容器中查找bean时，也会查找这里的bean
    const providedBeanInstances = this.createProvidedBeans(eGridDiv, params);

    const contextParams: ContextParams = {
      providedBeanInstances: providedBeanInstances,
      beanClasses: beanClasses,
      debug: debug,
    };

    this.logger = new Logger('ag-Grid', () => gridOptions.debug);
    const contextLogger = new Logger('Context', () => contextParams.debug);

    // 在context这里创建所有bean的实例
    this.context = new Context(contextParams, contextLogger);

    // 将注册模块暴露的的userComponents覆盖到agGridDefaults默认组件映射表
    this.registerModuleUserComponents(registeredModules);

    // 将grid内部默认使用的组件agStackComponents添加到agStackComponentsRegistry
    this.registerStackComponents(registeredModules);

    // 创建gridCore对象，包含grid数据、操作的重要类
    const gridCoreClass = (params && params.rootComponent) || GridCore;
    const gridCore = new gridCoreClass();

    // 给gridCore对象注入属性，会从context的bean容器中查找相关bean来初始化GridCore的属性
    // 执行gridCore的postConstruct钩子方法时会将grid的最外层dom元素及内部部分结构渲染到页面显示出来
    this.context.createBean(gridCore);

    // 计算表头结构，并将rowData计算处理成rowModel形式的数据结构
    this.setColumnsAndData();

    // 触发gridReady事件，默认要执行的事件集合为空
    this.dispatchGridReadyEvent(gridOptions);

    const isEnterprise = ModuleRegistry.isRegistered(
      ModuleNames.EnterpriseCoreModule,
    );
    this.logger.log(`initialised successfully, enterprise = ${isEnterprise}`);
  }

  /** 获取向ag-grid core中直接或间接注册的模块 */
  private getRegisteredModules(params: GridParams): Module[] {
    // 传参到Grid构造函数时注册的模块
    const passedViaConstructor: Module[] = params ? params.modules : null;
    // 通过ModuleRegistry注册的模块
    const registered = ModuleRegistry.getRegisteredModules();

    // 最后会返回所有module构成的数组
    const allModules: Module[] = [];
    const mapNames: { [name: string]: boolean } = {};

    // adds to list and removes duplicates
    function addModule(moduleBased: boolean, module: Module) {
      // 将直接或间接注册模块添加到allModules数组
      function addIndividualModule(module: Module) {
        if (!mapNames[module.moduleName]) {
          mapNames[module.moduleName] = true;
          allModules.push(module);
          ModuleRegistry.register(module, moduleBased);
        }
      }

      addIndividualModule(module);

      // 递归添加模块依赖的其他模块
      if (module.dependantModules) {
        module.dependantModules.forEach(addModule.bind(null, moduleBased));
      }
    }

    if (passedViaConstructor) {
      passedViaConstructor.forEach(addModule.bind(null, true));
    }

    if (registered) {
      registered.forEach(
        addModule.bind(null, !ModuleRegistry.isPackageBased()),
      );
    }

    return allModules;
  }

  /** 将注册模块暴露的的userComponents，覆盖到agGridDefaults默认组件映射表 */
  private registerModuleUserComponents(registeredModules: Module[]): void {
    const userComponentRegistry: UserComponentRegistry = this.context.getBean(
      'userComponentRegistry',
    );

    // 对于clientSideRowModel来说，这里为空数组
    const moduleUserComps: {
      componentName: string;
      componentClass: AgGridRegisteredComponentInput<IComponent<any>>;
    }[] = this.extractModuleEntity(registeredModules, (module) =>
      module.userComponents ? module.userComponents : [],
    );

    moduleUserComps.forEach((compMeta) => {
      userComponentRegistry.registerDefaultComponent(
        compMeta.componentName,
        compMeta.componentClass,
      );
    });
  }

  /** 将默认使用的AgXx组件和注册模块暴露的agStackComponents，都添加到agStackComponentsRegistry */
  private registerStackComponents(registeredModules: Module[]): void {
    // 获取ag-grid内部默认使用的以Ag开头的组件，以及module暴露的agStackComponents
    const agStackComponents = this.createAgStackComponentsList(
      registeredModules,
    );
    const agStackComponentsRegistry = this.context.getBean(
      'agStackComponentsRegistry',
    ) as AgStackComponentsRegistry;

    agStackComponentsRegistry.setupComponents(agStackComponents);
  }

  /** 返回一个映射表，包含gridOptions、eGridDiv、与框架集成相关的各种bean，用于注入属性时查找 */
  private createProvidedBeans(eGridDiv: HTMLElement, params: GridParams): any {
    let frameworkOverrides = params ? params.frameworkOverrides : null;
    if (_.missing(frameworkOverrides)) {
      frameworkOverrides = new VanillaFrameworkOverrides();
    }

    const seed = {
      gridOptions: this.gridOptions,
      eGridDiv: eGridDiv,
      $scope: params ? params.$scope : null,
      $compile: params ? params.$compile : null,
      quickFilterOnScope: params ? params.quickFilterOnScope : null,
      globalEventListener: params ? params.globalEventListener : null,
      frameworkOverrides: frameworkOverrides,
    };
    if (params && params.providedBeanInstances) {
      _.assign(seed, params.providedBeanInstances);
    }

    return seed;
  }

  /**
   * 指定ag-grid内部使用的默认组件，组件类名都以Ag开头，如input,button,toggle,dialog,overlay，
   * 最后加入module暴露的agStackComponents
   */
  private createAgStackComponentsList(registeredModules: Module[]): any[] {
    let components: ComponentMeta[] = [
      { componentName: 'AgCheckbox', componentClass: AgCheckbox },
      { componentName: 'AgRadioButton', componentClass: AgRadioButton },
      { componentName: 'AgToggleButton', componentClass: AgToggleButton },
      { componentName: 'AgInputTextField', componentClass: AgInputTextField },
      { componentName: 'AgInputTextArea', componentClass: AgInputTextArea },
      {
        componentName: 'AgInputNumberField',
        componentClass: AgInputNumberField,
      },
      { componentName: 'AgInputRange', componentClass: AgInputRange },
      { componentName: 'AgSelect', componentClass: AgSelect },
      { componentName: 'AgSlider', componentClass: AgSlider },
      { componentName: 'AgAngleSelect', componentClass: AgAngleSelect },
      { componentName: 'AgColorPicker', componentClass: AgColorPicker },
      { componentName: 'AgGridComp', componentClass: GridPanel },
      { componentName: 'AgHeaderRoot', componentClass: HeaderRootComp },
      { componentName: 'AgPagination', componentClass: PaginationComp },
      {
        componentName: 'AgOverlayWrapper',
        componentClass: OverlayWrapperComponent,
      },
      { componentName: 'AgGroupComponent', componentClass: AgGroupComponent },
      { componentName: 'AgPanel', componentClass: AgPanel },
      { componentName: 'AgDialog', componentClass: AgDialog },
    ];

    const moduleAgStackComps = this.extractModuleEntity(
      registeredModules,
      (module) => (module.agStackComponents ? module.agStackComponents : []),
    );

    components = components.concat(moduleAgStackComps);

    return components;
  }

  /** 准备要创建bean的class，包含rowModel的class */
  private createBeansList(registeredModules: Module[]): any[] {
    // 先从注册的module中获取要使用的rowModel
    const rowModelClass = this.getRowModelClass(registeredModules);
    if (!rowModelClass) {
      return undefined;
    }

    // beans should only contain SERVICES, it should NEVER contain COMPONENTS
    // 这里只列出service功能的bean，不包含component功能的bean
    const beans = [
      rowModelClass,
      PinnedRowModel,
      Beans,
      GridApi,
      ColumnApi,
      GridOptionsWrapper,
      RowPositionUtils,
      ColumnUtils,
      CellPositionUtils,
      HeaderPositionUtils,
      AgComponentUtils,
      AutoWidthCalculator,
      AgStackComponentsRegistry,
      UserComponentRegistry,
      UserComponentFactory,
      ComponentMetadataProvider,
      RowRenderer,
      ColumnFactory,
      ColumnController,
      CellRendererFactory,
      SelectionController,
      SortController,
      FilterManager,
      DisplayedGroupCreator,
      StandardMenuFactory,
      FocusController,
      MaxDivHeightScaler,
      AutoHeightCalculator,
      EventService,
      MouseEventService,
      PaginationAutoPageSizeService,
      ResizeObserverService,
      HorizontalResizeService,
      DragService,
      DragAndDropService,
      PopupService,
      HeaderNavigationService,
      ExpressionService,
      TemplateService,
      AlignedGridsService,
      NavigationService,
      CellNavigationService,
      ValueFormatterService,
      StylingService,
      ScrollVisibleService,
      ColumnHoverService,
      ColumnAnimationService,
      SelectableService,
      AutoGroupColService,
      ChangeDetectionService,
      AnimationFrameService,
      UndoRedoService,
      ValueService,
      ValueCache,
      DetailRowCompCache,
      Environment,
      PaginationProxy,
      LoggerFactory,
    ];

    // 再提取出注册的modules顶层暴露beans属性值，并加入bean class数组等待初始化
    const moduleBeans = this.extractModuleEntity(registeredModules, (module) =>
      module.beans ? module.beans : [],
    );

    // 对于ClientSideRowModel，这里会加入 Sort/Filter-Stage/Service,FlattenStage,ImmutableService
    beans.push(...moduleBeans);

    // check for duplicates, as different modules could include the same beans that
    // they depend on, eg ClientSideRowModel in enterprise, and ClientSideRowModel in community
    const beansNoDuplicates: any[] = [];
    beans.forEach((bean) => {
      if (beansNoDuplicates.indexOf(bean) < 0) {
        beansNoDuplicates.push(bean);
      }
    });

    // 返回包含不重复元素的bean数组
    return beansNoDuplicates;
  }

  /** 提取注册的modules暴露的信息 */
  private extractModuleEntity(
    moduleEntities: any[],
    extractor: (module: any) => any,
  ) {
    return [].concat(...moduleEntities.map(extractor));
  }

  /** 根据columnDefs计算表头结构，并将rowData计算处理成rowModel结构 */
  private setColumnsAndData(): void {
    const gridOptionsWrapper: GridOptionsWrapper = this.context.getBean(
      'gridOptionsWrapper',
    );
    const columnController: ColumnController = this.context.getBean(
      'columnController',
    );

    const columnDefs = gridOptionsWrapper.getColumnDefs();
    if (_.exists(columnDefs)) {
      // 根据columnDefs计算表头结构
      columnController.setColumnDefs(columnDefs, 'gridInitializing');
    }

    const rowModel: IRowModel = this.context.getBean('rowModel');

    // 将rowData处理成grid内部rowModel结构
    rowModel.start();
  }

  /** 通过eventService触发gridReady事件，在event对象中可以获取api和columnApi */
  private dispatchGridReadyEvent(gridOptions: GridOptions): void {
    const eventService: EventService = this.context.getBean('eventService');
    const readyEvent: GridReadyEvent = {
      type: Events.EVENT_GRID_READY,
      api: gridOptions.api,
      columnApi: gridOptions.columnApi,
    };
    eventService.dispatchEvent(readyEvent);
  }

  /** 从注册的所有modules中获取rowModel的class */
  private getRowModelClass(registeredModules: Module[]): any {
    let rowModelType = this.gridOptions.rowModelType;

    //TODO: temporary measure before 'enterprise' is completely removed (similar handling in gridOptionsWrapper is also required)
    if (rowModelType === 'enterprise') {
      console.warn(
        `ag-Grid: enterprise rowModel deprecated. Should now be called server side row model instead.`,
      );
      rowModelType = Constants.ROW_MODEL_TYPE_SERVER_SIDE;
    }

    if (rowModelType === 'normal') {
      console.warn(
        `ag-Grid: normal rowModel deprecated. Should now be called client side row model instead.`,
      );
      rowModelType = Constants.ROW_MODEL_TYPE_CLIENT_SIDE;
    }

    // default to client side，默认是 rowModelType = clientSide
    if (!rowModelType) {
      rowModelType = Constants.ROW_MODEL_TYPE_CLIENT_SIDE;
    }

    const rowModelClasses: { [name: string]: { new (): IRowModel } } = {};

    // 获取注册过的module的rowModels，并保存到rowModelClasses
    registeredModules.forEach((module) => {
      _.iterateObject(
        module.rowModels,
        (key: string, value: { new (): IRowModel }) => {
          rowModelClasses[key] = value;
        },
      );
    });

    const rowModelClass = rowModelClasses[rowModelType];
    if (_.exists(rowModelClass)) {
      return rowModelClass;
    } else {
      if (rowModelType === Constants.ROW_MODEL_TYPE_INFINITE) {
        console.error(
          `ag-Grid: Row Model "Infinite" not found. Please ensure the ${ModuleNames.InfiniteRowModelModule} is registered.';`,
        );
      }
      console.error(
        'ag-Grid: could not find matching row model for rowModelType ' +
          rowModelType,
      );
      if (rowModelType === Constants.ROW_MODEL_TYPE_VIEWPORT) {
        console.error(
          `ag-Grid: Row Model "Viewport" not found. Please ensure the ag-Grid Enterprise Module ${ModuleNames.ViewportRowModelModule} is registered.';`,
        );
      }
      if (rowModelType === Constants.ROW_MODEL_TYPE_SERVER_SIDE) {
        console.error(
          `ag-Grid: Row Model "Server Side" not found. Please ensure the ag-Grid Enterprise Module ${ModuleNames.ServerSideRowModelModule} is registered.';`,
        );
      }
      if (rowModelType === Constants.ROW_MODEL_TYPE_CLIENT_SIDE) {
        console.error(
          `ag-Grid: Row Model "Client Side" not found. Please ensure the ${ModuleNames.ClientSideRowModelModule} is registered.';`,
        );
      }
      return undefined;
    }
  }

  public destroy(): void {
    this.gridOptions.api.destroy();
  }
}
