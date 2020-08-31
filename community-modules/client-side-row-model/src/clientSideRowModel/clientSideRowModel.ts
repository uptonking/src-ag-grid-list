import {
  Autowired,
  Bean,
  ChangedPath,
  ColumnApi,
  ColumnController,
  Constants as constants,
  Constants,
  Events,
  ExpandCollapseAllEvent,
  FilterManager,
  GridApi,
  GridOptionsWrapper,
  IRowNodeStage,
  ModelUpdatedEvent,
  Optional,
  PostConstruct,
  RefreshModelParams,
  RowBounds,
  RowDataChangedEvent,
  RowDataTransaction,
  RowDataUpdatedEvent,
  RowNode,
  RowNodeTransaction,
  SelectionController,
  ValueCache,
  ValueService,
  IClientSideRowModel,
  FilterChangedEvent,
  BeanStub,
  _,
} from '@ag-grid-community/core';
import { ClientSideNodeManager } from './clientSideNodeManager';

enum RecursionType {
  Normal,
  AfterFilter,
  AfterFilterAndSort,
  PivotNodes,
}

export interface BatchTransactionItem {
  rowDataTransaction: RowDataTransaction;
  callback: ((res: RowNodeTransaction) => void) | undefined;
}

export interface RowNodeMap {
  [id: string]: RowNode;
}

/**
 * 最常用的rowModel，不涉及服务端数据通信
 */
