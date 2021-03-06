/************************************************************************************************
 * If you change the GridOptions interface, you must also update PropertyKeys to be consistent. *
 ************************************************************************************************/
import { RowNode } from './rowNode';
import { GridApi } from '../gridApi';
import { ColumnApi } from '../columnController/columnApi';
import { Column } from './column';
import { IViewportDatasource } from '../interfaces/iViewportDatasource';
import {
  ICellRenderer,
  ICellRendererComp,
  ICellRendererFunc,
} from '../rendering/cellRenderers/iCellRenderer';
import {
  ColDef,
  ColGroupDef,
  IAggFunc,
  SuppressKeyboardEventParams,
} from './colDef';
import { IDatasource } from '../interfaces/iDatasource';
import { CellPosition } from './cellPosition';
import { IDateComp } from '../rendering/dateComponent';
import { IServerSideDatasource } from '../interfaces/iServerSideDatasource';
import {
  CsvExportParams,
  ProcessCellForExportParams,
  ProcessHeaderForExportParams,
} from '../interfaces/exportParams';
import {
  BodyScrollEvent,
  CellClickedEvent,
  CellContextMenuEvent,
  CellDoubleClickedEvent,
  CellEditingStartedEvent,
  CellEditingStoppedEvent,
  CellFocusedEvent,
  CellKeyDownEvent,
  CellKeyPressEvent,
  CellMouseDownEvent,
  CellMouseOutEvent,
  CellMouseOverEvent,
  CellValueChangedEvent,
  ChartCreated,
  ChartDestroyed,
  ChartOptionsChanged,
  ChartRangeSelectionChanged,
  ColumnAggFuncChangeRequestEvent,
  ColumnEverythingChangedEvent,
  ColumnGroupOpenedEvent,
  ColumnMovedEvent,
  ColumnPinnedEvent,
  ColumnPivotChangedEvent,
  ColumnPivotChangeRequestEvent,
  ColumnPivotModeChangedEvent,
  ColumnResizedEvent,
  ColumnRowGroupChangedEvent,
  ColumnRowGroupChangeRequestEvent,
  ColumnValueChangedEvent,
  ColumnValueChangeRequestEvent,
  ColumnVisibleEvent,
  DisplayedColumnsChangedEvent,
  DragStartedEvent,
  DragStoppedEvent,
  ExpandCollapseAllEvent,
  FillEndEvent,
  FillStartEvent,
  FilterChangedEvent,
  FilterModifiedEvent,
  FirstDataRenderedEvent,
  GridColumnsChangedEvent,
  GridReadyEvent,
  ModelUpdatedEvent,
  NewColumnsLoadedEvent,
  PaginationChangedEvent,
  PasteEndEvent,
  PasteStartEvent,
  PinnedRowDataChangedEvent,
  RangeSelectionChangedEvent,
  RowClickedEvent,
  RowDataChangedEvent,
  RowDataUpdatedEvent,
  RowDoubleClickedEvent,
  RowDragEvent,
  RowEditingStartedEvent,
  RowEditingStoppedEvent,
  RowGroupOpenedEvent,
  RowSelectedEvent,
  RowValueChangedEvent,
  SelectionChangedEvent,
  SortChangedEvent,
  ToolPanelVisibleChangedEvent,
  ViewportChangedEvent,
  VirtualColumnsChangedEvent,
  VirtualRowRemovedEvent,
} from '../events';
import { IComponent } from '../interfaces/iComponent';
import { AgGridRegisteredComponentInput } from '../components/framework/userComponentRegistry';
import { ILoadingOverlayComp } from '../rendering/overlays/loadingOverlayComponent';
import { INoRowsOverlayComp } from '../rendering/overlays/noRowsOverlayComponent';
import { StatusPanelDef } from '../interfaces/iStatusPanel';
import { SideBarDef } from './sideBar';
import {
  ChartMenuOptions,
  ChartOptions,
  ChartType,
} from '../interfaces/iChartOptions';

/**
 * Grid所有配置项的Interface，主要包括 gird properties, onEvents, callbacks
 */
