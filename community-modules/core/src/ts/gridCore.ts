import { GridOptions } from './entities/gridOptions';
import { GridOptionsWrapper } from './gridOptionsWrapper';
import { ColumnApi } from './columnController/columnApi';
import { RowRenderer } from './rendering/rowRenderer';
import { FilterManager } from './filter/filterManager';
import { GridPanel } from './gridPanel/gridPanel';
import { Logger, LoggerFactory } from './logger';
import { PopupService } from './widgets/popupService';
import { Autowired, Optional } from './context/context';
import { IRowModel } from './interfaces/iRowModel';
import { Component } from './widgets/component';
import { IClipboardService } from './interfaces/iClipboardService';
import { GridApi } from './gridApi';
import { ISideBar } from './interfaces/iSideBar';
import { RefSelector } from './widgets/componentAnnotations';
import { Events, GridSizeChangedEvent } from './events';
import { ResizeObserverService } from './misc/resizeObserverService';
import { SideBarDef, SideBarDefParser } from './entities/sideBar';
import { IToolPanel } from './interfaces/iToolPanel';
import { ModuleNames } from './modules/moduleNames';
import { ModuleRegistry } from './modules/moduleRegistry';
import { ManagedFocusComponent } from './widgets/managedFocusComponent';
import { ColumnController } from './columnController/columnController';
import { ColumnGroup } from './entities/columnGroup';
import { Column } from './entities/column';
import { _ } from './utils';

/**
 * 包含grid配置、数据、操作、渲染的核心ui组件Component类，包括页面布局模块的判断，以及事件监听处理，
 * GridCore的属性字段通过在Grid类的构造函数中手动依赖注入进行初始化
 */
export class GridCore extends ManagedFocusComponent {
  @Autowired('gridOptions') private gridOptions: GridOptions;
  @Autowired('gridOptionsWrapper')
  private gridOptionsWrapper: GridOptionsWrapper;
  @Autowired('rowModel') private rowModel: IRowModel;
  @Autowired('resizeObserverService')
  private resizeObserverService: ResizeObserverService;

  @Autowired('rowRenderer') private rowRenderer: RowRenderer;
  @Autowired('filterManager') private filterManager: FilterManager;

  @Autowired('eGridDiv') private eGridDiv: HTMLElement;
  @Autowired('$scope') private $scope: any;
  @Autowired('quickFilterOnScope') private quickFilterOnScope: string;
  @Autowired('popupService') private popupService: PopupService;
  @Autowired('columnController') private columnController: ColumnController;
  @Autowired('loggerFactory') loggerFactory: LoggerFactory;

  @Autowired('columnApi') private columnApi: ColumnApi;
  @Autowired('gridApi') private gridApi: GridApi;

  @Optional('clipboardService') private clipboardService: IClipboardService;

  @RefSelector('gridPanel') private gridPanel: GridPanel;
  @RefSelector('sideBar') private sideBarComp: ISideBar & Component;
  @RefSelector('rootWrapperBody') private eRootWrapperBody: HTMLElement;

  private logger: Logger;
  private doingVirtualPaging: boolean;

  /** 在Grid构造函数中创建gridCore对象后，在注入属性时作为钩子函数调用，
   * 会将grid最外层的dom元素渲染到grid容器
   */
  protected postConstruct(): void {
    this.logger = this.loggerFactory.create('GridCore');

    // 创建ag-grid最外层dom元素及部分内部结构对应的字符串
    const template = this.createTemplate();
    console.log('==template=str, ', template);
    // 将grid结构字符串创建成dom对象
    this.setTemplate(template);

    // register with services that need grid core，设置各自对象中的gridCore属性
    [
      this.gridApi,
      this.rowRenderer,
      this.popupService,
      this.focusController,
    ].forEach((service) => service.registerGridCore(this));

    if (ModuleRegistry.isRegistered(ModuleNames.ClipboardModule)) {
      this.clipboardService.registerGridCore(this);
    }

    // 设置本组件dom元素的layout样式名
    this.gridOptionsWrapper.addLayoutElement(this.getGui());

    // 将本对象代表grid的dom元素对象追加到要渲染的容器dom元素内，此时就会渲染到页面，但只有grid结构dom没有各行数据元素的dom
    this.eGridDiv.appendChild(this.getGui());
    this.addDestroyFunc(() => {
      this.eGridDiv.removeChild(this.getGui());
    });

    // if using angular, watch for quickFilter changes
    if (this.$scope) {
      const quickFilterUnregisterFn = this.$scope.$watch(
        this.quickFilterOnScope,
        (newFilter: any) => this.filterManager.setQuickFilter(newFilter),
      );
      this.addDestroyFunc(quickFilterUnregisterFn);
    }

    // important to set rtl before doLayout, as setting the RTL class impacts the scroll position,
    // which doLayout indirectly depends on
    this.addRtlSupport();

    this.logger.log('ready');

    // 设置eRootWrapperBody的dom元素的layout样式名
    this.gridOptionsWrapper.addLayoutElement(this.eRootWrapperBody);

    const unsubscribeFromResize = this.resizeObserverService.observeResize(
      this.eGridDiv,
      this.onGridSizeChanged.bind(this),
    );
    this.addDestroyFunc(() => unsubscribeFromResize());

    // 获取本对象代表grid的dom元素
    const eGui = this.getGui();

    // 添加keyboardFocus事件
    this.addManagedListener(
      this.eventService,
      Events.EVENT_KEYBOARD_FOCUS,
      () => {
        _.addCssClass(eGui, 'ag-keyboard-focus');
      },
    );

    // 添加mouseFocus事件
    this.addManagedListener(this.eventService, Events.EVENT_MOUSE_FOCUS, () => {
      _.removeCssClass(eGui, 'ag-keyboard-focus');
    });

    super.postConstruct();
  }