@Bean('rowModel')
export class ClientSideRowModel
  extends BeanStub
  implements IClientSideRowModel {
  @Autowired('gridOptionsWrapper')
  private gridOptionsWrapper: GridOptionsWrapper;

  @Autowired('columnController') private columnController: ColumnController;
  @Autowired('filterManager') private filterManager: FilterManager;
  @Autowired('$scope') private $scope: any;
  @Autowired('selectionController')
  private selectionController: SelectionController;
  @Autowired('valueService') private valueService: ValueService;
  @Autowired('valueCache') private valueCache: ValueCache;
  @Autowired('columnApi') private columnApi: ColumnApi;
  @Autowired('gridApi') private gridApi: GridApi;

  // standard stages
  @Autowired('filterStage') private filterStage: IRowNodeStage;
  @Autowired('sortStage') private sortStage: IRowNodeStage;
  @Autowired('flattenStage') private flattenStage: IRowNodeStage;

  // enterprise stages
  @Optional('groupStage') private groupStage: IRowNodeStage;
  @Optional('aggregationStage') private aggregationStage: IRowNodeStage;
  @Optional('pivotStage') private pivotStage: IRowNodeStage;

  // top most node of the tree. the children are the user provided data.
  private rootNode: RowNode;
  private rowsToDisplay: RowNode[]; // the rows mapped to rows to display
  private nodeManager: ClientSideNodeManager;
  private rowDataTransactionBatch: BatchTransactionItem[] | null;
  private lastHighlightedRow: RowNode | null;

  @PostConstruct
  public init(): void {
    const refreshEverythingFunc = this.refreshModel.bind(this, {
      step: Constants.STEP_EVERYTHING,
    });
    const refreshEverythingAfterColsChangedFunc = this.refreshModel.bind(this, {
      step: Constants.STEP_EVERYTHING,
      afterColumnsChanged: true,
      keepRenderedRows: true,
    });

    this.addManagedListener(
      this.eventService,
      Events.EVENT_COLUMN_EVERYTHING_CHANGED,
      refreshEverythingAfterColsChangedFunc,
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_COLUMN_ROW_GROUP_CHANGED,
      refreshEverythingFunc,
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_COLUMN_VALUE_CHANGED,
      this.onValueChanged.bind(this),
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_COLUMN_PIVOT_CHANGED,
      this.refreshModel.bind(this, { step: Constants.STEP_PIVOT }),
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_ROW_GROUP_OPENED,
      this.onRowGroupOpened.bind(this),
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_FILTER_CHANGED,
      this.onFilterChanged.bind(this),
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_SORT_CHANGED,
      this.onSortChanged.bind(this),
    );
    this.addManagedListener(
      this.eventService,
      Events.EVENT_COLUMN_PIVOT_MODE_CHANGED,
      refreshEverythingFunc,
    );

    const refreshMapListener = this.refreshModel.bind(this, {
      step: Constants.STEP_MAP,
      keepRenderedRows: true,
      animate: true,
    });

    this.addManagedListener(
      this.gridOptionsWrapper,
      GridOptionsWrapper.PROP_GROUP_REMOVE_SINGLE_CHILDREN,
      refreshMapListener,
    );
    this.addManagedListener(
      this.gridOptionsWrapper,
      GridOptionsWrapper.PROP_GROUP_REMOVE_LOWEST_SINGLE_CHILDREN,
      refreshMapListener,
    );

    this.rootNode = new RowNode();
    this.nodeManager = new ClientSideNodeManager(
      this.rootNode,
      this.gridOptionsWrapper,
      this.getContext(),
      this.eventService,
      this.columnController,
      this.gridApi,
      this.columnApi,
      this.selectionController,
    );

    this.createBean(this.rootNode);
  }

  /**
   * 开始将输入的rowData处理成grid内部的数据结构
   */
  public start(): void {
    const rowData = this.gridOptionsWrapper.getRowData();
    if (rowData) {
      // 对rowData进行计算处理的入口
      this.setRowData(rowData);
    }
  }

  public ensureRowHeightsValid(
    startPixel: number,
    endPixel: number,
    startLimitIndex: number,
    endLimitIndex: number,
  ): boolean {
    let atLeastOneChange: boolean;
    let res = false;

    // we do this multiple times as changing the row heights can also change the first and last rows,
    // so the first pass can make lots of rows smaller, which means the second pass we end up changing
    // more rows.
    do {
      atLeastOneChange = false;

      const rowAtStartPixel = this.getRowIndexAtPixel(startPixel);
      const rowAtEndPixel = this.getRowIndexAtPixel(endPixel);

      // keep check to current page if doing pagination
      const firstRow = Math.max(rowAtStartPixel, startLimitIndex);
      const lastRow = Math.min(rowAtEndPixel, endLimitIndex);

      for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex++) {
        const rowNode = this.getRow(rowIndex);
        if (rowNode.rowHeightEstimated) {
          const rowHeight = this.gridOptionsWrapper.getRowHeightForNode(
            rowNode,
          );
          rowNode.setRowHeight(rowHeight.height);
          atLeastOneChange = true;
          res = true;
        }
      }

      if (atLeastOneChange) {
        this.setRowTops();
      }
    } while (atLeastOneChange);

    return res;
  }

  private setRowTops(): void {
    let nextRowTop = 0;
    for (let i = 0; i < this.rowsToDisplay.length; i++) {
      // we don't estimate if doing fullHeight or autoHeight, as all rows get rendered all the time
      // with these two layouts.
      const allowEstimate =
        this.gridOptionsWrapper.getDomLayout() === Constants.DOM_LAYOUT_NORMAL;

      const rowNode = this.rowsToDisplay[i];
      if (_.missing(rowNode.rowHeight)) {
        const rowHeight = this.gridOptionsWrapper.getRowHeightForNode(
          rowNode,
          allowEstimate,
        );
        rowNode.setRowHeight(rowHeight.height, rowHeight.estimated);
      }

      rowNode.setRowTop(nextRowTop);
      rowNode.setRowIndex(i);
      nextRowTop += rowNode.rowHeight;
    }
  }

  private resetRowTops(rowNode: RowNode, changedPath: ChangedPath): void {
    rowNode.clearRowTop();
    if (rowNode.hasChildren()) {
      if (rowNode.childrenAfterGroup) {
        // if a changedPath is active, it means we are here because of a transaction update or
        // a change detection. neither of these impacts the open/closed state of groups. so if
        // a group is not open this time, it was not open last time. so we know all closed groups
        // already have their top positions cleared. so there is no need to traverse all the way
        // when changedPath is active and the rowNode is not expanded.
        const skipChildren = changedPath.isActive() && !rowNode.expanded;
        if (!skipChildren) {
          for (let i = 0; i < rowNode.childrenAfterGroup.length; i++) {
            this.resetRowTops(rowNode.childrenAfterGroup[i], changedPath);
          }
        }
      }
      if (rowNode.sibling) {
        rowNode.sibling.clearRowTop();
      }
    }
    if (rowNode.detailNode) {
      rowNode.detailNode.clearRowTop();
    }
  }

  // returns false if row was moved, otherwise true
  public ensureRowsAtPixel(
    rowNodes: RowNode[],
    pixel: number,
    increment: number = 0,
  ): boolean {
    const indexAtPixelNow = this.getRowIndexAtPixel(pixel);
    const rowNodeAtPixelNow = this.getRow(indexAtPixelNow);

    if (rowNodeAtPixelNow === rowNodes[0]) {
      return false;
    }

    rowNodes.forEach((rowNode) => {
      _.removeFromArray(this.rootNode.allLeafChildren, rowNode);
    });

    rowNodes.forEach((rowNode, idx) => {
      _.insertIntoArray(
        this.rootNode.allLeafChildren,
        rowNode,
        indexAtPixelNow + increment + idx,
      );
    });

    this.refreshModel({
      step: Constants.STEP_EVERYTHING,
      keepRenderedRows: true,
      animate: true,
      keepEditingRows: true,
    });

    return true;
  }

  public highlightRowAtPixel(rowNode: RowNode | null, pixel?: number): void {
    const indexAtPixelNow =
      pixel != null ? this.getRowIndexAtPixel(pixel) : null;
    const rowNodeAtPixelNow =
      indexAtPixelNow != null ? this.getRow(indexAtPixelNow) : null;

    if (
      !rowNodeAtPixelNow ||
      !rowNode ||
      rowNodeAtPixelNow === rowNode ||
      pixel == null
    ) {
      if (this.lastHighlightedRow) {
        this.lastHighlightedRow.setHighlighted(null);
        this.lastHighlightedRow = null;
      }
      return;
    }

    const highlight = this.getHighlightPosition(pixel, rowNodeAtPixelNow);

    if (
      this.lastHighlightedRow &&
      this.lastHighlightedRow !== rowNodeAtPixelNow
    ) {
      this.lastHighlightedRow.setHighlighted(null);
      this.lastHighlightedRow = null;
    }

    rowNodeAtPixelNow.setHighlighted(highlight);
    this.lastHighlightedRow = rowNodeAtPixelNow;
  }

  public getHighlightPosition(
    pixel: number,
    rowNode?: RowNode,
  ): 'above' | 'below' {
    if (!rowNode) {
      const index = this.getRowIndexAtPixel(pixel);
      rowNode = this.getRow(index || 0);

      if (!rowNode) {
        return 'below';
      }
    }

    const { rowTop, rowHeight } = rowNode;

    return pixel - rowTop < rowHeight / 2 ? 'above' : 'below';
  }

  public getLastHighlightedRowNode(): RowNode | null {
    return this.lastHighlightedRow;
  }

  public isLastRowFound(): boolean {
    return true;
  }

  public getRowCount(): number {
    if (this.rowsToDisplay) {
      return this.rowsToDisplay.length;
    }

    return 0;
  }

  public getTopLevelRowCount(): number {
    const showingRootNode =
      this.rowsToDisplay && this.rowsToDisplay[0] === this.rootNode;

    if (showingRootNode) {
      return 1;
    }

    return this.rootNode.childrenAfterFilter
      ? this.rootNode.childrenAfterFilter.length
      : 0;
  }

  public getTopLevelRowDisplayedIndex(topLevelIndex: number): number {
    const showingRootNode =
      this.rowsToDisplay && this.rowsToDisplay[0] === this.rootNode;

    if (showingRootNode) {
      return topLevelIndex;
    }

    let rowNode = this.rootNode.childrenAfterSort[topLevelIndex];

    if (this.gridOptionsWrapper.isGroupHideOpenParents()) {
      // if hideOpenParents, and this row open, then this row is now displayed at this index, first child is
      while (
        rowNode.expanded &&
        rowNode.childrenAfterSort &&
        rowNode.childrenAfterSort.length > 0
      ) {
        rowNode = rowNode.childrenAfterSort[0];
      }
    }

    return rowNode.rowIndex;
  }

  public getRowBounds(index: number): RowBounds | null {
    if (_.missing(this.rowsToDisplay)) {
      return null;
    }

    const rowNode = this.rowsToDisplay[index];

    if (rowNode) {
      return {
        rowTop: rowNode.rowTop,
        rowHeight: rowNode.rowHeight,
      };
    }

    return null;
  }

  private onRowGroupOpened(): void {
    const animate = this.gridOptionsWrapper.isAnimateRows();
    this.refreshModel({
      step: Constants.STEP_MAP,
      keepRenderedRows: true,
      animate: animate,
    });
  }

  private onFilterChanged(event: FilterChangedEvent): void {
    if (event.afterDataChange) {
      return;
    }
    const animate = this.gridOptionsWrapper.isAnimateRows();
    this.refreshModel({
      step: Constants.STEP_FILTER,
      keepRenderedRows: true,
      animate: animate,
    });
  }

  private onSortChanged(): void {
    const animate = this.gridOptionsWrapper.isAnimateRows();
    this.refreshModel({
      step: Constants.STEP_SORT,
      keepRenderedRows: true,
      animate: animate,
      keepEditingRows: true,
    });
  }

  public getType(): string {
    return Constants.ROW_MODEL_TYPE_CLIENT_SIDE;
  }

  private onValueChanged(): void {
    if (this.columnController.isPivotActive()) {
      this.refreshModel({ step: Constants.STEP_PIVOT });
    } else {
      this.refreshModel({ step: Constants.STEP_AGGREGATE });
    }
  }

  private createChangePath(
    rowNodeTransactions: (RowNodeTransaction | null)[] | undefined,
  ): ChangedPath {
    // for updates, if the row is updated at all, then we re-calc all the values
    // in that row. we could compare each value to each old value, however if we
    // did this, we would be calling the valueService twice, once on the old value
    // and once on the new value. so it's less valueGetter calls if we just assume
    // each column is different. that way the changedPath is used so that only
    // the impacted parent rows are recalculated, parents who's children have
    // not changed are not impacted.

    const noTransactions = _.missingOrEmpty(rowNodeTransactions);

    const changedPath = new ChangedPath(false, this.rootNode);

    if (noTransactions || this.gridOptionsWrapper.isTreeData()) {
      changedPath.setInactive();
    }

    return changedPath;
  }

  /**
   * 更新数据rowModel，基于无break的switch选择分支，实现从某一步开始一直执行到结束的流程
   * @param params 更新参数
   */
  public refreshModel(params: RefreshModelParams): void {
    // this goes through the pipeline of stages. what's in my head is similar
    // to the diagram on this page:
    // http://commons.apache.org/sandbox/commons-pipeline/pipeline_basics.html
    // however we want to keep the results of each stage, hence we manually call
    // each step rather than have them chain each other.

    // fallthrough in below switch is on purpose,
    // eg if STEP_FILTER, then all steps below this step get done
    // let start: number;
    // console.log('======= start =======');

    const changedPath: ChangedPath = this.createChangePath(
      params.rowNodeTransactions,
    );

    switch (params.step) {
      case constants.STEP_EVERYTHING:
        // start = new Date().getTime();
        this.doRowGrouping(
          params.groupState,
          params.rowNodeTransactions,
          params.rowNodeOrder,
          changedPath,
          params.afterColumnsChanged,
        );
      // console.log('rowGrouping = ' + (new Date().getTime() - start));
      case constants.STEP_FILTER:
        // start = new Date().getTime();
        this.doFilter(changedPath);
      // console.log('filter = ' + (new Date().getTime() - start));
      case constants.STEP_PIVOT:
        this.doPivot(changedPath);
      case constants.STEP_AGGREGATE: // depends on agg fields
        // start = new Date().getTime();
        this.doAggregate(changedPath);
      // console.log('aggregation = ' + (new Date().getTime() - start));
      case constants.STEP_SORT:
        // start = new Date().getTime();
        this.doSort(params.rowNodeTransactions, changedPath);
      // console.log('sort = ' + (new Date().getTime() - start));
      case constants.STEP_MAP:
        // start = new Date().getTime();
        this.doRowsToDisplay();
      // console.log('rowsToDisplay = ' + (new Date().getTime() - start));
    }

    // set all row tops to null, then set row tops on all visible rows. if we don't
    // do this, then the algorithm below only sets row tops, old row tops from old rows
    // will still lie around
    this.resetRowTops(this.rootNode, changedPath);
    this.setRowTops();

    const event: ModelUpdatedEvent = {
      type: Events.EVENT_MODEL_UPDATED,
      api: this.gridApi,
      columnApi: this.columnApi,
      animate: params.animate,
      keepRenderedRows: params.keepRenderedRows,
      newData: params.newData,
      newPage: false,
    };
    this.eventService.dispatchEvent(event);

    if (this.$scope) {
      window.setTimeout(() => {
        this.$scope.$apply();
      }, 0);
    }
  }

  public isEmpty(): boolean {
    let rowsMissing: boolean;

    const doingLegacyTreeData = _.exists(
      this.gridOptionsWrapper.getNodeChildDetailsFunc(),
    );
    if (doingLegacyTreeData) {
      rowsMissing =
        _.missing(this.rootNode.childrenAfterGroup) ||
        this.rootNode.childrenAfterGroup.length === 0;
    } else {
      rowsMissing =
        _.missing(this.rootNode.allLeafChildren) ||
        this.rootNode.allLeafChildren.length === 0;
    }

    const empty =
      _.missing(this.rootNode) ||
      rowsMissing ||
      !this.columnController.isReady();

    return empty;
  }

  public isRowsToRender(): boolean {
    return _.exists(this.rowsToDisplay) && this.rowsToDisplay.length > 0;
  }

  public getNodesInRangeForSelection(
    firstInRange: RowNode,
    lastInRange: RowNode,
  ): RowNode[] {
    // if lastSelectedNode is missing, we start at the first row
    let firstRowHit = !lastInRange;
    let lastRowHit = false;
    let lastRow: RowNode;

    const result: RowNode[] = [];

    const groupsSelectChildren = this.gridOptionsWrapper.isGroupSelectsChildren();

    this.forEachNodeAfterFilterAndSort((rowNode) => {
      const lookingForLastRow = firstRowHit && !lastRowHit;

      // check if we need to flip the select switch
      if (!firstRowHit) {
        if (rowNode === lastInRange || rowNode === firstInRange) {
          firstRowHit = true;
        }
      }

      const skipThisGroupNode = rowNode.group && groupsSelectChildren;
      if (!skipThisGroupNode) {
        const inRange = firstRowHit && !lastRowHit;
        const childOfLastRow = rowNode.isParentOfNode(lastRow);
        if (inRange || childOfLastRow) {
          result.push(rowNode);
        }
      }

      if (lookingForLastRow) {
        if (rowNode === lastInRange || rowNode === firstInRange) {
          lastRowHit = true;
          if (rowNode === lastInRange) {
            lastRow = lastInRange;
          } else {
            lastRow = firstInRange;
          }
        }
      }
    });

    return result;
  }

  public setDatasource(datasource: any): void {
    console.error(
      'ag-Grid: should never call setDatasource on clientSideRowController',
    );
  }

  public getTopLevelNodes(): RowNode[] | null {
    return this.rootNode ? this.rootNode.childrenAfterGroup : null;
  }

  public getRootNode(): RowNode {
    return this.rootNode;
  }

  public getRow(index: number): RowNode {
    return this.rowsToDisplay[index];
  }

  public isRowPresent(rowNode: RowNode): boolean {
    return this.rowsToDisplay.indexOf(rowNode) >= 0;
  }

  public getRowIndexAtPixel(pixelToMatch: number): number {
    if (this.isEmpty()) {
      return -1;
    }

    // do binary search of tree
    // http://oli.me.uk/2013/06/08/searching-javascript-arrays-with-a-binary-search/
    let bottomPointer = 0;
    let topPointer = this.rowsToDisplay.length - 1;

    // quick check, if the pixel is out of bounds, then return last row
    if (pixelToMatch <= 0) {
      // if pixel is less than or equal zero, it's always the first row
      return 0;
    }
    const lastNode = _.last(this.rowsToDisplay);
    if (lastNode.rowTop <= pixelToMatch) {
      return this.rowsToDisplay.length - 1;
    }

    while (true) {
      const midPointer = Math.floor((bottomPointer + topPointer) / 2);
      const currentRowNode = this.rowsToDisplay[midPointer];

      if (this.isRowInPixel(currentRowNode, pixelToMatch)) {
        return midPointer;
      }

      if (currentRowNode.rowTop < pixelToMatch) {
        bottomPointer = midPointer + 1;
      } else if (currentRowNode.rowTop > pixelToMatch) {
        topPointer = midPointer - 1;
      }
    }
  }

  private isRowInPixel(rowNode: RowNode, pixelToMatch: number): boolean {
    const topPixel = rowNode.rowTop;
    const bottomPixel = rowNode.rowTop + rowNode.rowHeight;
    const pixelInRow = topPixel <= pixelToMatch && bottomPixel > pixelToMatch;
    return pixelInRow;
  }

  public getCurrentPageHeight(): number {
    if (this.rowsToDisplay && this.rowsToDisplay.length > 0) {
      const lastRow = _.last(this.rowsToDisplay);
      const lastPixel = lastRow.rowTop + lastRow.rowHeight;
      return lastPixel;
    }

    return 0;
  }

  public forEachLeafNode(
    callback: (node: RowNode, index: number) => void,
  ): void {
    if (this.rootNode.allLeafChildren) {
      this.rootNode.allLeafChildren.forEach((rowNode, index) =>
        callback(rowNode, index),
      );
    }
  }

  public forEachNode(callback: (node: RowNode, index: number) => void): void {
    this.recursivelyWalkNodesAndCallback(
      this.rootNode.childrenAfterGroup,
      callback,
      RecursionType.Normal,
      0,
    );
  }

  public forEachNodeAfterFilter(
    callback: (node: RowNode, index: number) => void,
  ): void {
    this.recursivelyWalkNodesAndCallback(
      this.rootNode.childrenAfterFilter,
      callback,
      RecursionType.AfterFilter,
      0,
    );
  }

  public forEachNodeAfterFilterAndSort(
    callback: (node: RowNode, index: number) => void,
  ): void {
    this.recursivelyWalkNodesAndCallback(
      this.rootNode.childrenAfterSort,
      callback,
      RecursionType.AfterFilterAndSort,
      0,
    );
  }

  public forEachPivotNode(
    callback: (node: RowNode, index: number) => void,
  ): void {
    this.recursivelyWalkNodesAndCallback(
      [this.rootNode],
      callback,
      RecursionType.PivotNodes,
      0,
    );
  }

  // iterates through each item in memory, and calls the callback function
  // nodes - the rowNodes to traverse
  // callback - the user provided callback
  // recursion type - need this to know what child nodes to recurse, eg if looking at all nodes, or filtered notes etc
  // index - works similar to the index in forEach in javascript's array function
  private recursivelyWalkNodesAndCallback(
    nodes: RowNode[],
    callback: (node: RowNode, index: number) => void,
    recursionType: RecursionType,
    index: number,
  ) {
    if (!nodes) {
      return index;
    }

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      callback(node, index++);
      // go to the next level if it is a group
      if (node.hasChildren()) {
        // depending on the recursion type, we pick a difference set of children
        let nodeChildren: RowNode[] | null = null;
        switch (recursionType) {
          case RecursionType.Normal:
            nodeChildren = node.childrenAfterGroup;
            break;
          case RecursionType.AfterFilter:
            nodeChildren = node.childrenAfterFilter;
            break;
          case RecursionType.AfterFilterAndSort:
            nodeChildren = node.childrenAfterSort;
            break;
          case RecursionType.PivotNodes:
            // for pivot, we don't go below leafGroup levels
            nodeChildren = !node.leafGroup ? node.childrenAfterSort : null;
            break;
        }
        if (nodeChildren) {
          index = this.recursivelyWalkNodesAndCallback(
            nodeChildren,
            callback,
            recursionType,
            index,
          );
        }
      }
    }
    return index;
  }

  // it's possible to recompute the aggregate without doing the other parts
  // + gridApi.recomputeAggregates()
  public doAggregate(changedPath?: ChangedPath): void {
    if (this.aggregationStage) {
      this.aggregationStage.execute({
        rowNode: this.rootNode,
        changedPath: changedPath,
      });
    }
  }

  // + gridApi.expandAll()
  // + gridApi.collapseAll()
  public expandOrCollapseAll(expand: boolean): void {
    const usingTreeData = this.gridOptionsWrapper.isTreeData();
    if (this.rootNode) {
      recursiveExpandOrCollapse(this.rootNode.childrenAfterGroup);
    }

    function recursiveExpandOrCollapse(rowNodes: RowNode[]): void {
      if (!rowNodes) {
        return;
      }

      rowNodes.forEach((rowNode) => {
        const shouldExpandOrCollapse = usingTreeData
          ? _.exists(rowNode.childrenAfterGroup)
          : rowNode.group;
        if (shouldExpandOrCollapse) {
          rowNode.expanded = expand;
          recursiveExpandOrCollapse(rowNode.childrenAfterGroup);
        }
      });
    }

    this.refreshModel({ step: Constants.STEP_MAP });

    const eventSource = expand ? 'expandAll' : 'collapseAll';
    const event: ExpandCollapseAllEvent = {
      api: this.gridApi,
      columnApi: this.columnApi,
      type: Events.EVENT_EXPAND_COLLAPSE_ALL,
      source: eventSource,
    };
    this.eventService.dispatchEvent(event);
  }

  private doSort(
    rowNodeTransactions: RowNodeTransaction[],
    changedPath: ChangedPath,
  ) {
    this.sortStage.execute({
      rowNode: this.rootNode,
      rowNodeTransactions: rowNodeTransactions,
      changedPath: changedPath,
    });
  }

  private doRowGrouping(
    groupState: any,
    rowNodeTransactions: (RowNodeTransaction | null)[] | undefined,
    rowNodeOrder: { [id: string]: number } | undefined,
    changedPath: ChangedPath,
    afterColumnsChanged: boolean,
  ) {
    // grouping is enterprise only, so if service missing, skip the step
    const doingLegacyTreeData = _.exists(
      this.gridOptionsWrapper.getNodeChildDetailsFunc(),
    );
    if (doingLegacyTreeData) {
      return;
    }

    if (this.groupStage) {
      if (rowNodeTransactions) {
        this.groupStage.execute({
          rowNode: this.rootNode,
          rowNodeTransactions: rowNodeTransactions,
          rowNodeOrder: rowNodeOrder,
          changedPath: changedPath,
        });
      } else {
        // groups are about to get disposed, so need to deselect any that are selected
        this.selectionController.removeGroupsFromSelection();
        this.groupStage.execute({
          rowNode: this.rootNode,
          changedPath: changedPath,
          afterColumnsChanged: afterColumnsChanged,
        });
        // set open/closed state on groups
        this.restoreGroupState(groupState);
      }

      if (this.gridOptionsWrapper.isGroupSelectsChildren()) {
        this.selectionController.updateGroupsFromChildrenSelections(
          changedPath,
        );
      }
    } else {
      this.rootNode.childrenAfterGroup = this.rootNode.allLeafChildren;
    }
  }

  private restoreGroupState(groupState: any): void {
    if (!groupState) {
      return;
    }

    _.traverseNodesWithKey(
      this.rootNode.childrenAfterGroup,
      (node: RowNode, key: string) => {
        // if the group was open last time, then open it this time. however
        // if was not open last time, then don't touch the group, so the 'groupDefaultExpanded'
        // setting will take effect.
        if (typeof groupState[key] === 'boolean') {
          node.expanded = groupState[key];
        }
      },
    );
  }

  private doFilter(changedPath: ChangedPath) {
    this.filterStage.execute({
      rowNode: this.rootNode,
      changedPath: changedPath,
    });
  }

  private doPivot(changedPath: ChangedPath) {
    if (this.pivotStage) {
      this.pivotStage.execute({
        rowNode: this.rootNode,
        changedPath: changedPath,
      });
    }
  }

  private getGroupState(): any {
    if (
      !this.rootNode.childrenAfterGroup ||
      !this.gridOptionsWrapper.isRememberGroupStateWhenNewData()
    ) {
      return null;
    }
    const result: any = {};
    _.traverseNodesWithKey(
      this.rootNode.childrenAfterGroup,
      (node: RowNode, key: string) => (result[key] = node.expanded),
    );
    return result;
  }

  public getCopyOfNodesMap(): { [id: string]: RowNode } {
    return this.nodeManager.getCopyOfNodesMap();
  }

  public getRowNode(id: string): RowNode {
    return this.nodeManager.getRowNode(id);
  }

  /** rows: the rows to put into the model，只是处理rowData的入口 */
  public setRowData(rowData: any[]): void {
    // no need to invalidate cache, as the cache is stored on the rowNode,
    // so new rowNodes means the cache is wiped anyway.

    // remember group state, so we can expand groups that should be expanded
    const groupState = this.getGroupState();

    this.nodeManager.setRowData(rowData);

    // this event kicks off:
    // - clears selection
    // - updates filters
    // - shows 'no rows' overlay if needed
    const rowDataChangedEvent: RowDataChangedEvent = {
      type: Events.EVENT_ROW_DATA_CHANGED,
      api: this.gridApi,
      columnApi: this.columnApi,
    };

    // 触发 rowDataChanged 事件
    this.eventService.dispatchEvent(rowDataChangedEvent);

    this.refreshModel({
      step: Constants.STEP_EVERYTHING,
      groupState: groupState,
      newData: true,
    });
  }

  public batchUpdateRowData(
    rowDataTransaction: RowDataTransaction,
    callback?: (res: RowNodeTransaction) => void,
  ): void {
    if (!this.rowDataTransactionBatch) {
      this.rowDataTransactionBatch = [];
      const waitMillis = this.gridOptionsWrapper.getAsyncTransactionWaitMillis();
      window.setTimeout(() => {
        this.executeBatchUpdateRowData();
        this.rowDataTransactionBatch = null;
      }, waitMillis);
    }
    this.rowDataTransactionBatch.push({
      rowDataTransaction: rowDataTransaction,
      callback: callback,
    });
  }

  private executeBatchUpdateRowData(): void {
    this.valueCache.onDataChanged();

    const callbackFuncsBound: Function[] = [];
    const rowNodeTrans: (RowNodeTransaction | null)[] = [];

    if (this.rowDataTransactionBatch) {
      this.rowDataTransactionBatch.forEach((tranItem) => {
        const rowNodeTran = this.nodeManager.updateRowData(
          tranItem.rowDataTransaction,
          null,
        );
        rowNodeTrans.push(rowNodeTran);
        if (tranItem.callback) {
          callbackFuncsBound.push(tranItem.callback.bind(null, rowNodeTran));
        }
      });
    }

    this.commonUpdateRowData(rowNodeTrans);

    // do callbacks in next VM turn so it's async
    if (callbackFuncsBound.length > 0) {
      window.setTimeout(() => {
        callbackFuncsBound.forEach((func) => func());
      }, 0);
    }
  }

  public updateRowData(
    rowDataTran: RowDataTransaction,
    rowNodeOrder?: { [id: string]: number },
  ): RowNodeTransaction | null {
    this.valueCache.onDataChanged();

    const rowNodeTran = this.nodeManager.updateRowData(
      rowDataTran,
      rowNodeOrder,
    );

    this.commonUpdateRowData([rowNodeTran], rowNodeOrder);

    return rowNodeTran;
  }

  // common to updateRowData and batchUpdateRowData
  private commonUpdateRowData(
    rowNodeTrans: (RowNodeTransaction | null)[],
    rowNodeOrder?: { [id: string]: number },
  ): void {
    this.refreshModel({
      step: Constants.STEP_EVERYTHING,
      rowNodeTransactions: rowNodeTrans,
      rowNodeOrder: rowNodeOrder,
      keepRenderedRows: true,
      animate: true,
      keepEditingRows: true,
    });

    const event: RowDataUpdatedEvent = {
      type: Events.EVENT_ROW_DATA_UPDATED,
      api: this.gridApi,
      columnApi: this.columnApi,
    };
    this.eventService.dispatchEvent(event);
  }

  private doRowsToDisplay() {
    this.rowsToDisplay = this.flattenStage.execute({
      rowNode: this.rootNode,
    }) as RowNode[];
  }

  public onRowHeightChanged(): void {
    this.refreshModel({
      step: Constants.STEP_MAP,
      keepRenderedRows: true,
      keepEditingRows: true,
    });
  }

  public resetRowHeights(): void {
    this.forEachNode((rowNode) => {
      rowNode.setRowHeight(null);
      // forEachNode doesn't go through detail rows, so need to check
      // for detail nodes explicitly.
      if (rowNode.detailNode) {
        rowNode.detailNode.setRowHeight(null);
      }
    });
    this.onRowHeightChanged();
  }
}
