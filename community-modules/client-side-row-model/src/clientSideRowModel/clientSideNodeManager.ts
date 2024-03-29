import {
  RowNode,
  GridOptionsWrapper,
  Context,
  GetNodeChildDetails,
  IsRowMaster,
  EventService,
  ColumnController,
  Events,
  SelectionChangedEvent,
  GridApi,
  ColumnApi,
  SelectionController,
  RowDataTransaction,
  RowNodeTransaction,
  _,
} from '@ag-grid-community/core';

/**
 * 将rowData计算成rowModel结构的数据并保存到allNodesMap，还提供了对数据进行crud的方法
 */
export class ClientSideNodeManager {
  /** grid行默认所处的层级为0，若行中存在其他行，则行中行的层级会+1 */
  private static TOP_LEVEL = 0;
  private static ROOT_NODE_ID = 'ROOT_NODE_ID';

  /** 所有行数据rowData会挂载在rootNode根节点下形成树形结构，rootNode自身可看做一行，但不会显示，level为-1 */
  private rootNode: RowNode;
  private gridOptionsWrapper: GridOptionsWrapper;
  private context: Context;
  private eventService: EventService;
  private columnController: ColumnController;
  private selectionController: SelectionController;

  /** 当前行rowNode的默认id，每次自增1 */
  private nextId = 0;

  /** 会从gridOptions中得到的获取子节点数据的方法 */
  private getNodeChildDetails: GetNodeChildDetails;
  /** 会从gridOptions中得到 */
  private doesDataFlower: (data: any) => boolean;
  private isRowMasterFunc: IsRowMaster;
  /**
   * 默认false。If true, rowNodes don't get their parents set.
   * If this is a problem (e.g. if you need to convert the tree to JSON,
   * which does not allow cyclic dependencies) then set this to true.
   */
  private suppressParentsInRowNodes: boolean;

  private doingLegacyTreeData: boolean;
  private doingTreeData: boolean;
  private doingMasterDetail: boolean;

  /**
   * 存放每行id和每行数据RowNode的映射表集合。when user is provide the id's, we also keep
   * a map of ids to row nodes for convenience
   */
  private allNodesMap: { [id: string]: RowNode } = {};
  private columnApi: ColumnApi;
  private gridApi: GridApi;

  constructor(
    rootNode: RowNode,
    gridOptionsWrapper: GridOptionsWrapper,
    context: Context,
    eventService: EventService,
    columnController: ColumnController,
    gridApi: GridApi,
    columnApi: ColumnApi,
    selectionController: SelectionController,
  ) {
    this.rootNode = rootNode;
    this.gridOptionsWrapper = gridOptionsWrapper;
    this.context = context;
    this.eventService = eventService;
    this.columnController = columnController;
    this.gridApi = gridApi;
    this.columnApi = columnApi;
    this.selectionController = selectionController;

    this.rootNode.group = true;
    this.rootNode.level = -1;
    this.rootNode.id = ClientSideNodeManager.ROOT_NODE_ID;
    this.rootNode.allLeafChildren = [];
    this.rootNode.childrenAfterGroup = [];
    this.rootNode.childrenAfterSort = [];
    this.rootNode.childrenAfterFilter = [];

    // if we make this class a bean, then can annotate postConstruct
    this.postConstruct();
  }

  // @PostConstruct - this is not a bean, so postConstruct called by constructor
  public postConstruct(): void {
    // func below doesn't have 'this' pointer, so need to pull out these bits
    this.getNodeChildDetails =
      this.gridOptionsWrapper.getNodeChildDetailsFunc();
    this.suppressParentsInRowNodes =
      this.gridOptionsWrapper.isSuppressParentsInRowNodes();
    this.doesDataFlower = this.gridOptionsWrapper.getDoesDataFlowerFunc();
    this.isRowMasterFunc = this.gridOptionsWrapper.getIsRowMasterFunc();

    this.doingTreeData = this.gridOptionsWrapper.isTreeData();
    this.doingLegacyTreeData =
      !this.doingTreeData && _.exists(this.getNodeChildDetails);
    this.doingMasterDetail = this.gridOptionsWrapper.isMasterDetail();

    if (this.getNodeChildDetails) {
      console.warn(`ag-Grid: the callback nodeChildDetailsFunc() is now deprecated. The new way of doing
                                    tree data in ag-Grid was introduced in v14 (released November 2017). In the next
                                    major release of ag-Grid we will be dropping support for the old version of
                                    tree data. If you are reading this message, please go to the docs to see how
                                    to implement Tree Data without using nodeChildDetailsFunc().`);
    }
  }