export interface GridOptions {
  /*******************************************************************************************************
   * If you change the properties on this interface, you must also update PropertyKeys to be consistent. *
   *******************************************************************************************************/

  // set once in init, can never change
  /** 若为true，则行在被拖拽时，相邻两行不会交换，拖拽结束时首位行会交换 */
  suppressBrowserResizeObserver?: boolean;
  /** 若为true，则行在被拖拽时，相邻两行会交换，动画更平滑 */
  rowDragManaged?: boolean;
  suppressRowDrag?: boolean;
  suppressMoveWhenRowDragging?: boolean;
  enableMultiRowDragging?: boolean;
  ensureDomOrder?: boolean;
  /** @deprecated */
  deltaRowDataMode?: boolean;
  /** @deprecated */
  deltaColumnMode?: boolean;
  immutableData?: boolean;
  immutableColumns?: boolean;
  scrollbarWidth?: number;
  /** @deprecated */
  toolPanelSuppressRowGroups?: boolean;
  /** @deprecated */
  toolPanelSuppressValues?: boolean;
  /** @deprecated */
  toolPanelSuppressPivots?: boolean;
  /** @deprecated */
  toolPanelSuppressPivotMode?: boolean;
  /** @deprecated */
  toolPanelSuppressSideButtons?: boolean;
  /** @deprecated */
  toolPanelSuppressColumnFilter?: boolean;
  /** @deprecated */
  toolPanelSuppressColumnSelectAll?: boolean;
  /** @deprecated */
  toolPanelSuppressColumnExpandAll?: boolean;
  /** @deprecated */
  contractColumnSelection?: boolean;
  /**  If true, rows won't be selected when clicked */
  suppressRowClickSelection?: boolean;
  suppressRowHoverHighlight?: boolean;
  suppressCellSelection?: boolean;
  suppressClearOnFillReduction?: boolean;
  /** In Immutable Data Mode, Set to true to suppress sorting of un-sorted data to match original row data. */
  suppressMaintainUnsortedOrder?: boolean;
  /** 多次点击触发多次排序时, the default sorting order is  ascending -> descending -> none */
  sortingOrder?: (string | null)[];
  suppressMultiSort?: boolean;
  multiSortKey?: string;
  /** By default sorting doesn't take into consideration locale-specific characters.
   * Set true if you need to make your sort locale-specific */
  accentedSort?: boolean;
  deltaSort?: boolean;
  suppressHorizontalScroll?: boolean;
  alwaysShowVerticalScroll?: boolean;
  suppressTabbing?: boolean;
  unSortIcon?: boolean;
  rowBuffer?: number;
  tooltipShowDelay?: number;
  tooltipMouseTrack?: boolean;
  enableRtl?: boolean;
  /** @deprecated in v20, use colDef.resizable instead */
  enableColResize?: boolean;
  enableBrowserTooltips?: boolean;
  colResizeDefault?: string;
  enableCellExpressions?: boolean;
  enableCellTextSelection?: boolean;
  /** @deprecated in v20, use colDef.sortable instead */
  enableSorting?: boolean;
  /** @deprecated in v20,  use colDef.sortable instead */
  enableServerSideSorting?: boolean;
  /** @deprecated in v20, use colDef.filter = true instead */
  enableFilter?: boolean;
  /** @deprecated in v20, use colDef.filter = true instead */
  enableServerSideFilter?: boolean;
  enableGroupEdit?: boolean;
  /** Set to true to have Enter key move focus to the cell below if not editing.
   * The default is Enter key starts editing the currently focused cell. */
  enterMovesDown?: boolean;
  /**  Set to true to have Enter key move focus to the cell below after Enter is pressed while editing.
   * The default is editing will stop and focus will remain on the editing cell. */
  enterMovesDownAfterEdit?: boolean;
  suppressMiddleClickScrolls?: boolean;
  preventDefaultOnContextMenu?: boolean;
  suppressPreventDefaultOnMouseWheel?: boolean;
  suppressScrollOnNewData?: boolean;
  suppressMenuHide?: boolean;
  singleClickEdit?: boolean;
  /** set true to change the default so that neither single- nor double-click starts editing,
   *  such as including a button in your cell renderer.
   */
  suppressClickEdit?: boolean;

