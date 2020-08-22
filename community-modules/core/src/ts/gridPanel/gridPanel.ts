import { GridOptionsWrapper } from '../gridOptionsWrapper';
import { ColumnApi } from '../columnController/columnApi';
import { RowRenderer } from '../rendering/rowRenderer';
import { Autowired, Optional, PostConstruct } from '../context/context';
import {
  BodyHeightChangedEvent,
  BodyScrollEvent,
  CellKeyDownEvent,
  CellKeyPressEvent,
  Events,
} from '../events';
import { DragListenerParams, DragService } from '../dragAndDrop/dragService';
import { IRangeController } from '../interfaces/iRangeController';
import { Constants } from '../constants';
import { MouseEventService } from './mouseEventService';
import { IClipboardService } from '../interfaces/iClipboardService';
import { IContextMenuFactory } from '../interfaces/iContextMenuFactory';
import {
  ScrollVisibleService,
  SetScrollsVisibleParams,
} from './scrollVisibleService';
import { Column } from '../entities/column';
import { RowContainerComponent } from '../rendering/rowContainerComponent';
import { RowNode } from '../entities/rowNode';
import { PaginationProxy } from '../pagination/paginationProxy';
import { PaginationAutoPageSizeService } from '../pagination/paginationAutoPageSizeService';
import { AlignedGridsService } from '../alignedGridsService';
import { GridApi } from '../gridApi';
import { AnimationFrameService } from '../misc/animationFrameService';
import { RowComp } from '../rendering/rowComp';
import { NavigationService } from './navigationService';
import { CellComp } from '../rendering/cellComp';
import { ValueService } from '../valueService/valueService';
import { LongTapEvent, TouchListener } from '../widgets/touchListener';
import { DragAndDropService } from '../dragAndDrop/dragAndDropService';
import { RowDragFeature } from './rowDragFeature';
import { MaxDivHeightScaler } from '../rendering/maxDivHeightScaler';
import { OverlayWrapperComponent } from '../rendering/overlays/overlayWrapperComponent';
import { Component } from '../widgets/component';
import { AutoHeightCalculator } from '../rendering/autoHeightCalculator';
import { ColumnAnimationService } from '../rendering/columnAnimationService';
import { AutoWidthCalculator } from '../rendering/autoWidthCalculator';
import { Beans } from '../rendering/beans';
import { RefSelector } from '../widgets/componentAnnotations';
import { HeaderRootComp } from '../headerRendering/headerRootComp';
import { ResizeObserverService } from '../misc/resizeObserverService';
import { PinnedRowModel } from '../pinnedRowModel/pinnedRowModel';
import { ModuleRegistry } from '../modules/moduleRegistry';
import { ModuleNames } from '../modules/moduleNames';
import { UndoRedoService } from '../undoRedo/undoRedoService';
import { ColumnController } from '../columnController/columnController';
import { HeaderNavigationService } from '../headerRendering/header/headerNavigationService';
import { _ } from '../utils';

// in the html below, it is important that there are no white space between some of the divs, as if there is white space,
// it won't render correctly in safari, as safari renders white space as a gap
const GRID_PANEL_NORMAL_TEMPLATE =
  /* html */
  `<div class="ag-root ag-unselectable" role="grid" unselectable="on">
        <ag-header-root ref="headerRoot" unselectable="on"></ag-header-root>
        <div class="ag-floating-top" ref="eTop" role="presentation" unselectable="on">
            <div class="ag-pinned-left-floating-top" ref="eLeftTop" role="presentation" unselectable="on"></div>
            <div class="ag-floating-top-viewport" ref="eTopViewport" role="presentation" unselectable="on">
                <div class="ag-floating-top-container" ref="eTopContainer" role="presentation" unselectable="on"></div>
            </div>
            <div class="ag-pinned-right-floating-top" ref="eRightTop" role="presentation" unselectable="on"></div>
            <div class="ag-floating-top-full-width-container" ref="eTopFullWidthContainer" role="presentation" unselectable="on"></div>
        </div>
        <div class="ag-body-viewport" ref="eBodyViewport" role="presentation">
            <div class="ag-pinned-left-cols-container" ref="eLeftContainer" role="presentation" unselectable="on"></div>
            <div class="ag-center-cols-clipper" ref="eCenterColsClipper" role="presentation" unselectable="on">
                <div class="ag-center-cols-viewport" ref="eCenterViewport" role="presentation">
                    <div class="ag-center-cols-container" ref="eCenterContainer" role="rowgroup" unselectable="on"></div>
                </div>
            </div>
            <div class="ag-pinned-right-cols-container" ref="eRightContainer" role="presentation" unselectable="on"></div>
            <div class="ag-full-width-container" ref="eFullWidthContainer" role="presentation" unselectable="on"></div>
        </div>
        <div class="ag-floating-bottom" ref="eBottom" role="presentation" unselectable="on">
            <div class="ag-pinned-left-floating-bottom" ref="eLeftBottom" role="presentation" unselectable="on"></div>
            <div class="ag-floating-bottom-viewport" ref="eBottomViewport" role="presentation" unselectable="on">
                <div class="ag-floating-bottom-container" ref="eBottomContainer" role="presentation" unselectable="on"></div>
            </div>
            <div class="ag-pinned-right-floating-bottom" ref="eRightBottom" role="presentation" unselectable="on"></div>
            <div class="ag-floating-bottom-full-width-container" ref="eBottomFullWidthContainer" role="presentation" unselectable="on"></div>
        </div>
        <div class="ag-body-horizontal-scroll" ref="eHorizontalScrollBody" aria-hidden="true">
            <div class="ag-horizontal-left-spacer" ref="eHorizontalLeftSpacer"></div>
            <div class="ag-body-horizontal-scroll-viewport" ref="eBodyHorizontalScrollViewport">
                <div class="ag-body-horizontal-scroll-container" ref="eBodyHorizontalScrollContainer"></div>
            </div>
            <div class="ag-horizontal-right-spacer" ref="eHorizontalRightSpacer"></div>
        </div>
        <ag-overlay-wrapper ref="overlayWrapper"></ag-overlay-wrapper>
    </div>`;

export type RowContainerComponentNames =
  | 'fullWidth'
  | 'body'
  | 'pinnedLeft'
  | 'pinnedRight'
  | 'floatingTop'
  | 'floatingTopPinnedLeft'
  | 'floatingTopPinnedRight'
  | 'floatingTopFullWidth'
  | 'floatingBottom'
  | 'floatingBottomPinnedLeft'
  | 'floatingBottomPinnedRight'
  | 'floatingBottomFullWidth';

export type RowContainerComponents = {
  [K in RowContainerComponentNames]: RowContainerComponent;
};

export class GridPanel extends Component {
  @Autowired('alignedGridsService')
  private alignedGridsService: AlignedGridsService;
  @Autowired('gridOptionsWrapper')
  private gridOptionsWrapper: GridOptionsWrapper;
  @Autowired('rowRenderer') private rowRenderer: RowRenderer;
  @Autowired('pinnedRowModel') private pinnedRowModel: PinnedRowModel;
  @Autowired('animationFrameService')
  private animationFrameService: AnimationFrameService;
  @Autowired('navigationService') private navigationService: NavigationService;
  @Autowired('autoHeightCalculator')
  private autoHeightCalculator: AutoHeightCalculator;
  @Autowired('columnAnimationService')
  private columnAnimationService: ColumnAnimationService;
  @Autowired('autoWidthCalculator')
  private autoWidthCalculator: AutoWidthCalculator;
  @Autowired('paginationAutoPageSizeService')
  private paginationAutoPageSizeService: PaginationAutoPageSizeService;
  @Autowired('beans') private beans: Beans;
  @Autowired('paginationProxy') private paginationProxy: PaginationProxy;
  @Autowired('columnApi') private columnApi: ColumnApi;
  @Autowired('gridApi') private gridApi: GridApi;
  @Autowired('dragService') private dragService: DragService;
  @Autowired('mouseEventService') private mouseEventService: MouseEventService;
  @Autowired('$scope') private $scope: any;
  @Autowired('scrollVisibleService')
  private scrollVisibleService: ScrollVisibleService;
  @Autowired('valueService') private valueService: ValueService;
  @Autowired('dragAndDropService')
  private dragAndDropService: DragAndDropService;
  @Autowired('maxDivHeightScaler') private heightScaler: MaxDivHeightScaler;
  @Autowired('resizeObserverService')
  private resizeObserverService: ResizeObserverService;
  @Autowired('undoRedoService') private undoRedoService: UndoRedoService;
  @Autowired('columnController') private columnController: ColumnController;
  @Autowired('headerNavigationService')
  private headerNavigationService: HeaderNavigationService;