  public getCopyOfNodesMap(): { [id: string]: RowNode } {
    const result: { [id: string]: RowNode } = _.cloneObject(this.allNodesMap);
    return result;
  }

  public getRowNode(id: string): RowNode {
    return this.allNodesMap[id];
  }

  /**
   * 将rowData计算成rowModel模型的入口
   * @param rowData 传入grid的原数据
   */
  public setRowData(rowData: any[]): RowNode[] {
    this.rootNode.childrenAfterFilter = null;
    this.rootNode.childrenAfterGroup = null;
    this.rootNode.childrenAfterSort = null;
    this.rootNode.childrenMapped = null;

    this.nextId = 0;
    // 设置数据前会先清空原rowModel模型
    this.allNodesMap = {};

    if (!rowData) {
      this.rootNode.allLeafChildren = [];
      this.rootNode.childrenAfterGroup = [];
      return;
    }

    // 递归地将rowData计算成rowModel
    // kick off recursion
    // we add rootNode as the parent, however if using ag-grid-enterprise, the grouping stage
    // sets the parent node on each row (even if we are not grouping). so setting parent node
    // here is for benefit of ag-grid-community users
    const result = this.recursiveFunction(
      rowData,
      this.rootNode,
      ClientSideNodeManager.TOP_LEVEL,
    );

    if (this.doingLegacyTreeData) {
      this.rootNode.childrenAfterGroup = result;
      this.setLeafChildren(this.rootNode);
    } else {
      this.rootNode.allLeafChildren = result;
    }
  }

  /**
   * 计算代表每一行数据对应的RowNode对象，若不存在子行，则直接执行简单计算，若存在子行，则会递归计算所有行的rowNode
   * @param rowData 当前行层级所有行数据的数组
   * @param parent 代表当前行层级直接父行的RowNode，最顶层是rootNode
   * @param level 当前行层级，最顶层rootNode是-1，无嵌套的简单grid的数据行层级是0，子grid层级逐层加1
   */
  private recursiveFunction(
    rowData: any[],
    parent: RowNode,
    level: number,
  ): RowNode[] {
    // make sure the rowData is an array and not a string of json - this was a commonly reported problem on the forum
    if (typeof rowData === 'string') {
      console.warn(
        'ag-Grid: rowData must be an array, however you passed in a string. If you are loading JSON, make sure you convert the JSON string to JavaScript objects first',
      );
      return;
    }

    const rowNodes: RowNode[] = [];
    rowData.forEach((dataItem) => {
      // 对原数据数组每一行的对象，创建一个RowNode对象
      const node = this.createNode(dataItem, parent, level);
      rowNodes.push(node);
    });
    return rowNodes;
  }

  /**
   * 对一行的数据dataItem创建相应的rowNode行对象，若该行包含子grid，则递归创建子grid各行的rowNode
   * @param dataItem 该行对应的数据对象
   * @param parent 代表直接父行的RowNode
   * @param level 该行所处的层级
   */
  private createNode(dataItem: any, parent: RowNode, level: number): RowNode {
    // 该行数据对应的RowNode对象，方法最后会返回这个对象
    const node = new RowNode();
    this.context.createBean(node);

    // 若该行存在子行，则计算子行数据
    const nodeChildDetails = this.doingLegacyTreeData
      ? this.getNodeChildDetails(dataItem)
      : null;

    // 若存在details结构，则递归创建子行的rowNode对象
    if (nodeChildDetails && nodeChildDetails.group) {
      node.group = true;
      node.childrenAfterGroup = this.recursiveFunction(
        nodeChildDetails.children,
        node,
        // 子行的level会+1
        level + 1,
      );
      node.expanded = nodeChildDetails.expanded === true;
      node.field = nodeChildDetails.field;
      node.key = nodeChildDetails.key;
      // pull out all the leaf children and add to our node
      this.setLeafChildren(node);
    } else {
      // 若不存在details结构，则设置rowNode的master属性
      // 默认会执行这里

      node.group = false;
      this.setMasterForRow(node, dataItem, level, true);
    }

    // support for backwards compatibility, canFlow is now called 'master'
    /** @deprecated is now 'master' */
    node.canFlower = node.master;

    // 设置当前行的信息
    if (parent && !this.suppressParentsInRowNodes) {
      node.parent = parent;
    }
    node.level = level;
    node.setDataAndId(dataItem, this.nextId.toString());

    if (this.allNodesMap[node.id]) {
      console.warn(
        `ag-grid: duplicate node id '${node.id}' detected from getRowNodeId callback, this could cause issues in your grid.`,
      );
    }
    // 将当前行的模型对象rowNode存放到allNodesMap映射表集合
    this.allNodesMap[node.id] = node;

    this.nextId++;

    return node;
  }