  /** Allows user to suppress certain keyboard events */
  suppressKeyboardEvent?: (params: SuppressKeyboardEventParams) => boolean;
  /** set true if you want the grid to stop editing when focus leaves */
  stopEditingWhenGridLosesFocus?: boolean;
  debug?: boolean;
  icons?: any; // should be typed
  angularCompileRows?: boolean;
  angularCompileFilters?: boolean;
  angularCompileHeaders?: boolean;
  suppressLoadingOverlay?: boolean;
  suppressNoRowsOverlay?: boolean;
  suppressAutoSize?: boolean;
  autoSizePadding?: number;
  skipHeaderOnAutoSize?: boolean;
  /** Row animations occur after filtering, sorting, resizing height and expanding/collapsing a row group.
   * Each of these animations is turned OFF by default.
   * Column animations(moving cols) are on by default, row animations are off by default.
   */
  animateRows?: boolean;
  suppressColumnMoveAnimation?: boolean;
  suppressMovableColumns?: boolean;
  /** When dragging a column out of the grid, eg when dragging a column from the grid to the group drop zone, the column will remain visible. */
  suppressDragLeaveHidesColumns?: boolean;
  /**  When un-grouping, eg when clicking the 'x' on a column in the drop zone, the column will not be made visible. */
  suppressMakeColumnVisibleAfterUnGroup?: boolean;
  suppressParentsInRowNodes?: boolean;
  suppressFieldDotNotation?: boolean;
  suppressCopyRowsToClipboard?: boolean;
  copyHeadersToClipboard?: boolean;
  clipboardDeliminator?: string;
  suppressClipboardPaste?: boolean;
  suppressLastEmptyLineOnPaste?: boolean;
  suppressAggFuncInHeader?: boolean;
  suppressAggAtRootLevel?: boolean;
  suppressFocusAfterRefresh?: boolean;
  rowModelType?: string;
  pivotMode?: boolean;
  /** @deprecated */
  pivotTotals?: boolean;
  pivotColumnGroupTotals?: string;
  pivotRowTotals?: string;
  suppressEnterpriseResetOnNewColumns?: boolean;
  // enterprise only
  enableRangeSelection?: boolean;
  enableRangeHandle?: boolean;
  enableFillHandle?: boolean;
  suppressMultiRangeSelection?: boolean;
  rowGroupPanelShow?: string;
  pivotPanelShow?: string;
  suppressContextMenu?: boolean;
  allowContextMenuWithControlKey?: boolean;
  rememberGroupStateWhenNewData?: boolean;
  viewportRowModelPageSize?: number;
  viewportRowModelBufferSize?: number;
  /** set true to enable cell flashing on data changes for all columns */
  enableCellChangeFlash?: boolean;
  cellFlashDelay?: number;
  cellFadeDelay?: number;
  /** to flash changes even when it's the result of a filter change */
  allowShowChangeAfterFilter?: boolean;
  quickFilterText?: string;
  /** By default, the quick filter checks each column's value, including running value getters if present, every time the quick filter is executed.
   * If your data set is large, set this true to enable the quick filter cache. */
  cacheQuickFilter?: boolean;
  aggFuncs?: { [key: string]: IAggFunc };
  suppressColumnVirtualisation?: boolean;
  functionsReadOnly?: boolean;
  functionsPassive?: boolean;
  maxConcurrentDatasourceRequests?: number;
  maxBlocksInCache?: number;
  purgeClosedRowNodes?: boolean;
  gridAutoHeight?: boolean;
  /**
   * normal:default if not specified. The grid fits the width and height of the div you provide and scrolls in both directions.
   * autoHeight: The grid's height is set to fit the number of rows so no vertical scrollbar is provided by the grid. The grid scrolls horizontally as normal.
   * print: No scroll bars are used and the grid renders all rows and columns.
   */
  domLayout?: string;
  /** set true to stop the change detection process firing when calling rowNode.setDataValue, api.applyTransaction */
  suppressChangeDetection?: boolean;
  aggregateOnlyChangedColumns?: boolean;
  valueCache?: boolean;
  valueCacheNeverExpires?: boolean;
  batchUpdateWaitMillis?: number;
  /** How many milliseconds to wait before executing a batch of async transactions. */
  asyncTransactionWaitMillis?: number;
  /** Set true to to stop the grid positioning rows using CSS transform and instead the grid will use CSS top.
   * Set true to allow row spanning, */
  suppressRowTransform?: boolean;
  suppressSetColumnStateEvents?: boolean;
  allowDragFromColumnsToolPanel?: boolean;
  suppressMaxRenderedRowRestriction?: boolean;
  excludeChildrenWhenTreeDataFiltering?: boolean;
  /** Undo/Redo feature is designed to be a recovery mechanism for user editing mistakes.
   * Performing grid operations that change the row/column order, e.g. sorting, filtering and grouping, will clear the undo / redo stacks. */
  undoRedoCellEditing?: boolean;
  /** default is 10. */
  undoRedoCellEditingLimit?: number;