  @Optional('rangeController') private rangeController: IRangeController;
  @Optional('contextMenuFactory')
  private contextMenuFactory: IContextMenuFactory;
  @Optional('clipboardService') private clipboardService: IClipboardService;

  @RefSelector('eBodyViewport') private eBodyViewport: HTMLElement;
  @RefSelector('eCenterContainer') private eCenterContainer: HTMLElement;
  @RefSelector('eCenterViewport') private eCenterViewport: HTMLElement;
  @RefSelector('eLeftContainer') private eLeftContainer: HTMLElement;
  @RefSelector('eRightContainer') private eRightContainer: HTMLElement;
  @RefSelector('eCenterColsClipper') private eCenterColsClipper: HTMLElement;

  // fake horizontal scroller
  @RefSelector('eHorizontalScrollBody')
  private eHorizontalScrollBody: HTMLElement;
  @RefSelector('eHorizontalLeftSpacer')
  private eHorizontalLeftSpacer: HTMLElement;
  @RefSelector('eHorizontalRightSpacer')
  private eHorizontalRightSpacer: HTMLElement;
  @RefSelector('eBodyHorizontalScrollViewport')
  private eBodyHorizontalScrollViewport: HTMLElement;
  @RefSelector('eBodyHorizontalScrollContainer')
  private eBodyHorizontalScrollContainer: HTMLElement;

  @RefSelector('eFullWidthContainer') private eFullWidthContainer: HTMLElement;

  @RefSelector('eTop') private eTop: HTMLElement;
  @RefSelector('eLeftTop') private eLeftTop: HTMLElement;
  @RefSelector('eRightTop') private eRightTop: HTMLElement;
  @RefSelector('eTopContainer') private eTopContainer: HTMLElement;
  @RefSelector('eTopViewport') private eTopViewport: HTMLElement;
  @RefSelector('eTopFullWidthContainer')
  private eTopFullWidthContainer: HTMLElement;

  @RefSelector('eBottom') private eBottom: HTMLElement;
  @RefSelector('eLeftBottom') private eLeftBottom: HTMLElement;
  @RefSelector('eRightBottom') private eRightBottom: HTMLElement;
  @RefSelector('eBottomContainer') private eBottomContainer: HTMLElement;
  @RefSelector('eBottomViewport') private eBottomViewport: HTMLElement;
  @RefSelector('eBottomFullWidthContainer')
  private eBottomFullWidthContainer: HTMLElement;

  @RefSelector('headerRoot') headerRootComp: HeaderRootComp;
  @RefSelector('overlayWrapper')
  private overlayWrapper: OverlayWrapperComponent;

  private rowContainerComponents: RowContainerComponents;
  private eAllCellContainers: HTMLElement[];

  private scrollLeft = -1;
  private scrollTop = -1;

  private lastHorizontalScrollElement: HTMLElement | undefined | null;

  private readonly resetLastHorizontalScrollElementDebounced: () => void;

  private bodyHeight: number;

  // properties we use a lot, so keep reference
  private enableRtl: boolean;
  private scrollWidth: number;

  // used to track if pinned panels are showing, so we can turn them off if not
  private pinningRight: boolean;
  private pinningLeft: boolean;

  private printLayout: boolean;

  private rowDragFeature: RowDragFeature;

  constructor() {
    super(GRID_PANEL_NORMAL_TEMPLATE);
    this.resetLastHorizontalScrollElementDebounced = _.debounce(
      this.resetLastHorizontalScrollElement.bind(this),
      500,
    );
  }

  public getVScrollPosition(): { top: number; bottom: number } {
    const result = {
      top: this.eBodyViewport.scrollTop,
      bottom: this.eBodyViewport.scrollTop + this.eBodyViewport.offsetHeight,
    };
    return result;
  }

  public getHScrollPosition(): { left: number; right: number } {
    const result = {
      left: this.eCenterViewport.scrollLeft,
      right: this.eCenterViewport.scrollLeft + this.eCenterViewport.offsetWidth,
    };
    return result;
  }

  private onRowDataChanged(): void {
    this.showOrHideOverlay();
  }

  private showOrHideOverlay(): void {
    const isEmpty = this.paginationProxy.isEmpty();
    const isSuppressNoRowsOverlay = this.gridOptionsWrapper.isSuppressNoRowsOverlay();
    const method =
      isEmpty && !isSuppressNoRowsOverlay ? 'showNoRowsOverlay' : 'hideOverlay';

    this[method]();
  }

  private onNewColumnsLoaded(): void {
    // hide overlay if columns and rows exist, this can happen if columns are loaded after data.
    // this problem exists before of the race condition between the services (column controller in this case)
    // and the view (grid panel). if the model beans were all initialised first, and then the view beans second,
    // this race condition would not happen.
    if (
      this.beans.columnController.isReady() &&
      !this.paginationProxy.isEmpty()
    ) {
      this.hideOverlay();
    }
  }

  @PostConstruct
  private init() {
    this.scrollWidth = this.gridOptionsWrapper.getScrollbarWidth();
    this.enableRtl = this.gridOptionsWrapper.isEnableRtl();
    this.printLayout =
      this.gridOptionsWrapper.getDomLayout() === Constants.DOM_LAYOUT_PRINT;

    // these elements have different CSS when layout changes
    this.gridOptionsWrapper.addLayoutElement(this.getGui());
    this.gridOptionsWrapper.addLayoutElement(this.eBodyViewport);

    this.suppressScrollOnFloatingRow();
    this.setupRowAnimationCssClass();
    this.buildRowContainerComponents();

    this.addEventListeners();
    this.addDragListeners();

    this.addScrollListener();

    if (
      this.gridOptionsWrapper.isRowModelDefault() &&
      !this.gridOptionsWrapper.getRowData()
    ) {
      this.showLoadingOverlay();
    }
    this.setCellTextSelection(this.gridOptionsWrapper.isEnableCellTextSelect());

    this.setPinnedContainerSize();
    this.setHeaderAndFloatingHeights();
    this.disableBrowserDragging();
    this.addMouseListeners();
    this.addKeyboardEvents();
    this.addBodyViewportListener();
    this.addStopEditingWhenGridLosesFocus();
    this.mockContextMenuForIPad();
    this.addRowDragListener();

    if (this.$scope) {
      this.addAngularApplyCheck();
    }

    this.onDisplayedColumnsWidthChanged();

    this.gridApi.registerGridComp(this);
    this.alignedGridsService.registerGridComp(this);
    this.headerRootComp.registerGridComp(this);
    this.navigationService.registerGridComp(this);
    this.headerNavigationService.registerGridComp(this);
    this.heightScaler.registerGridComp(this);
    this.autoHeightCalculator.registerGridComp(this);
    this.columnAnimationService.registerGridComp(this);
    this.autoWidthCalculator.registerGridComp(this);
    this.paginationAutoPageSizeService.registerGridComp(this);
    this.mouseEventService.registerGridComp(this);
    this.beans.registerGridComp(this);
    this.rowRenderer.registerGridComp(this);

    if (this.rangeController) {
      this.rangeController.registerGridComp(this);
    }

    [this.eCenterViewport, this.eBodyViewport].forEach((viewport) => {
      const unsubscribeFromResize = this.resizeObserverService.observeResize(
        viewport,
        this.onCenterViewportResized.bind(this),
      );
      this.addDestroyFunc(() => unsubscribeFromResize());
    });

    [this.eTop, this.eBodyViewport, this.eBottom].forEach((element) => {
      this.addManagedListener(element, 'focusin', () => {
        _.addCssClass(element, 'ag-has-focus');
      });

      this.addManagedListener(element, 'focusout', (e: FocusEvent) => {
        if (!element.contains(e.relatedTarget as HTMLElement)) {
          _.removeCssClass(element, 'ag-has-focus');
        }
      });
    });
  }

