import { GridOptionsWrapper } from '../gridOptionsWrapper';
import { Autowired, PostConstruct, PreDestroy } from '../context/context';
import { DropTarget } from '../dragAndDrop/dragAndDropService';
import { ColumnController } from '../columnController/columnController';
import { Events } from '../events';
import { HeaderRowComp, HeaderRowType } from './headerRowComp';
import { BodyDropTarget } from './bodyDropTarget';
import { ScrollVisibleService } from '../gridPanel/scrollVisibleService';
import { Component } from '../widgets/component';
import { Constants } from '../constants';
import { setFixedWidth, clearElement } from '../utils/dom';
import { BeanStub } from '../context/beanStub';
import { GridPanel } from '../gridPanel/gridPanel';

/** 表头的容器，是BeanStub的子类，在HeaderRootComp中创建了左中右3各对象实例，
 * 每个表头行是HeaderRowComp组件的实例 */
export class HeaderContainer extends BeanStub {
  @Autowired('gridOptionsWrapper')
  private gridOptionsWrapper: GridOptionsWrapper;
  @Autowired('columnController') private columnController: ColumnController;
  @Autowired('scrollVisibleService')
  private scrollVisibleService: ScrollVisibleService;

  /** */
  private eContainer: HTMLElement;
  /** */
  private eViewport: HTMLElement;
  /** 所有表头行对象构成的数组 */
  private headerRowComps: HeaderRowComp[] = [];
  private pinned: string;
  private scrollWidth: number;
  private dropTarget: DropTarget;

  constructor(eContainer: HTMLElement, eViewport: HTMLElement, pinned: string) {
    super();
    this.eContainer = eContainer;
    this.pinned = pinned;
    this.eViewport = eViewport;
  }

  public forEachHeaderElement(
    callback: (renderedHeaderElement: Component) => void,
  ): void {
    this.headerRowComps.forEach((headerRowComp) =>
      headerRowComp.forEachHeaderElement(callback),
    );
  }

  /** 第一次执行是由gridCore的postConstruct方法逐层触发 */
  @PostConstruct
  private init(): void {
    this.scrollWidth = this.gridOptionsWrapper.getScrollbarWidth();

    // if value changes, then if not pivoting, we at least need to change the label eg from sum() to avg(),
    // if pivoting, then the columns have changed
    this.addManagedListener(
      this.eventService,
      Events.EVENT_COLUMN_VALUE_CHANGED,
      this.onColumnValueChanged.bind(this),
    ),
      this.addManagedListener(
        this.eventService,
        Events.EVENT_COLUMN_ROW_GROUP_CHANGED,
        this.onColumnRowGroupChanged.bind(this),
      ),
      this.addManagedListener(
        this.eventService,
        Events.EVENT_GRID_COLUMNS_CHANGED,
        this.onGridColumnsChanged.bind(this),
      ),
      this.addManagedListener(
        this.eventService,
        Events.EVENT_SCROLL_VISIBILITY_CHANGED,
        this.onScrollVisibilityChanged.bind(this),
      ),
      this.addManagedListener(
        this.eventService,
        Events.EVENT_COLUMN_RESIZED,
        this.onColumnResized.bind(this),
      ),
      this.addManagedListener(
        this.eventService,
        Events.EVENT_DISPLAYED_COLUMNS_CHANGED,
        this.onDisplayedColumnsChanged.bind(this),
      );
  }

  // if row group changes, that means we may need to add aggFuncs to the column headers,
  // if the grid goes from no aggregation (ie no grouping) to grouping
  private onColumnRowGroupChanged(): void {
    this.onGridColumnsChanged();
  }

  // if the agg func of a column changes, then we may need to update the agg func in columns header
  private onColumnValueChanged(): void {
    this.onGridColumnsChanged();
  }

  private onColumnResized(): void {
    this.setWidthOfPinnedContainer();
  }

  /** 可见表头列变化时，更新grid表格的总宽度 */
  private onDisplayedColumnsChanged(): void {
    this.setWidthOfPinnedContainer();
  }

  private onScrollVisibilityChanged(): void {
    this.setWidthOfPinnedContainer();
  }