  cacheOverflowSize?: number;
  infiniteInitialRowCount?: number;
  paginationPageSize?: number;
  cacheBlockSize?: number;
  blockLoadDebounceMillis?: number;
  paginationAutoPageSize?: boolean;
  paginationStartPage?: number;
  suppressPaginationPanel?: boolean;

  pagination?: boolean;
  paginateChildRows?: boolean;
  /** fullRow editing is for when you want all cells in the row to become editable at the same time.  */
  editType?: string;
  suppressTouch?: boolean;
  suppressAsyncEvents?: boolean;

  embedFullWidthRows?: boolean;
  /** @deprecated */
  deprecatedEmbedFullWidthRows?: boolean;

  //This is an array of ExcelStyle, but because that class lives on the enterprise project is referenced as any from the client project
  excelStyles?: any[];
  /** @deprecated Use floatingFilter on the colDef instead */
  floatingFilter?: boolean;
  suppressExcelExport?: boolean;
  suppressCsvExport?: boolean;

  // these should really be deprecated, as the user should be using the default
  // column definitions for specifying column defaults.
  colWidth?: number;
  minColWidth?: number;
  maxColWidth?: number;

  suppressPropertyNamesCheck?: boolean;
  serverSideSortingAlwaysResets?: boolean;

  statusBar?: {
    statusPanels: StatusPanelDef[];
  };

  // just set once
  localeText?: any;
  localeTextFunc?: (key: string, defaultValue: string) => string;
  suppressAnimationFrame?: boolean;
  /* a map of strings (cellRenderer keys) to cellRenderers (that can be ICellRenderer or ICellRendererFunc) */
  // cellRenderers?: {[key: string]: {new(): ICellRenderer} | ICellRendererFunc};
  /* a map of strings (cellEditor keys) to cellEditors */
  // cellEditors?: {[key: string]: {new(): ICellEditor}};
  /** contains properties that all column groups will inherit */
  defaultColGroupDef?: ColGroupDef;
  /** contains properties that all columns will inherit, a default column definition with properties that get applied to every column */
  defaultColDef?: ColDef;
  defaultExportParams?: CsvExportParams;

  pivotSuppressAutoColumn?: boolean;
  groupSuppressAutoColumn?: boolean;
  groupSelectsChildren?: boolean;
  groupSelectsFiltered?: boolean;
  groupIncludeFooter?: boolean;
  groupIncludeTotalFooter?: boolean;
  groupUseEntireRow?: boolean;
  groupRemoveSingleChildren?: boolean;
  groupRemoveLowestSingleChildren?: boolean;
  groupSuppressRow?: boolean;
  groupHideOpenParents?: boolean;
  groupMultiAutoColumn?: boolean;
  groupSuppressBlankHeader?: boolean;
  /** @deprecated in v11.0 substituted by autoGroupColumnDef */
  groupColumnDef?: ColDef;
  autoGroupColumnDef?: ColDef;
  forPrint?: boolean;
  enableOldSetFilterModel?: boolean;
  enableCharts?: boolean;