  private onDomLayoutChanged(): void {
    const newPrintLayout =
      this.gridOptionsWrapper.getDomLayout() === Constants.DOM_LAYOUT_PRINT;

    if (this.printLayout !== newPrintLayout) {
      this.printLayout = newPrintLayout;
      this.setWidthsOfContainers();
      // pinned containers are always hidden for print layout
      this.setPinnedContainerSize();
    }
  }

  private onCenterViewportResized(): void {
    if (_.isVisible(this.eCenterViewport)) {
      this.checkViewportAndScrolls();
      this.beans.columnController.refreshFlexedColumns(this.getCenterWidth());
    } else {
      this.bodyHeight = 0;
    }
  }

  // used by ColumnAnimationService
  public setColumnMovingCss(moving: boolean): void {
    this.addOrRemoveCssClass('ag-column-moving', moving);
  }

  public setCellTextSelection(selectable: boolean = false): void {
    [this.eTop, this.eBodyViewport, this.eBottom].forEach((ct) =>
      _.addOrRemoveCssClass(ct, 'ag-selectable', selectable),
    );
  }

  private addRowDragListener(): void {
    this.rowDragFeature = this.createManagedBean(
      new RowDragFeature(this.eBodyViewport, this),
    );
    this.dragAndDropService.addDropTarget(this.rowDragFeature);
  }

  public getRowDragFeature(): RowDragFeature {
    return this.rowDragFeature;
  }

  private addStopEditingWhenGridLosesFocus(): void {
    if (!this.gridOptionsWrapper.isStopEditingWhenGridLosesFocus()) {
      return;
    }

    const viewports = [this.eBodyViewport, this.eBottom, this.eTop];

    const focusOutListener = (event: FocusEvent): void => {
      // this is the element the focus is moving to
      const elementWithFocus = event.relatedTarget as HTMLElement;

      if (_.getTabIndex(elementWithFocus) === null) {
        this.rowRenderer.stopEditing();
        return;
      }

      let clickInsideGrid = viewports.some((viewport) =>
        viewport.contains(elementWithFocus),
      );

      if (!clickInsideGrid) {
        const popupService = this.beans.popupService;

        clickInsideGrid =
          popupService
            .getActivePopups()
            .some((popup) => popup.contains(elementWithFocus)) ||
          popupService.isElementWithinCustomPopup(elementWithFocus);
      }

      if (!clickInsideGrid) {
        this.rowRenderer.stopEditing();
      }
    };

    viewports.forEach((viewport) =>
      this.addManagedListener(viewport, 'focusout', focusOutListener),
    );
  }

  private addAngularApplyCheck(): void {
    // this makes sure if we queue up requests, we only execute oe
    let applyTriggered = false;

    const listener = () => {
      // only need to do one apply at a time
      if (applyTriggered) {
        return;
      }
      applyTriggered = true; // mark 'need apply' to true
      window.setTimeout(() => {
        applyTriggered = false;
        this.$scope.$apply();
      }, 0);
    };

    // these are the events we need to do an apply after - these are the ones that can end up
    // with columns added or removed
    this.addManagedListener(
      this.eventService,
      Events.EVENT_DISPLAYED_COLUMNS_CHANGED,
      listener,
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_VIRTUAL_COLUMNS_CHANGED,
      listener,
    );
  }

  // if we do not do this, then the user can select a pic in the grid (eg an image in a custom cell renderer)
  // and then that will start the browser native drag n' drop, which messes up with our own drag and drop.
  private disableBrowserDragging(): void {
    this.addGuiEventListener('dragstart', (event: MouseEvent) => {
      if (event.target instanceof HTMLImageElement) {
        event.preventDefault();
        return false;
      }
    });
  }

  private addEventListeners(): void {
    this.addManagedListener(
      this.eventService,
      Events.EVENT_DISPLAYED_COLUMNS_CHANGED,
      this.onDisplayedColumnsChanged.bind(this),
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_DISPLAYED_COLUMNS_WIDTH_CHANGED,
      this.onDisplayedColumnsWidthChanged.bind(this),
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_PINNED_ROW_DATA_CHANGED,
      this.setHeaderAndFloatingHeights.bind(this),
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_ROW_DATA_CHANGED,
      this.onRowDataChanged.bind(this),
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_ROW_DATA_UPDATED,
      this.onRowDataChanged.bind(this),
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_NEW_COLUMNS_LOADED,
      this.onNewColumnsLoaded.bind(this),
    );

    this.addManagedListener(
      this.gridOptionsWrapper,
      GridOptionsWrapper.PROP_HEADER_HEIGHT,
      this.setHeaderAndFloatingHeights.bind(this),
    );
    this.addManagedListener(
      this.gridOptionsWrapper,
      GridOptionsWrapper.PROP_PIVOT_HEADER_HEIGHT,
      this.setHeaderAndFloatingHeights.bind(this),
    );
    this.addManagedListener(
      this.gridOptionsWrapper,
      GridOptionsWrapper.PROP_GROUP_HEADER_HEIGHT,
      this.setHeaderAndFloatingHeights.bind(this),
    );
    this.addManagedListener(
      this.gridOptionsWrapper,
      GridOptionsWrapper.PROP_PIVOT_GROUP_HEADER_HEIGHT,
      this.setHeaderAndFloatingHeights.bind(this),
    );
    this.addManagedListener(
      this.gridOptionsWrapper,
      GridOptionsWrapper.PROP_FLOATING_FILTERS_HEIGHT,
      this.setHeaderAndFloatingHeights.bind(this),
    );
    this.addManagedListener(
      this.gridOptionsWrapper,
      GridOptionsWrapper.PROP_DOM_LAYOUT,
      this.onDomLayoutChanged.bind(this),
    );
  }

  private addDragListeners(): void {
    if (
      !this.gridOptionsWrapper.isEnableRangeSelection() || // no range selection if no property
      _.missing(this.rangeController) // no range selection if not enterprise version
    ) {
      return;
    }

    const containers = [
      this.eLeftContainer,
      this.eRightContainer,
      this.eCenterContainer,
      this.eTop,
      this.eBottom,
    ];

    containers.forEach((container) => {
      const params: DragListenerParams = {
        eElement: container,
        onDragStart: this.rangeController.onDragStart.bind(
          this.rangeController,
        ),
        onDragStop: this.rangeController.onDragStop.bind(this.rangeController),
        onDragging: this.rangeController.onDragging.bind(this.rangeController),
      };

      this.dragService.addDragSource(params);
      this.addDestroyFunc(() => this.dragService.removeDragSource(params));
    });
  }

  private addMouseListeners(): void {
    const eventNames = [
      'click',
      'mousedown',
      'dblclick',
      'contextmenu',
      'mouseover',
      'mouseout',
    ];

    eventNames.forEach((eventName) => {
      const listener = this.processMouseEvent.bind(this, eventName);
      this.eAllCellContainers.forEach((container) =>
        this.addManagedListener(container, eventName, listener),
      );
    });
  }

  private addKeyboardEvents(): void {
    const eventNames = ['keydown', 'keypress'];

    eventNames.forEach((eventName) => {
      const listener = this.processKeyboardEvent.bind(this, eventName);
      this.eAllCellContainers.forEach((container) => {
        this.addManagedListener(container, eventName, listener);
      });
    });
  }

  private addBodyViewportListener(): void {
    // we want to listen for clicks directly on the eBodyViewport, so the user has a way of showing
    // the context menu if no rows or columns are displayed, or user simply clicks outside of a cell
    const listener = (mouseEvent: MouseEvent) => {
      const target = _.getTarget(mouseEvent);
      if (target === this.eBodyViewport || target === this.eCenterViewport) {
        // show it
        this.onContextMenu(mouseEvent, null, null, null, null);
        this.preventDefaultOnContextMenu(mouseEvent);
      }
    };

    this.addManagedListener(this.eBodyViewport, 'contextmenu', listener);
  }

  // + rangeController - used to know when to scroll when user is dragging outside the
  // main viewport while doing a range selection
  public getBodyClientRect(): ClientRect {
    if (!this.eBodyViewport) {
      return;
    }

    return this.eBodyViewport.getBoundingClientRect();
  }