  public getFocusableElement(): HTMLElement {
    return this.eRootWrapperBody;
  }

  /**
   * 创建并返回ag-grid最外层的dom元素及内部结构，
   * 最外层是div-ag-root-wrapper，内部可以包含dropZones、sideBar、statusBar、watermark
   */
  private createTemplate(): string {
    const sideBarModuleLoaded = ModuleRegistry.isRegistered(
      ModuleNames.SideBarModule,
    );
    const statusBarModuleLoaded = ModuleRegistry.isRegistered(
      ModuleNames.StatusBarModule,
    );
    const rowGroupingLoaded = ModuleRegistry.isRegistered(
      ModuleNames.RowGroupingModule,
    );
    const enterpriseCoreLoaded = ModuleRegistry.isRegistered(
      ModuleNames.EnterpriseCoreModule,
    );

    const dropZones = rowGroupingLoaded
      ? '<ag-grid-header-drop-zones></ag-grid-header-drop-zones>'
      : '';
    const sideBar = sideBarModuleLoaded
      ? '<ag-side-bar ref="sideBar"></ag-side-bar>'
      : '';
    const statusBar = statusBarModuleLoaded
      ? '<ag-status-bar ref="statusBar"></ag-status-bar>'
      : '';
    const watermark = enterpriseCoreLoaded
      ? '<ag-watermark></ag-watermark>'
      : '';

    // ag-grid-comp元素后面会用来查找并创建成组件对象
    const template = `<div ref="eRootWrapper" class="ag-root-wrapper">
                ${dropZones}
                <div ref="rootWrapperBody" class="ag-root-wrapper-body" >
                    <ag-grid-comp ref="gridPanel"></ag-grid-comp>
                    ${sideBar}
                </div>
                ${statusBar}
                <ag-pagination></ag-pagination>
                ${watermark}
            </div>`;

    return template;
  }

  protected isFocusableContainer(): boolean {
    return true;
  }

  protected getFocusableContainers(): HTMLElement[] {
    const focusableContainers = [this.gridPanel.getGui()];

    if (this.sideBarComp) {
      focusableContainers.push(this.sideBarComp.getGui());
    }

    return focusableContainers.filter((el) => _.isVisible(el));
  }

  public focusNextInnerContainer(backwards: boolean): boolean {
    const focusableContainers = this.getFocusableContainers();
    const idxWithFocus = _.findIndex(focusableContainers, (container) =>
      container.contains(document.activeElement),
    );
    const nextIdx = idxWithFocus + (backwards ? -1 : 1);

    if (nextIdx < 0 || nextIdx >= focusableContainers.length) {
      return false;
    }

    if (nextIdx === 0) {
      return this.focusGridHeader();
    }

    return this.focusController.focusFirstFocusableElement(
      focusableContainers[nextIdx],
    );
  }

  public focusInnerElement(fromBottom?: boolean): boolean {
    const focusableContainers = this.getFocusableContainers();
    if (fromBottom && focusableContainers.length > 1) {
      return this.focusController.focusFirstFocusableElement(
        _.last(focusableContainers),
      );
    }

    return this.focusGridHeader();
  }