  // changeable, but no immediate impact
  context?: any;
  /**  to set style for all rows.  */
  rowStyle?: any;
  /** to set CSS class for all rows. */
  rowClass?: string | string[];
  groupDefaultExpanded?: number;
  /** @deprecated slaveGrids, replace with alignedGrids */
  slaveGrids?: GridOptions[];
  alignedGrids?: GridOptions[];

  /** 'single' will use single row selection, 'multiple' allows multiple rows to be selected. */
  rowSelection?: string;
  /** @deprecated - rowDeselection is now true by default and should be suppressed by using suppressRowDeselection */
  rowDeselection?: boolean;
  suppressRowDeselection?: boolean;
  /** useful for touch devices where Ctrl and Shift clicking is not an option. */
  rowMultiSelectWithClick?: boolean;
  isRowSelectable?: IsRowSelectable;
  overlayLoadingTemplate?: string;
  overlayNoRowsTemplate?: string;
  /** Changing this property will set a new row height for all rows, including pinned rows top and bottom. */
  rowHeight?: number;
  detailRowHeight?: number;
  popupParent?: HTMLElement;

  masterDetail?: boolean;
  keepDetailRows?: boolean;
  keepDetailRowsCount?: number;
  isRowMaster?: IsRowMaster;
  detailCellRenderer?:
    | { new (): ICellRendererComp }
    | ICellRendererFunc
    | string;
  detailCellRendererFramework?: any;
  detailCellRendererParams?: any;

  // changeable with impact
  rowData?: any[];
  /** Pinned rows are not part of the main row model. 不支持sort、filter、group、行选择、print */
  pinnedTopRowData?: any[];
  pinnedBottomRowData?: any[];
  /** @deprecated */
  showToolPanel?: boolean;
  sideBar?: SideBarDef | string | boolean;
  columnDefs?: (ColDef | ColGroupDef)[];
  /** define column types, 自定义表头列的类型，会覆盖defaultColDef中的属性值 */
  columnTypes?: { [key: string]: ColDef };
  datasource?: IDatasource;
  viewportDatasource?: IViewportDatasource;
  serverSideDatasource?: IServerSideDatasource;

  // in properties
  headerHeight?: number;
  pivotHeaderHeight?: number;
  groupHeaderHeight?: number;
  pivotGroupHeaderHeight?: number;
  floatingFiltersHeight?: number;

  /******************************************************************************************************
   * If you change the callbacks on this interface, you must also update PropertyKeys to be consistent. *
   ******************************************************************************************************/

  // callbacks
  paginationNumberFormatter?: (
    params: PaginationNumberFormatterParams,
  ) => string;
  postProcessPopup?: (params: PostProcessPopupParams) => void;
  frameworkComponents?: { [p: string]: { new (): any } } | any;
  components?: { [p: string]: AgGridRegisteredComponentInput<IComponent<any>> };
  dateComponent?: string | { new (): IDateComp };
  dateComponentFramework?: any;
  groupRowRenderer?: { new (): ICellRendererComp } | ICellRendererFunc | string;
  groupRowRendererFramework?: any;
  groupRowRendererParams?: any;
  groupRowInnerRenderer?:
    | { new (): ICellRendererComp }
    | ICellRendererFunc
    | string;
  groupRowInnerRendererFramework?: any;
  createChartContainer?: (params: ChartRef) => void;
  fillOperation?: (params: FillOperationParams) => any;