  private getRowForEvent(event: Event): RowComp {
    let sourceElement = _.getTarget(event);

    while (sourceElement) {
      const renderedRow = this.gridOptionsWrapper.getDomData(
        sourceElement,
        RowComp.DOM_DATA_KEY_RENDERED_ROW,
      );
      if (renderedRow) {
        return renderedRow;
      }

      sourceElement = sourceElement.parentElement;
    }

    return null;
  }

  private processKeyboardEvent(
    eventName: string,
    keyboardEvent: KeyboardEvent,
  ): void {
    const cellComp = _.getCellCompForEvent(
      this.gridOptionsWrapper,
      keyboardEvent,
    );

    if (!cellComp || keyboardEvent.defaultPrevented) {
      return;
    }

    const rowNode = cellComp.getRenderedRow().getRowNode();
    const column = cellComp.getColumn();
    const editing = cellComp.isEditing();

    const gridProcessingAllowed = !_.isUserSuppressingKeyboardEvent(
      this.gridOptionsWrapper,
      keyboardEvent,
      rowNode,
      column,
      editing,
    );

    if (gridProcessingAllowed) {
      switch (eventName) {
        case 'keydown':
          // first see if it's a scroll key, page up / down, home / end etc
          const wasScrollKey =
            !editing &&
            this.navigationService.handlePageScrollingKey(keyboardEvent);

          // if not a scroll key, then we pass onto cell
          if (!wasScrollKey) {
            cellComp.onKeyDown(keyboardEvent);
          }

          // perform clipboard and undo / redo operations
          this.doGridOperations(keyboardEvent, cellComp);

          break;
        case 'keypress':
          cellComp.onKeyPress(keyboardEvent);
          break;
      }
    }

    if (eventName === 'keydown') {
      const cellKeyDownEvent: CellKeyDownEvent = cellComp.createEvent(
        keyboardEvent,
        Events.EVENT_CELL_KEY_DOWN,
      );
      this.beans.eventService.dispatchEvent(cellKeyDownEvent);
    }

    if (eventName === 'keypress') {
      const cellKeyPressEvent: CellKeyPressEvent = cellComp.createEvent(
        keyboardEvent,
        Events.EVENT_CELL_KEY_PRESS,
      );
      this.beans.eventService.dispatchEvent(cellKeyPressEvent);
    }
  }

  private doGridOperations(
    keyboardEvent: KeyboardEvent,
    cellComp: CellComp,
  ): void {
    // check if ctrl or meta key pressed
    if (!keyboardEvent.ctrlKey && !keyboardEvent.metaKey) {
      return;
    }

    // if the cell the event came from is editing, then we do not
    // want to do the default shortcut keys, otherwise the editor
    // (eg a text field) would not be able to do the normal cut/copy/paste
    if (cellComp.isEditing()) {
      return;
    }

    // for copy / paste, we don't want to execute when the event
    // was from a child grid (happens in master detail)
    if (!this.mouseEventService.isEventFromThisGrid(keyboardEvent)) {
      return;
    }

    switch (keyboardEvent.which) {
      case Constants.KEY_A:
        return this.onCtrlAndA(keyboardEvent);
      case Constants.KEY_C:
        return this.onCtrlAndC(keyboardEvent);
      case Constants.KEY_V:
        return this.onCtrlAndV();
      case Constants.KEY_D:
        return this.onCtrlAndD(keyboardEvent);
      case Constants.KEY_Z:
        return keyboardEvent.shiftKey
          ? this.undoRedoService.redo()
          : this.undoRedoService.undo();
      case Constants.KEY_Y:
        return this.undoRedoService.redo();
    }
  }

  // gets called by rowRenderer when new data loaded, as it will want to scroll to the top
  public scrollToTop(): void {
    this.eBodyViewport.scrollTop = 0;
  }

  private processMouseEvent(eventName: string, mouseEvent: MouseEvent): void {
    if (
      !this.mouseEventService.isEventFromThisGrid(mouseEvent) ||
      _.isStopPropagationForAgGrid(mouseEvent)
    ) {
      return;
    }

    const rowComp = this.getRowForEvent(mouseEvent);
    const cellComp = this.mouseEventService.getRenderedCellForEvent(mouseEvent);

    if (eventName === 'contextmenu') {
      this.preventDefaultOnContextMenu(mouseEvent);
      this.handleContextMenuMouseEvent(mouseEvent, null, rowComp, cellComp);
    } else {
      if (cellComp) {
        cellComp.onMouseEvent(eventName, mouseEvent);
      }
      if (rowComp) {
        rowComp.onMouseEvent(eventName, mouseEvent);
      }
    }
  }

  private mockContextMenuForIPad(): void {
    // we do NOT want this when not in iPad, otherwise we will be doing
    if (!_.isIOSUserAgent()) {
      return;
    }

    this.eAllCellContainers.forEach((container) => {
      const touchListener = new TouchListener(container);
      const longTapListener = (event: LongTapEvent) => {
        const rowComp = this.getRowForEvent(event.touchEvent);
        const cellComp = this.mouseEventService.getRenderedCellForEvent(
          event.touchEvent,
        );

        this.handleContextMenuMouseEvent(
          null,
          event.touchEvent,
          rowComp,
          cellComp,
        );
      };

      this.addManagedListener(
        touchListener,
        TouchListener.EVENT_LONG_TAP,
        longTapListener,
      );
      this.addDestroyFunc(() => touchListener.destroy());
    });
  }

  private handleContextMenuMouseEvent(
    mouseEvent: MouseEvent,
    touchEvent: TouchEvent,
    rowComp: RowComp,
    cellComp: CellComp,
  ) {
    const rowNode = rowComp ? rowComp.getRowNode() : null;
    const column = cellComp ? cellComp.getColumn() : null;
    let value = null;

    if (column) {
      const event = mouseEvent ? mouseEvent : touchEvent;
      cellComp.dispatchCellContextMenuEvent(event);
      value = this.valueService.getValue(column, rowNode);
    }

    this.onContextMenu(mouseEvent, touchEvent, rowNode, column, value);
  }

  private onContextMenu(
    mouseEvent: MouseEvent,
    touchEvent: TouchEvent,
    rowNode: RowNode,
    column: Column,
    value: any,
  ): void {
    // to allow us to debug in chrome, we ignore the event if ctrl is pressed.
    // not everyone wants this, so first 'if' below allows to turn this hack off.
    if (!this.gridOptionsWrapper.isAllowContextMenuWithControlKey()) {
      // then do the check
      if (mouseEvent && (mouseEvent.ctrlKey || mouseEvent.metaKey)) {
        return;
      }
    }

    if (
      this.contextMenuFactory &&
      !this.gridOptionsWrapper.isSuppressContextMenu()
    ) {
      const eventOrTouch: MouseEvent | Touch = mouseEvent
        ? mouseEvent
        : touchEvent.touches[0];
      if (
        this.contextMenuFactory.showMenu(rowNode, column, value, eventOrTouch)
      ) {
        const event = mouseEvent ? mouseEvent : touchEvent;
        event.preventDefault();
      }
    }
  }

  private preventDefaultOnContextMenu(mouseEvent: MouseEvent): void {
    // if we don't do this, then middle click will never result in a 'click' event, as 'mousedown'
    // will be consumed by the browser to mean 'scroll' (as you can scroll with the middle mouse
    // button in the browser). so this property allows the user to receive middle button clicks if
    // they want.
    const { gridOptionsWrapper } = this;
    const { which } = mouseEvent;

    if (
      gridOptionsWrapper.isPreventDefaultOnContextMenu() ||
      (gridOptionsWrapper.isSuppressMiddleClickScrolls() && which === 2)
    ) {
      mouseEvent.preventDefault();
    }
  }