  public updateRowData(
    rowDataTran: RowDataTransaction,
    rowNodeOrder: { [id: string]: number } | null | undefined,
  ): RowNodeTransaction | null {
    if (this.isLegacyTreeData()) {
      return null;
    }

    const rowNodeTransaction: RowNodeTransaction = {
      remove: [],
      update: [],
      add: [],
    };

    const nodesToUnselect: RowNode[] = [];

    this.executeAdd(rowDataTran, rowNodeTransaction);
    this.executeRemove(rowDataTran, rowNodeTransaction, nodesToUnselect);
    this.executeUpdate(rowDataTran, rowNodeTransaction, nodesToUnselect);

    this.updateSelection(nodesToUnselect);

    if (rowNodeOrder) {
      _.sortRowNodesByOrder(this.rootNode.allLeafChildren, rowNodeOrder);
    }

    return rowNodeTransaction;
  }

  private updateSelection(nodesToUnselect: RowNode[]): void {
    const selectionChanged = nodesToUnselect.length > 0;
    if (selectionChanged) {
      nodesToUnselect.forEach((rowNode) => {
        rowNode.setSelected(false, false, true);
      });
    }

    // we do this regardless of nodes to unselect or not, as it's possible
    // a new node was inserted, so a parent that was previously selected (as all
    // children were selected) should not be tri-state (as new one unselected against
    // all other selected children).
    this.selectionController.updateGroupsFromChildrenSelections();

    if (selectionChanged) {
      const event: SelectionChangedEvent = {
        type: Events.EVENT_SELECTION_CHANGED,
        api: this.gridApi,
        columnApi: this.columnApi,
      };
      this.eventService.dispatchEvent(event);
    }
  }

  private executeAdd(
    rowDataTran: RowDataTransaction,
    rowNodeTransaction: RowNodeTransaction,
  ): void {
    const { add, addIndex } = rowDataTran;
    if (!add) {
      return;
    }

    const useIndex = typeof addIndex === 'number' && addIndex >= 0;
    if (useIndex) {
      // items get inserted in reverse order for index insertion
      add.reverse().forEach((item) => {
        const newRowNode: RowNode = this.addRowNode(item, addIndex);
        rowNodeTransaction.add.push(newRowNode);
      });
    } else {
      add.forEach((item) => {
        const newRowNode: RowNode = this.addRowNode(item);
        rowNodeTransaction.add.push(newRowNode);
      });
    }
  }

  private executeRemove(
    rowDataTran: RowDataTransaction,
    rowNodeTransaction: RowNodeTransaction,
    nodesToUnselect: RowNode[],
  ): void {
    const { remove } = rowDataTran;

    if (!remove) {
      return;
    }

    const rowIdsRemoved: { [key: string]: boolean } = {};

    remove.forEach((item) => {
      const rowNode = this.lookupRowNode(item);

      if (!rowNode) {
        return;
      }

      // do delete - setting 'suppressFinishActions = true' to ensure EVENT_SELECTION_CHANGED is not raised for
      // each row node updated, instead it is raised once by the calling code if any selected nodes exist.
      if (rowNode.isSelected()) {
        nodesToUnselect.push(rowNode);
      }

      // so row renderer knows to fade row out (and not reposition it)
      rowNode.clearRowTop();

      // NOTE: were we could remove from allLeaveChildren, however _.removeFromArray() is expensive, especially
      // if called multiple times (eg deleting lots of rows) and if allLeafChildren is a large list
      rowIdsRemoved[rowNode.id] = true;
      // _.removeFromArray(this.rootNode.allLeafChildren, rowNode);
      delete this.allNodesMap[rowNode.id];

      rowNodeTransaction.remove.push(rowNode);
    });

    this.rootNode.allLeafChildren = this.rootNode.allLeafChildren.filter(
      (rowNode) => !rowIdsRemoved[rowNode.id],
    );
  }