  /** External filtering allows you to mix your own 'outside of the grid' filtering with the grid's filtering.
   * called exactly once every time the grid senses a filter change.
   */
  isExternalFilterPresent?(): boolean;
  /** called once for each row node in the grid. If you return false, the node will be excluded from the final set. */
  doesExternalFilterPass?(node: RowNode): boolean;
  /** Callback to set style for each row individually. */
  getRowStyle?: Function;
  /** Callback to set class for each row individually. */
  getRowClass?: (params: any) => string | string[];
  /** keys are class names and the values are expressions that if evaluated to true, the class gets used. */
  rowClassRules?: {
    [cssClassName: string]: ((params: any) => boolean) | string;
  };
  /** To change the row height so that each row can have a different height, implement the getRowHeight() callback.  */
  getRowHeight?: Function;
  sendToClipboard?: (params: any) => void;
  processDataFromClipboard?: (
    params: ProcessDataFromClipboardParams,
  ) => string[][] | null;
  navigateToNextCell?: (params: NavigateToNextCellParams) => CellPosition;
  tabToNextCell?: (params: TabToNextCellParams) => CellPosition;
  getDocument?: () => Document;
  defaultGroupSortComparator?: (nodeA: RowNode, nodeB: RowNode) => number;

  loadingCellRenderer?: { new (): ICellRenderer } | string;
  loadingCellRendererFramework?: any;
  loadingCellRendererParams?: any;

  loadingOverlayComponent?: { new (): ILoadingOverlayComp } | string;
  loadingOverlayComponentFramework?: any;
  loadingOverlayComponentParams?: any;

  noRowsOverlayComponent?: { new (): INoRowsOverlayComp } | string;
  noRowsOverlayComponentFramework?: any;
  noRowsOverlayComponentParams?: any;

  fullWidthCellRenderer?:
    | { new (): ICellRendererComp }
    | ICellRendererFunc
    | string;
  fullWidthCellRendererFramework?: any;
  fullWidthCellRendererParams?: any;

  /** to tell the grid which row should be treated as fullWidth. */
  isFullWidthCell?(rowNode: RowNode): boolean;

  groupRowAggNodes?(nodes: RowNode[]): any;

  getBusinessKeyForNode?(node: RowNode): string;

  /** @deprecated */
  getNodeChildDetails?: GetNodeChildDetails;

  getDataPath?: GetDataPath;
  treeData?: boolean;
  isServerSideGroup?: IsServerSideGroup;
  getServerSideGroupKey?: GetServerSideGroupKey;
  getContextMenuItems?: GetContextMenuItems;
  getMainMenuItems?: GetMainMenuItems;
  getChartToolbarItems?: GetChartToolbarItems;
  getRowNodeId?: GetRowNodeIdFunc;

  getChildCount?(dataItem: any): number;

  doesDataFlower?(dataItem: any): boolean;

  processRowPostCreate?(params: ProcessRowParams): void;

  processCellForClipboard?(params: ProcessCellForExportParams): any;

  processHeaderForClipboard?(params: ProcessHeaderForExportParams): any;

  processCellFromClipboard?(params: ProcessCellForExportParams): any;

  processSecondaryColDef?(colDef: ColDef): void;

  processSecondaryColGroupDef?(colGroupDef: ColGroupDef): void;
  /** run this callback over the sorted rows */
  postSort?(nodes: RowNode[]): void;

  processChartOptions?(params: ProcessChartOptionsParams): ChartOptions<any>;

  /**********************************************************************************************************
   * If you change the events on this interface, you do *not* need to update PropertyKeys to be consistent, *
   * as event callbacks are automatically generated.                                                        *
   **********************************************************************************************************/

  // events
  onColumnEverythingChanged?(event: ColumnEverythingChangedEvent): void;

  onToolPanelVisibleChanged?(event: ToolPanelVisibleChangedEvent): void;

  onNewColumnsLoaded?(event: NewColumnsLoadedEvent): void;

  onColumnPivotModeChanged?(event: ColumnPivotModeChangedEvent): void;

  onColumnRowGroupChanged?(event: ColumnRowGroupChangedEvent): void;

  onColumnPivotChanged?(event: ColumnPivotChangedEvent): void;

  onGridColumnsChanged?(event: GridColumnsChangedEvent): void;

  onColumnValueChanged?(event: ColumnValueChangedEvent): void;

  onColumnMoved?(event: ColumnMovedEvent): void;

  onColumnVisible?(event: ColumnVisibleEvent): void;

  onColumnPinned?(event: ColumnPinnedEvent): void;

  onColumnGroupOpened?(event: ColumnGroupOpenedEvent): void;