  private onCtrlAndA(event: KeyboardEvent): void {
    const { beans, pinnedRowModel, paginationProxy, rangeController } = this;
    const { PINNED_BOTTOM, PINNED_TOP } = Constants;

    if (rangeController && paginationProxy.isRowsToRender()) {
      const [isEmptyPinnedTop, isEmptyPinnedBottom] = [
        pinnedRowModel.isEmpty(PINNED_TOP),
        pinnedRowModel.isEmpty(PINNED_BOTTOM),
      ];

      const floatingStart = isEmptyPinnedTop ? null : PINNED_TOP;
      let floatingEnd: string;
      let rowEnd: number;

      if (isEmptyPinnedBottom) {
        floatingEnd = null;
        rowEnd = this.paginationProxy.getRowCount() - 1;
      } else {
        floatingEnd = PINNED_BOTTOM;
        rowEnd = pinnedRowModel.getPinnedBottomRowData().length - 1;
      }

      const allDisplayedColumns = beans.columnController.getAllDisplayedColumns();
      if (_.missingOrEmpty(allDisplayedColumns)) {
        return;
      }

      rangeController.setCellRange({
        rowStartIndex: 0,
        rowStartPinned: floatingStart,
        rowEndIndex: rowEnd,
        rowEndPinned: floatingEnd,
        columnStart: allDisplayedColumns[0],
        columnEnd: _.last(allDisplayedColumns),
      });
    }
    event.preventDefault();
  }

  private onCtrlAndC(event: KeyboardEvent): void {
    if (
      !this.clipboardService ||
      this.gridOptionsWrapper.isEnableCellTextSelection()
    ) {
      return;
    }

    this.clipboardService.copyToClipboard();
    event.preventDefault();
  }

  private onCtrlAndV(): void {
    if (
      ModuleRegistry.isRegistered(ModuleNames.ClipboardModule) &&
      !this.gridOptionsWrapper.isSuppressClipboardPaste()
    ) {
      this.clipboardService.pasteFromClipboard();
    }
  }

  private onCtrlAndD(event: KeyboardEvent): void {
    if (
      ModuleRegistry.isRegistered(ModuleNames.ClipboardModule) &&
      !this.gridOptionsWrapper.isSuppressClipboardPaste()
    ) {
      this.clipboardService.copyRangeDown();
    }
    event.preventDefault();
  }

  // Valid values for position are bottom, middle and top
  // position should be {'top','middle','bottom', or undefined/null}.
  // if undefined/null, then the grid will to the minimal amount of scrolling,
  // eg if grid needs to scroll up, it scrolls until row is on top,
  //    if grid needs to scroll down, it scrolls until row is on bottom,
  //    if row is already in view, grid does not scroll
  public ensureIndexVisible(index: any, position?: string | null) {
    // if for print or auto height, everything is always visible
    if (this.printLayout) {
      return;
    }

    const rowCount = this.paginationProxy.getRowCount();

    if (typeof index !== 'number' || index < 0 || index >= rowCount) {
      console.warn('invalid row index for ensureIndexVisible: ' + index);
      return;
    }

    this.paginationProxy.goToPageWithIndex(index);

    const rowNode = this.paginationProxy.getRow(index);
    let rowGotShiftedDuringOperation: boolean;

    do {
      const startingRowTop = rowNode.rowTop;
      const startingRowHeight = rowNode.rowHeight;

      const paginationOffset = this.paginationProxy.getPixelOffset();
      const rowTopPixel = rowNode.rowTop - paginationOffset;
      const rowBottomPixel = rowTopPixel + rowNode.rowHeight;

      const scrollPosition = this.getVScrollPosition();
      const heightOffset = this.heightScaler.getOffset();

      const vScrollTop = scrollPosition.top + heightOffset;
      const vScrollBottom = scrollPosition.bottom + heightOffset;

      const viewportHeight = vScrollBottom - vScrollTop;

      // work out the pixels for top, middle and bottom up front,
      // make the if/else below easier to read
      const pxTop = this.heightScaler.getScrollPositionForPixel(rowTopPixel);
      const pxBottom = this.heightScaler.getScrollPositionForPixel(
        rowBottomPixel - viewportHeight,
      );
      // make sure if middle, the row is not outside the top of the grid
      const pxMiddle = Math.min((pxTop + pxBottom) / 2, rowTopPixel);

      const rowBelowViewport = vScrollTop > rowTopPixel;
      const rowAboveViewport = vScrollBottom < rowBottomPixel;

      let newScrollPosition: number = null;

      if (position === 'top') {
        newScrollPosition = pxTop;
      } else if (position === 'bottom') {
        newScrollPosition = pxBottom;
      } else if (position === 'middle') {
        newScrollPosition = pxMiddle;
      } else if (rowBelowViewport) {
        // if row is before, scroll up with row at top
        newScrollPosition = pxTop;
      } else if (rowAboveViewport) {
        // if row is below, scroll down with row at bottom
        newScrollPosition = pxBottom;
      }

      if (newScrollPosition !== null) {
        this.eBodyViewport.scrollTop = newScrollPosition;
        this.rowRenderer.redrawAfterScroll();
      }

      // the row can get shifted if during the rendering (during rowRenderer.redrawAfterScroll()),
      // the height of a row changes due to lazy calculation of row heights when using
      // colDef.autoHeight or gridOptions.getRowHeight.
      // if row was shifted, then the position we scrolled to is incorrect.
      rowGotShiftedDuringOperation =
        startingRowTop !== rowNode.rowTop ||
        startingRowHeight !== rowNode.rowHeight;
    } while (rowGotShiftedDuringOperation);

    // so when we return back to user, the cells have rendered
    this.animationFrameService.flushAllFrames();
  }

  // + moveColumnController
  public getCenterWidth(): number {
    return this.eCenterViewport.clientWidth;
  }

  public isVerticalScrollShowing(): boolean {
    const isAlwaysShowVerticalScroll = this.gridOptionsWrapper.isAlwaysShowVerticalScroll();
    _.addOrRemoveCssClass(
      this.eBodyViewport,
      'ag-force-vertical-scroll',
      isAlwaysShowVerticalScroll,
    );
    return (
      isAlwaysShowVerticalScroll ||
      _.isVerticalScrollShowing(this.eBodyViewport)
    );
  }

  public isHorizontalScrollShowing(): boolean {
    return _.isHorizontalScrollShowing(this.eCenterViewport);
  }

  // gets called every time the viewport size changes. we use this to check visibility of scrollbars
  // in the grid panel, and also to check size and position of viewport for row and column virtualisation.
  public checkViewportAndScrolls(): void {
    // results in updating anything that depends on scroll showing
    this.updateScrollVisibleService();

    // fires event if height changes, used by PaginationService, HeightScalerService, RowRenderer
    this.checkBodyHeight();

    // check for virtual columns for ColumnController
    this.onHorizontalViewportChanged();

    this.setPinnedContainerSize();

    // this is to cater for AG-3274, where grid is removed from the dom and then inserted back in again.
    // (which happens with some implementations of tabbing). this can result in horizontal scroll getting
    // reset back to the left, however no scroll event is fired. so we need to get header to also scroll
    // back to the left to be kept in sync.
    // adding and removing the grid from the DOM both resets the scroll position and
    // triggers a resize event, so notify listeners if the scroll position has changed
    if (this.scrollLeft !== this.getCenterViewportScrollLeft()) {
      this.onBodyHorizontalScroll(this.eCenterViewport);
    }
  }

  private updateScrollVisibleService(): void {
    // because of column animation (which takes 200ms), we have to do this twice.
    // eg if user removes cols anywhere except at the RHS, then the cols on the RHS
    // will animate to the left to fill the gap. this animation means just after
    // the cols are removed, the remaining cols are still in the original location
    // at the start of the animation, so pre animation the H scrollbar is still needed,
    // but post animation it is not.
    this.updateScrollVisibleServiceImpl();
    setTimeout(this.updateScrollVisibleServiceImpl.bind(this), 500);
  }

  private updateScrollVisibleServiceImpl(): void {
    const params: SetScrollsVisibleParams = {
      horizontalScrollShowing: false,
      verticalScrollShowing: false,
    };

    params.verticalScrollShowing = this.isVerticalScrollShowing();
    params.horizontalScrollShowing = this.isHorizontalScrollShowing();

    this.scrollVisibleService.setScrollsVisible(params);

    this.setHorizontalScrollVisible(params.horizontalScrollShowing);
    this.setVerticalScrollPaddingVisible(params.verticalScrollShowing);
  }