  /** 给grid表格宽度加上左右pinned表头及滚动条的宽度 */
  private setWidthOfPinnedContainer(): void {
    const pinningLeft = this.pinned === Constants.PINNED_LEFT;
    const pinningRight = this.pinned === Constants.PINNED_RIGHT;
    const controller = this.columnController;
    const isRtl = this.gridOptionsWrapper.isEnableRtl();

    if (pinningLeft || pinningRight) {
      // size to fit all columns
      let width = controller[
        pinningLeft
          ? 'getPinnedLeftContainerWidth'
          : 'getPinnedRightContainerWidth'
      ]();

      // if there is a scroll showing (and taking up space, so Windows, and not iOS)
      // in the body, then we add extra space to keep header aligned with the body,
      // as body width fits the cols and the scrollbar
      const addPaddingForScrollbar =
        this.scrollVisibleService.isVerticalScrollShowing() &&
        ((isRtl && pinningLeft) || (!isRtl && pinningRight));

      if (addPaddingForScrollbar) {
        width += this.scrollWidth;
      }

      setFixedWidth(this.eContainer, width);
    }
  }

  public getRowComps(): HeaderRowComp[] {
    return this.headerRowComps;
  }

  /** 先执行removeHeaderRowComps()，再执行createHeaderRowComps()。
   * grid cols have changed - this also means the number of rows in the header
   * can have changed. so we remove all the old rows and insert new ones
   * for a complete refresh
   */
  private onGridColumnsChanged() {
    // console.log('==onGridColumnsChanged-removeAndCreateAllRowComps');

    this.removeAndCreateAllRowComps();
  }

  private removeAndCreateAllRowComps(): void {
    this.removeHeaderRowComps();
    this.createHeaderRowComps();
  }

  /** 先执行removeHeaderRowComps()，再执行createHeaderRowComps()。
   * we expose this for gridOptions.api.refreshHeader() to call
   */
  public refresh(): void {
    this.removeAndCreateAllRowComps();
  }

  public setupDragAndDrop(gridComp: GridPanel): void {
    const dropContainer = this.eViewport ? this.eViewport : this.eContainer;
    const bodyDropTarget = new BodyDropTarget(this.pinned, dropContainer);
    this.createManagedBean(bodyDropTarget);
    bodyDropTarget.registerGridComp(gridComp);
  }

  /** 卸载所有表头行，先遍历headerRowComps并调用destroyBean方法，最后移除dom元素 */
  @PreDestroy
  private removeHeaderRowComps(): void {
    this.headerRowComps.forEach((headerRowComp) =>
      this.destroyBean(headerRowComp),
    );
    this.headerRowComps.length = 0;

    clearElement(this.eContainer);
  }

  /** 创建表头各行，行中可包含表头列或分组表头列 */
  private createHeaderRowComps(): void {
    // if we are displaying header groups, then we have many rows here.
    // go through each row of the header, one by one.
    const rowCount = this.columnController.getHeaderRowCount();

    for (let dept = 0; dept < rowCount; dept++) {
      const groupRow = dept !== rowCount - 1;
      const type = groupRow ? HeaderRowType.COLUMN_GROUP : HeaderRowType.COLUMN;
      // 创建一个表头行对象
      const headerRowComp = new HeaderRowComp(
        dept,
        type,
        this.pinned,
        this.dropTarget,
      );
      // 调用表头行对象的钩子方法，这里会给ioc容器中单例的eventService添加各种事件
      this.createBean(headerRowComp);
      this.headerRowComps.push(headerRowComp);
      headerRowComp.setRowIndex(this.headerRowComps.length - 1);
      this.eContainer.appendChild(headerRowComp.getGui());
    }

    // 若表头包含FloatingFilters，则创建FLOATING_FILTER类型的表头行
    if (
      !this.columnController.isPivotMode() &&
      this.columnController.hasFloatingFilters()
    ) {
      const headerRowComp = new HeaderRowComp(
        rowCount,
        HeaderRowType.FLOATING_FILTER,
        this.pinned,
        this.dropTarget,
      );
      this.createBean(headerRowComp);
      this.headerRowComps.push(headerRowComp);
      headerRowComp.setRowIndex(this.headerRowComps.length - 1);
      this.eContainer.appendChild(headerRowComp.getGui());
    }
  }
}