  onColumnResized?(event: ColumnResizedEvent): void;

  onDisplayedColumnsChanged?(event: DisplayedColumnsChangedEvent): void;

  onVirtualColumnsChanged?(event: VirtualColumnsChangedEvent): void;

  onRowGroupOpened?(event: RowGroupOpenedEvent): void;

  onRowDataChanged?(event: RowDataChangedEvent): void;

  onRowDataUpdated?(event: RowDataUpdatedEvent): void;

  onPinnedRowDataChanged?(event: PinnedRowDataChangedEvent): void;

  onRangeSelectionChanged?(event: RangeSelectionChangedEvent): void;

  onColumnRowGroupChangeRequest?(event: ColumnRowGroupChangeRequestEvent): void;

  onColumnPivotChangeRequest?(event: ColumnPivotChangeRequestEvent): void;

  onColumnValueChangeRequest?(event: ColumnValueChangeRequestEvent): void;

  onColumnAggFuncChangeRequest?(event: ColumnAggFuncChangeRequestEvent): void;

  onModelUpdated?(event: ModelUpdatedEvent): void;

  onCellKeyDown?(event: CellKeyDownEvent): void;

  onCellKeyPress?(event: CellKeyPressEvent): void;

  onCellClicked?(event: CellClickedEvent): void;

  onCellMouseDown?(event: CellMouseDownEvent): void;

  onCellDoubleClicked?(event: CellDoubleClickedEvent): void;

  onCellContextMenu?(event: CellContextMenuEvent): void;

  onCellValueChanged?(event: CellValueChangedEvent): void;

  onCellMouseOver?(event: CellMouseOverEvent): void;

  onCellMouseOut?(event: CellMouseOutEvent): void;

  onRowValueChanged?(event: RowValueChangedEvent): void;

  onRowEditingStarted?(event: RowEditingStartedEvent): void;

  onRowEditingStopped?(event: RowEditingStoppedEvent): void;

  onCellEditingStarted?(event: CellEditingStartedEvent): void;

  onCellEditingStopped?(event: CellEditingStoppedEvent): void;

  onCellFocused?(event: CellFocusedEvent): void;

  onRowSelected?(event: RowSelectedEvent): void;

  onSelectionChanged?(event: SelectionChangedEvent): void;

  onFilterChanged?(event: FilterChangedEvent): void;

  onFilterModified?(event: FilterModifiedEvent): void;

  onSortChanged?(event: SortChangedEvent): void;

  onVirtualRowRemoved?(event: VirtualRowRemovedEvent): void;

  onRowClicked?(event: RowClickedEvent): void;

  onRowDoubleClicked?(event: RowDoubleClickedEvent): void;

  onGridReady?(event: GridReadyEvent): void;

  onViewportChanged?(event: ViewportChangedEvent): void;

  onDragStarted?(event: DragStartedEvent): void;

  onDragStopped?(event: DragStoppedEvent): void;

  onPaginationChanged?(event: PaginationChangedEvent): void;

  onRowDragEnter?(event: RowDragEvent): void;

  onRowDragMove?(event: RowDragEvent): void;

  onRowDragLeave?(event: RowDragEvent): void;

  onRowDragEnd?(event: RowDragEvent): void;

  onPasteStart?(event: PasteStartEvent): void;

  onPasteEnd?(event: PasteEndEvent): void;

  onFillStart?(event: FillStartEvent): void;

  onFillEnd?(event: FillEndEvent): void;

  onBodyScroll?(event: BodyScrollEvent): void;

  onFirstDataRendered?(event: FirstDataRenderedEvent): void;

  onExpandOrCollapseAll?(event: ExpandCollapseAllEvent): void;

  onChartCreated?(event: ChartCreated): void;

  onChartRangeSelectionChanged?(event: ChartRangeSelectionChanged): void;

  onChartOptionsChanged?(event: ChartOptionsChanged): void;

  onChartDestroyed?(event: ChartDestroyed): void;

  /** @deprecated */
  onGridSizeChanged?(event: any): void;