  private setHorizontalScrollVisible(visible: boolean): void {
    const isSuppressHorizontalScroll = this.gridOptionsWrapper.isSuppressHorizontalScroll();
    const scrollSize = visible
      ? this.gridOptionsWrapper.getScrollbarWidth() || 0
      : 0;
    const scrollContainerSize = !isSuppressHorizontalScroll ? scrollSize : 0;
    const addIEPadding = _.isBrowserIE() && visible;

    this.eCenterViewport.style.height = `calc(100% + ${scrollSize}px)`;
    _.setFixedHeight(this.eHorizontalScrollBody, scrollContainerSize);
    // we have to add an extra pixel to the scroller viewport on IE because
    // if the container has the same size as the scrollbar, the scroll button won't work
    _.setFixedHeight(
      this.eBodyHorizontalScrollViewport,
      scrollContainerSize + (addIEPadding ? 1 : 0),
    );
    _.setFixedHeight(this.eBodyHorizontalScrollContainer, scrollContainerSize);
  }

  private setVerticalScrollPaddingVisible(show: boolean): void {
    const scroller = show ? 'scroll' : 'hidden';

    this.eTop.style.overflowY = this.eBottom.style.overflowY = scroller;
    this.setFakeHScrollSpacerWidths();
  }

  public updateRowCount(): void {
    const headerCount = this.headerNavigationService.getHeaderRowCount();
    const rowCount = this.paginationProxy.getRowCount();
    const total = (headerCount + rowCount).toString();

    this.getGui().setAttribute('aria-rowcount', total);
  }

  private updateColumnCount(): void {
    const columns = this.columnController.getAllDisplayedColumns();

    this.getGui().setAttribute('aria-colcount', columns.length.toString());
  }

  public ensureColumnVisible(key: any): void {
    const column = this.columnController.getGridColumn(key);

    if (!column) {
      return;
    }

    if (column.isPinned()) {
      console.warn(
        'calling ensureIndexVisible on a ' +
          column.getPinned() +
          " pinned column doesn't make sense for column " +
          column.getColId(),
      );
      return;
    }

    if (!this.columnController.isColumnDisplayed(column)) {
      console.warn('column is not currently visible');
      return;
    }

    const colLeftPixel = column.getLeft();
    const colRightPixel = colLeftPixel + column.getActualWidth();

    const viewportWidth = this.eCenterViewport.clientWidth;
    const scrollPosition = this.getCenterViewportScrollLeft();

    const bodyWidth = this.columnController.getBodyContainerWidth();

    let viewportLeftPixel: number;
    let viewportRightPixel: number;

    // the logic of working out left and right viewport px is both here and in the ColumnController,
    // need to refactor it out to one place
    if (this.enableRtl) {
      viewportLeftPixel = bodyWidth - scrollPosition - viewportWidth;
      viewportRightPixel = bodyWidth - scrollPosition;
    } else {
      viewportLeftPixel = scrollPosition;
      viewportRightPixel = viewportWidth + scrollPosition;
    }

    const viewportScrolledPastCol = viewportLeftPixel > colLeftPixel;
    const viewportScrolledBeforeCol = viewportRightPixel < colRightPixel;
    const colToSmallForViewport = viewportWidth < column.getActualWidth();

    const alignColToLeft = viewportScrolledPastCol || colToSmallForViewport;
    const alignColToRight = viewportScrolledBeforeCol;

    let newScrollPosition = this.getCenterViewportScrollLeft();
    if (alignColToLeft || alignColToRight) {
      if (this.enableRtl) {
        newScrollPosition = alignColToLeft
          ? bodyWidth - viewportWidth - colLeftPixel
          : bodyWidth - colRightPixel;
      } else {
        newScrollPosition = alignColToLeft
          ? colLeftPixel
          : colRightPixel - viewportWidth;
      }
      this.setCenterViewportScrollLeft(newScrollPosition);
    } else {
      // otherwise, col is already in view, so do nothing
    }

    // this will happen anyway, as the move will cause a 'scroll' event on the body, however
    // it is possible that the ensureColumnVisible method is called from within ag-Grid and
    // the caller will need to have the columns rendered to continue, which will be before
    // the event has been worked on (which is the case for cell navigation).
    this.onHorizontalViewportChanged();

    // so when we return back to user, the cells have rendered
    this.animationFrameService.flushAllFrames();
  }

  public showLoadingOverlay() {
    if (!this.gridOptionsWrapper.isSuppressLoadingOverlay()) {
      this.overlayWrapper.showLoadingOverlay();
    }
  }

  public showNoRowsOverlay() {
    if (!this.gridOptionsWrapper.isSuppressNoRowsOverlay()) {
      this.overlayWrapper.showNoRowsOverlay();
    }
  }

  public hideOverlay() {
    this.overlayWrapper.hideOverlay();
  }

  // method will call itself if no available width. this covers if the grid
  // isn't visible, but is just about to be visible.
  public sizeColumnsToFit(nextTimeout?: number) {
    const availableWidth = this.eBodyViewport.clientWidth;

    if (availableWidth > 0) {
      this.columnController.sizeColumnsToFit(
        availableWidth,
        'sizeColumnsToFit',
      );
      return;
    }

    if (nextTimeout === undefined) {
      window.setTimeout(() => {
        this.sizeColumnsToFit(100);
      }, 0);
    } else if (nextTimeout === 100) {
      window.setTimeout(() => {
        this.sizeColumnsToFit(500);
      }, 100);
    } else if (nextTimeout === 500) {
      window.setTimeout(() => {
        this.sizeColumnsToFit(-1);
      }, 500);
    } else {
      console.warn(
        'ag-Grid: tried to call sizeColumnsToFit() but the grid is coming back with ' +
          'zero width, maybe the grid is not visible yet on the screen?',
      );
    }
  }

  // used by autoWidthCalculator and autoHeightCalculator
  public getCenterContainer(): HTMLElement {
    return this.eCenterContainer;
  }

  public getDropTargetBodyContainers(): HTMLElement[] {
    return [this.eCenterViewport, this.eTopViewport, this.eBottomViewport];
  }

  public getDropTargetLeftContainers(): HTMLElement[] {
    return [this.eLeftContainer, this.eLeftBottom, this.eLeftTop];
  }

  public getDropTargetRightContainers(): HTMLElement[] {
    return [this.eRightContainer, this.eRightBottom, this.eRightTop];
  }

  private buildRowContainerComponents() {
    this.eAllCellContainers = [
      this.eLeftContainer,
      this.eRightContainer,
      this.eCenterContainer,
      this.eTop,
      this.eBottom,
      this.eFullWidthContainer,
    ];

    this.rowContainerComponents = {
      body: new RowContainerComponent({
        eContainer: this.eCenterContainer,
        eWrapper: this.eCenterColsClipper,
        eViewport: this.eBodyViewport,
      }),
      fullWidth: new RowContainerComponent({
        eContainer: this.eFullWidthContainer,
      }),
      pinnedLeft: new RowContainerComponent({
        eContainer: this.eLeftContainer,
      }),
      pinnedRight: new RowContainerComponent({
        eContainer: this.eRightContainer,
      }),

      floatingTop: new RowContainerComponent({
        eContainer: this.eTopContainer,
      }),
      floatingTopPinnedLeft: new RowContainerComponent({
        eContainer: this.eLeftTop,
      }),
      floatingTopPinnedRight: new RowContainerComponent({
        eContainer: this.eRightTop,
      }),
      floatingTopFullWidth: new RowContainerComponent({
        eContainer: this.eTopFullWidthContainer,
        hideWhenNoChildren: true,
      }),

      floatingBottom: new RowContainerComponent({
        eContainer: this.eBottomContainer,
      }),
      floatingBottomPinnedLeft: new RowContainerComponent({
        eContainer: this.eLeftBottom,
      }),
      floatingBottomPinnedRight: new RowContainerComponent({
        eContainer: this.eRightBottom,
      }),
      floatingBottomFullWidth: new RowContainerComponent({
        eContainer: this.eBottomFullWidthContainer,
        hideWhenNoChildren: true,
      }),
    };

    _.iterateObject(
      this.rowContainerComponents,
      (key: string, container: RowContainerComponent) => {
        if (container) {
          this.getContext().createBean(container);
        }
      },
    );
  }