  private executeUpdate(
    rowDataTran: RowDataTransaction,
    rowNodeTransaction: RowNodeTransaction,
    nodesToUnselect: RowNode[],
  ): void {
    const { update } = rowDataTran;
    if (!update) {
      return;
    }

    update.forEach((item) => {
      const rowNode = this.lookupRowNode(item);

      if (!rowNode) {
        return;
      }

      rowNode.updateData(item);
      if (!rowNode.selectable && rowNode.isSelected()) {
        nodesToUnselect.push(rowNode);
      }

      this.setMasterForRow(
        rowNode,
        item,
        ClientSideNodeManager.TOP_LEVEL,
        false,
      );

      rowNodeTransaction.update.push(rowNode);
    });
  }

  private addRowNode(data: any, index?: number): RowNode {
    const newNode = this.createNode(
      data,
      this.rootNode,
      ClientSideNodeManager.TOP_LEVEL,
    );

    if (_.exists(index)) {
      _.insertIntoArray(this.rootNode.allLeafChildren, newNode, index);
    } else {
      this.rootNode.allLeafChildren.push(newNode);
    }

    return newNode;
  }

  private lookupRowNode(data: any): RowNode {
    const rowNodeIdFunc = this.gridOptionsWrapper.getRowNodeIdFunc();

    let rowNode: RowNode;
    if (_.exists(rowNodeIdFunc)) {
      // find rowNode using id
      const id: string = rowNodeIdFunc(data);
      rowNode = this.allNodesMap[id];
      if (!rowNode) {
        console.error(
          `ag-Grid: could not find row id=${id}, data item was not found for this id`,
        );
        return null;
      }
    } else {
      // find rowNode using object references
      rowNode = _.find(
        this.rootNode.allLeafChildren,
        (rowNode) => rowNode.data === data,
      );
      if (!rowNode) {
        console.error(
          `ag-Grid: could not find data item as object was not found`,
          data,
        );
        return null;
      }
    }

    return rowNode;
  }

  /** 设置rowNode的master属性 */
  private setMasterForRow(
    rowNode: RowNode,
    data: any,
    level: number,
    setExpanded: boolean,
  ): void {
    if (this.doingTreeData) {
      rowNode.setMaster(false);
      if (setExpanded) {
        rowNode.expanded = false;
      }
    } else {
      // this is the default, for when doing grid data，
      if (this.doesDataFlower) {
        rowNode.setMaster(this.doesDataFlower(data));
      } else if (this.doingMasterDetail) {
        // if we are doing master detail, then the
        // default is that everything can be a Master Row.

        if (this.isRowMasterFunc) {
          rowNode.setMaster(this.isRowMasterFunc(data));
        } else {
          rowNode.setMaster(true);
        }
      } else {
        rowNode.setMaster(false);
      }

      if (setExpanded) {
        const rowGroupColumns = this.columnController.getRowGroupColumns();
        const numRowGroupColumns = rowGroupColumns ? rowGroupColumns.length : 0;

        // need to take row group into account when determining level
        const masterRowLevel = level + numRowGroupColumns;

        rowNode.expanded = rowNode.master
          ? this.isExpanded(masterRowLevel)
          : false;
      }
    }
  }

  private isExpanded(level: any) {
    const expandByDefault = this.gridOptionsWrapper.getGroupDefaultExpanded();
    if (expandByDefault === -1) {
      return true;
    } else {
      return level < expandByDefault;
    }
  }

  // this is only used for doing legacy tree data
  private setLeafChildren(node: RowNode): void {
    node.allLeafChildren = [];
    if (node.childrenAfterGroup) {
      node.childrenAfterGroup.forEach((childAfterGroup) => {
        if (childAfterGroup.group) {
          if (childAfterGroup.allLeafChildren) {
            childAfterGroup.allLeafChildren.forEach((leafChild) =>
              node.allLeafChildren.push(leafChild),
            );
          }
        } else {
          node.allLeafChildren.push(childAfterGroup);
        }
      });
    }
  }

  public isLegacyTreeData(): boolean {
    const rowsAlreadyGrouped = _.exists(
      this.gridOptionsWrapper.getNodeChildDetailsFunc(),
    );
    if (rowsAlreadyGrouped) {
      console.warn(
        'ag-Grid: adding and removing rows is not supported when using nodeChildDetailsFunc, ie it is not ' +
          'supported for legacy tree data. Please see the docs on the new preferred way of providing tree data that works with delta updates.',
      );
      return true;
    } else {
      return false;
    }
  }
}