  private focusGridHeader(): boolean {
    let firstColumn:
      | Column
      | ColumnGroup = this.columnController.getAllDisplayedColumns()[0];
    if (!firstColumn) {
      return false;
    }

    if (firstColumn.getParent()) {
      firstColumn = this.columnController.getColumnGroupAtLevel(firstColumn, 0);
    }

    this.focusController.focusHeaderPosition({
      headerRowIndex: 0,
      column: firstColumn,
    });

    return true;
  }

  /**
   * 触发gridSizeChanged事件
   */
  private onGridSizeChanged(): void {
    const event: GridSizeChangedEvent = {
      type: Events.EVENT_GRID_SIZE_CHANGED,
      api: this.gridApi,
      columnApi: this.columnApi,
      clientWidth: this.eGridDiv.clientWidth,
      clientHeight: this.eGridDiv.clientHeight,
    };
    this.eventService.dispatchEvent(event);
  }

  private addRtlSupport(): void {
    const cssClass = this.gridOptionsWrapper.isEnableRtl()
      ? 'ag-rtl'
      : 'ag-ltr';
    _.addCssClass(this.getGui(), cssClass);
  }

  public getRootGui(): HTMLElement {
    return this.getGui();
  }

  public isSideBarVisible(): boolean {
    if (!this.sideBarComp) {
      return false;
    }

    return this.sideBarComp.isDisplayed();
  }

  public setSideBarVisible(show: boolean) {
    if (!this.sideBarComp) {
      if (show) {
        console.warn('ag-Grid: sideBar is not loaded');
      }
      return;
    }

    this.sideBarComp.setDisplayed(show);
  }

  public setSideBarPosition(position: 'left' | 'right') {
    if (!this.sideBarComp) {
      console.warn('ag-Grid: sideBar is not loaded');
      return;
    }
    this.sideBarComp.setSideBarPosition(position);
  }

  public closeToolPanel() {
    if (!this.sideBarComp) {
      console.warn(
        'ag-Grid: toolPanel is only available in ag-Grid Enterprise',
      );
      return;
    }

    this.sideBarComp.close();
  }

  public getSideBar(): SideBarDef {
    return this.gridOptions.sideBar as SideBarDef;
  }

  public getToolPanelInstance(key: string): IToolPanel | undefined {
    if (!this.sideBarComp) {
      console.warn(
        'ag-Grid: toolPanel is only available in ag-Grid Enterprise',
      );
      return;
    }
    return this.sideBarComp.getToolPanelInstance(key);
  }

  public refreshSideBar() {
    if (this.sideBarComp) {
      this.sideBarComp.refresh();
    }
  }

  public setSideBar(def: SideBarDef | string | boolean): void {
    if (!this.sideBarComp) {
      return;
    }
    this.eRootWrapperBody.removeChild(this.sideBarComp.getGui());
    this.gridOptions.sideBar = SideBarDefParser.parse(def);
    this.sideBarComp.reset();
    this.eRootWrapperBody.appendChild(this.sideBarComp.getGui());
  }

  public getOpenedToolPanel(): string {
    if (!this.sideBarComp) {
      return null;
    }

    return this.sideBarComp.openedItem();
  }

  public openToolPanel(key: string) {
    if (!this.sideBarComp) {
      console.warn(
        'ag-Grid: toolPanel is only available in ag-Grid Enterprise',
      );
      return;
    }

    this.sideBarComp.openToolPanel(key);
  }

  public isToolPanelShowing() {
    return this.sideBarComp.isToolPanelShowing();
  }

  protected destroy(): void {
    this.logger.log('Grid DOM removed');
    super.destroy();
  }

  // Valid values for position are bottom, middle and top
  public ensureNodeVisible(comparator: any, position: string | null = null) {
    if (this.doingVirtualPaging) {
      throw new Error(
        'Cannot use ensureNodeVisible when doing virtual paging, as we cannot check rows that are not in memory',
      );
    }
    // look for the node index we want to display
    const rowCount = this.rowModel.getRowCount();
    const comparatorIsAFunction = typeof comparator === 'function';
    let indexToSelect = -1;
    // go through all the nodes, find the one we want to show
    for (let i = 0; i < rowCount; i++) {
      const node = this.rowModel.getRow(i);
      if (comparatorIsAFunction) {
        if (comparator(node)) {
          indexToSelect = i;
          break;
        }
      } else {
        // check object equality against node and data
        if (comparator === node || comparator === node.data) {
          indexToSelect = i;
          break;
        }
      }
    }
    if (indexToSelect >= 0) {
      this.gridPanel.ensureIndexVisible(indexToSelect, position);
    }
  }
}