  private setupRowAnimationCssClass(): void {
    const listener = () => {
      // we don't want to use row animation if scaling, as rows jump strangely as you scroll,
      // when scaling and doing row animation.
      const animateRows =
        this.gridOptionsWrapper.isAnimateRows() &&
        !this.heightScaler.isScaling();
      _.addOrRemoveCssClass(
        this.eBodyViewport,
        'ag-row-animation',
        animateRows,
      );
      _.addOrRemoveCssClass(
        this.eBodyViewport,
        'ag-row-no-animation',
        !animateRows,
      );
    };

    listener();

    this.addManagedListener(
      this.eventService,
      Events.EVENT_HEIGHT_SCALE_CHANGED,
      listener,
    );
  }

  // when editing a pinned row, if the cell is half outside the scrollable area, the browser can
  // scroll the column into view. we do not want this, the pinned sections should never scroll.
  // so we listen to scrolls on these containers and reset the scroll if we find one.
  private suppressScrollOnFloatingRow(): void {
    const resetTopScroll = () => (this.eTopViewport.scrollLeft = 0);
    const resetBottomScroll = () => (this.eTopViewport.scrollLeft = 0);

    this.addManagedListener(this.eTopViewport, 'scroll', resetTopScroll);
    this.addManagedListener(this.eBottomViewport, 'scroll', resetBottomScroll);
  }

  public getRowContainers(): RowContainerComponents {
    return this.rowContainerComponents;
  }

  public getFloatingTopBottom(): HTMLElement[] {
    return [this.eTop, this.eBottom];
  }

  public onDisplayedColumnsChanged(): void {
    this.setPinnedContainerSize();
    this.setHeaderAndFloatingHeights();
    this.onHorizontalViewportChanged();
    this.updateScrollVisibleService();
    this.updateColumnCount();
  }

  private onDisplayedColumnsWidthChanged(): void {
    this.setWidthsOfContainers();
    this.onHorizontalViewportChanged();
    this.updateScrollVisibleService();

    if (this.enableRtl) {
      // because RTL is all backwards, a change in the width of the row
      // can cause a change in the scroll position, without a scroll event,
      // because the scroll position in RTL is a function that depends on
      // the width. to be convinced of this, take out this line, enable RTL,
      // scroll all the way to the left and then resize a column
      this.horizontallyScrollHeaderCenterAndFloatingCenter();
    }
  }

  private setWidthsOfContainers(): void {
    this.setCenterWidth();
    this.setPinnedContainerSize();
  }

  private setCenterWidth(): void {
    const { headerRootComp, columnController } = this;
    let width = columnController.getBodyContainerWidth();

    if (this.printLayout) {
      const pinnedContainerWidths =
        columnController.getPinnedLeftContainerWidth() +
        columnController.getPinnedRightContainerWidth();
      width += pinnedContainerWidths;
    }

    headerRootComp.setHeaderContainerWidth(width);

    const widthPx = `${width}px`;

    this.eCenterContainer.style.width = widthPx;
    this.eBottomContainer.style.width = widthPx;
    this.eTopContainer.style.width = widthPx;

    if (!this.printLayout) {
      this.eBodyHorizontalScrollContainer.style.width = widthPx;
    }
  }

  private setPinnedLeftWidth(): void {
    const oldPinning = this.pinningLeft;
    const widthOfCols = this.columnController.getPinnedLeftContainerWidth();
    const newPinning = (this.pinningLeft =
      !this.printLayout && widthOfCols > 0);
    const containers = [this.eLeftContainer, this.eLeftTop, this.eLeftBottom];

    if (oldPinning !== newPinning) {
      this.headerRootComp.setLeftVisible(newPinning);
    }

    containers.forEach((e) => _.setDisplayed(e, this.pinningLeft));

    if (newPinning) {
      containers.forEach((ct) => _.setFixedWidth(ct, widthOfCols));
    }
  }

  private setPinnedRightWidth(): void {
    const oldPinning = this.pinningRight;
    const widthOfCols = this.columnController.getPinnedRightContainerWidth();
    const newPinning = (this.pinningRight =
      !this.printLayout && widthOfCols > 0);
    const containers = [
      this.eRightContainer,
      this.eRightTop,
      this.eRightBottom,
    ];

    if (oldPinning !== newPinning) {
      this.headerRootComp.setRightVisible(newPinning);
    }

    containers.forEach((ct) => _.setDisplayed(ct, newPinning));

    if (newPinning) {
      containers.forEach((ct) => _.setFixedWidth(ct, widthOfCols));
    }
  }

  private setPinnedContainerSize() {
    this.setPinnedLeftWidth();
    this.setPinnedRightWidth();
    this.setFakeHScrollSpacerWidths();
  }

  private setFakeHScrollSpacerWidths(): void {
    // we pad the right based on a) if cols are pinned to the right and
    // b) if v scroll is showing on the right (normal position of scroll)
    let rightSpacing = this.columnController.getPinnedRightContainerWidth();
    const scrollOnRight = !this.enableRtl && this.isVerticalScrollShowing();

    if (scrollOnRight) {
      rightSpacing += this.scrollWidth;
    }
    _.setFixedWidth(this.eHorizontalRightSpacer, rightSpacing);
    _.addOrRemoveCssClass(
      this.eHorizontalRightSpacer,
      'ag-scroller-corner',
      rightSpacing <= this.scrollWidth,
    );

    // we pad the left based on a) if cols are pinned to the left and
    // b) if v scroll is showing on the left (happens in LTR layout only)
    let leftSpacing = this.columnController.getPinnedLeftContainerWidth();
    const scrollOnLeft = this.enableRtl && this.isVerticalScrollShowing();

    if (scrollOnLeft) {
      leftSpacing += this.scrollWidth;
    }

    _.setFixedWidth(this.eHorizontalLeftSpacer, leftSpacing);
    _.addOrRemoveCssClass(
      this.eHorizontalLeftSpacer,
      'ag-scroller-corner',
      leftSpacing <= this.scrollWidth,
    );
  }

  private checkBodyHeight(): void {
    const bodyHeight = this.eBodyViewport.clientHeight;

    if (this.bodyHeight !== bodyHeight) {
      this.bodyHeight = bodyHeight;
      const event: BodyHeightChangedEvent = {
        type: Events.EVENT_BODY_HEIGHT_CHANGED,
        api: this.gridApi,
        columnApi: this.columnApi,
      };
      this.eventService.dispatchEvent(event);
    }
  }

  public setHeaderAndFloatingHeights(): void {
    const {
      columnController,
      gridOptionsWrapper,
      pinnedRowModel,
      eTop,
      eBottom,
    } = this;

    let numberOfFloating = 0;
    let headerRowCount = columnController.getHeaderRowCount();
    let totalHeaderHeight: number;
    let groupHeight: number;
    let headerHeight: number;

    if (columnController.isPivotMode()) {
      groupHeight = gridOptionsWrapper.getPivotGroupHeaderHeight();
      headerHeight = gridOptionsWrapper.getPivotHeaderHeight();
    } else {
      const hasFloatingFilters = columnController.hasFloatingFilters();

      if (hasFloatingFilters) {
        headerRowCount++;
        numberOfFloating = 1;
      }

      groupHeight = gridOptionsWrapper.getGroupHeaderHeight();
      headerHeight = gridOptionsWrapper.getHeaderHeight();
    }

    const numberOfNonGroups = 1 + numberOfFloating;
    const numberOfGroups = headerRowCount - numberOfNonGroups;

    totalHeaderHeight =
      numberOfFloating * gridOptionsWrapper.getFloatingFiltersHeight();
    totalHeaderHeight += numberOfGroups * groupHeight;
    totalHeaderHeight += headerHeight;

    this.headerRootComp.setHeight(totalHeaderHeight);
    let floatingTopHeight = pinnedRowModel.getPinnedTopTotalHeight();

    if (floatingTopHeight) {
      // adding 1px for cell bottom border
      floatingTopHeight += 1;
    }

    let floatingBottomHeight = pinnedRowModel.getPinnedBottomTotalHeight();

    if (floatingBottomHeight) {
      // adding 1px for cell bottom border
      floatingBottomHeight += 1;
    }
    const floatingTopHeightString = `${floatingTopHeight}px`;
    const floatingBottomHeightString = `${floatingBottomHeight}px`;

    eTop.style.minHeight = floatingTopHeightString;
    eTop.style.height = floatingTopHeightString;
    eTop.style.display = floatingTopHeight ? 'inherit' : 'none';
    eBottom.style.minHeight = floatingBottomHeightString;
    eBottom.style.height = floatingBottomHeightString;
    eBottom.style.display = floatingBottomHeight ? 'inherit' : 'none';

    this.checkBodyHeight();
  }