  // apis, set by the grid on init
  api?: GridApi | null; // change to typed
  columnApi?: ColumnApi | null; // change to typed
}

export interface FillOperationParams {
  event: MouseEvent;
  values: any[];
  initialValues: any[];
  currentIndex: number;
  api: GridApi;
  columnApi: ColumnApi;
  context: any;
  direction: string; // up, down, left or right
  column?: Column; // only present if up / down
  rowNode?: RowNode; // only present if left / right,
}

export interface GetDataPath {
  (data: any): string[];
}

export interface IsServerSideGroup {
  (dataItem: any): boolean;
}

export interface GetServerSideGroupKey {
  (dataItem: any): string;
}

export interface GetNodeChildDetails {
  (dataItem: any): NodeChildDetails;
}

export interface IsRowMaster {
  (dataItem: any): boolean;
}

export interface IsRowSelectable {
  (node: RowNode): boolean;
}

export interface NodeChildDetails {
  group: boolean;
  children?: any[];
  expanded?: boolean;
  field?: string;
  key?: any;
}

export interface ProcessChartOptionsParams {
  type: ChartType;
  options: ChartOptions<any>;
}

export interface GetContextMenuItemsParams {
  defaultItems: string[] | undefined;
  column: Column;
  node: RowNode;
  value: any;
  api: GridApi | null | undefined;
  columnApi: ColumnApi | null | undefined;
  context: any;
}

export interface GetContextMenuItems {
  (params: GetContextMenuItemsParams): (string | MenuItemDef)[];
}

export interface GetChartToolbarItemsParams {
  defaultItems?: ChartMenuOptions[];
  api?: GridApi | null;
  columnApi?: ColumnApi | null;
}

export interface GetChartToolbarItems {
  (params: GetChartToolbarItemsParams): ChartMenuOptions[];
}

export interface MenuItemDef {
  name: string;
  disabled?: boolean;
  shortcut?: string;
  action?: () => void;
  checked?: boolean;
  icon?: HTMLElement | string;
  subMenu?: (MenuItemDef | string)[];
  cssClasses?: string[];
  tooltip?: string;
}

export interface GetMainMenuItemsParams {
  column: Column;
  api: GridApi | null | undefined;
  columnApi: ColumnApi | null | undefined;
  context: any;
  defaultItems: string[];
}

export interface GetMainMenuItems {
  (params: GetMainMenuItemsParams): (string | MenuItemDef)[];
}

export interface GetRowNodeIdFunc {
  (data: any): string;
}

export interface ProcessRowParams {
  eRow: HTMLElement;
  ePinnedLeftRow: HTMLElement;
  ePinnedRightRow: HTMLElement;
  rowIndex: number;
  node: RowNode;
  api: GridApi;
  columnApi: ColumnApi;
  addRenderedRowListener: (eventType: string, listener: Function) => void;
  context: any;
}

export interface NavigateToNextCellParams {
  key: number;
  previousCellPosition: CellPosition;
  nextCellPosition: CellPosition;
  event: KeyboardEvent;
}

export interface TabToNextCellParams {
  backwards: boolean;
  editing: boolean;
  previousCellPosition: CellPosition;
  nextCellPosition: CellPosition;
}

export interface PostProcessPopupParams {
  // if popup is for a column, this gives the Column
  column?: Column | null;
  // if popup is for a row, this gives the RowNode
  rowNode?: RowNode;
  // the popup we are showing
  ePopup: HTMLElement;
  // The different types are: 'contextMenu', 'columnMenu', 'aggFuncSelect', 'popupCellEditor'
  type: string;
  // if the popup is as a result of a button click (eg menu button), this is the component that the user clicked
  eventSource?: HTMLElement | null;
  // if the popup is as a result of a click or touch, this is the event - eg user showing context menu
  mouseEvent?: MouseEvent | Touch | null;
}

export interface PaginationNumberFormatterParams {
  value: number;
}

export interface ProcessDataFromClipboardParams {
  data: string[][];
}

export interface ChartRef {
  chartElement: HTMLElement;
  destroyChart: () => void;
}