  public getBodyHeight(): number {
    return this.bodyHeight;
  }

  // called by scrollHorizontally method and alignedGridsService
  public setHorizontalScrollPosition(hScrollPosition: number): void {
    this.eCenterViewport.scrollLeft = hScrollPosition;

    // we need to manually do the event handling (rather than wait for the event)
    // for the alignedGridsService, as if we don't, the aligned grid service gets
    // notified async, and then it's 'consuming' flag doesn't get used right, and
    // we can end up with an infinite loop
    this.doHorizontalScroll(hScrollPosition);
  }

  public setVerticalScrollPosition(vScrollPosition: number): void {
    this.eBodyViewport.scrollTop = vScrollPosition;
  }

  // called by the headerRootComp and moveColumnController
  public scrollHorizontally(pixels: number): number {
    const oldScrollPosition = this.eCenterViewport.scrollLeft;

    this.setHorizontalScrollPosition(oldScrollPosition + pixels);
    return this.eCenterViewport.scrollLeft - oldScrollPosition;
  }

  // called by rowDragFeature
  public scrollVertically(pixels: number): number {
    const oldScrollPosition = this.eBodyViewport.scrollTop;

    this.setVerticalScrollPosition(oldScrollPosition + pixels);
    return this.eBodyViewport.scrollTop - oldScrollPosition;
  }

  private addScrollListener() {
    this.addManagedListener(
      this.eCenterViewport,
      'scroll',
      this.onCenterViewportScroll.bind(this),
    );
    this.addManagedListener(
      this.eBodyHorizontalScrollViewport,
      'scroll',
      this.onFakeHorizontalScroll.bind(this),
    );
    this.addManagedListener(
      this.eBodyViewport,
      'scroll',
      this.onVerticalScroll.bind(this),
    );
  }

  private onVerticalScroll(): void {
    const scrollTop: number = this.eBodyViewport.scrollTop;
    this.animationFrameService.setScrollTop(scrollTop);

    this.scrollTop = scrollTop;
    this.redrawRowsAfterScroll();
  }

  private isControllingScroll(eDiv: HTMLElement): boolean {
    if (!this.lastHorizontalScrollElement) {
      this.lastHorizontalScrollElement = eDiv;
      return true;
    }

    return eDiv === this.lastHorizontalScrollElement;
  }

  private onFakeHorizontalScroll(): void {
    if (!this.isControllingScroll(this.eBodyHorizontalScrollViewport)) {
      return;
    }
    this.onBodyHorizontalScroll(this.eBodyHorizontalScrollViewport);
  }

  private onCenterViewportScroll(): void {
    if (!this.isControllingScroll(this.eCenterViewport)) {
      return;
    }
    this.onBodyHorizontalScroll(this.eCenterViewport);
  }

  private onBodyHorizontalScroll(eSource: HTMLElement): void {
    const { scrollWidth, clientWidth } = this.eCenterViewport;

    // in chrome, fractions can be in the scroll left, eg 250.342234 - which messes up our 'scrollWentPastBounds'
    // formula. so we floor it to allow the formula to work.
    let scrollLeft = Math.floor(_.getScrollLeft(eSource, this.enableRtl));

    // touch devices allow elastic scroll - which temporally scrolls the panel outside of the viewport
    // (eg user uses touch to go to the left of the grid, but drags past the left, the rows will actually
    // scroll past the left until the user releases the mouse). when this happens, we want ignore the scroll,
    // as otherwise it was causing the rows and header to flicker.

    // sometimes when scrolling, we got values that extended the maximum scroll allowed. we used to
    // ignore these scrolls. problem is the max scroll position could be skipped (eg the previous scroll event
    // could be 10px before the max position, and then current scroll event could be 20px after the max position).
    // if we just ignored the last event, we would be setting the scroll to 10px before the max position, when in
    // actual fact the user has exceeded the max scroll and thus scroll should be set to the max.

    const minScroll = 0;
    const maxScroll = scrollWidth - clientWidth;
    if (scrollLeft < minScroll) {
      scrollLeft = minScroll;
    } else if (scrollLeft > maxScroll) {
      scrollLeft = maxScroll;
    }

    this.doHorizontalScroll(scrollLeft);
    this.resetLastHorizontalScrollElementDebounced();
  }

  private resetLastHorizontalScrollElement() {
    this.lastHorizontalScrollElement = null;
  }

  private doHorizontalScroll(scrollLeft: number): void {
    this.scrollLeft = scrollLeft;

    const event: BodyScrollEvent = {
      type: Events.EVENT_BODY_SCROLL,
      api: this.gridApi,
      columnApi: this.columnApi,
      direction: 'horizontal',
      left: this.scrollLeft,
      top: this.scrollTop,
    };

    this.eventService.dispatchEvent(event);
    this.horizontallyScrollHeaderCenterAndFloatingCenter(scrollLeft);
    this.onHorizontalViewportChanged();
  }

  private redrawRowsAfterScroll(): void {
    const event: BodyScrollEvent = {
      type: Events.EVENT_BODY_SCROLL,
      direction: 'vertical',
      api: this.gridApi,
      columnApi: this.columnApi,
      left: this.scrollLeft,
      top: this.scrollTop,
    };
    this.eventService.dispatchEvent(event);
  }

  // this gets called whenever a change in the viewport, so we can inform column controller it has to work
  // out the virtual columns again. gets called from following locations:
  // + ensureColVisible, scroll, init, layoutChanged, displayedColumnsChanged, API (doLayout)
  private onHorizontalViewportChanged(): void {
    const scrollWidth = this.eCenterViewport.clientWidth;
    const scrollPosition = this.getCenterViewportScrollLeft();

    this.columnController.setVirtualViewportPosition(
      scrollWidth,
      scrollPosition,
    );
  }

  public getCenterViewportScrollLeft(): number {
    // we defer to a util, as how you calculated scrollLeft when doing RTL depends on the browser
    return _.getScrollLeft(this.eCenterViewport, this.enableRtl);
  }

  private setCenterViewportScrollLeft(value: number): void {
    // we defer to a util, as how you calculated scrollLeft when doing RTL depends on the browser
    _.setScrollLeft(this.eCenterViewport, value, this.enableRtl);
  }

  public horizontallyScrollHeaderCenterAndFloatingCenter(
    scrollLeft?: number,
  ): void {
    if (scrollLeft === undefined) {
      scrollLeft = this.getCenterViewportScrollLeft();
    }

    const offset = this.enableRtl ? scrollLeft : -scrollLeft;
    const { clientWidth, scrollWidth } = this.eCenterViewport;
    const scrollWentPastBounds = Math.abs(offset) + clientWidth > scrollWidth;

    if (
      scrollWentPastBounds ||
      (this.enableRtl && offset < 0) ||
      (!this.enableRtl && offset > 0)
    ) {
      return;
    }

    this.headerRootComp.setHorizontalScroll(offset);
    this.eBottomContainer.style.transform = `translateX(${offset}px)`;
    this.eTopContainer.style.transform = `translateX(${offset}px)`;

    const partner =
      this.lastHorizontalScrollElement === this.eCenterViewport
        ? this.eBodyHorizontalScrollViewport
        : this.eCenterViewport;

    _.setScrollLeft(partner, scrollLeft, this.enableRtl);
  }

  // + rangeController
  public addScrollEventListener(listener: () => void): void {
    this.eBodyViewport.addEventListener('scroll', listener);
  }

  // + rangeController
  public removeScrollEventListener(listener: () => void): void {
    this.eBodyViewport.removeEventListener('scroll', listener);
  }
}
