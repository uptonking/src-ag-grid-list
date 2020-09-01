import { Bean, Autowired } from '../context/context';
import { BeanStub } from '../context/beanStub';
import { Events, ScrollVisibilityChangedEvent } from '../events';
import { ColumnController } from '../columnController/columnController';
import { ColumnApi } from '../columnController/columnApi';
import { GridApi } from '../gridApi';
import { GridOptionsWrapper } from '../gridOptionsWrapper';
import { _ } from '../utils';

export interface SetScrollsVisibleParams {
  horizontalScrollShowing: boolean;
  verticalScrollShowing: boolean;
}

/**
 * 滚动条显示隐藏控制service
 */
@Bean('scrollVisibleService')
export class ScrollVisibleService extends BeanStub {
  @Autowired('columnController') private columnController: ColumnController;
  @Autowired('columnApi') private columnApi: ColumnApi;
  @Autowired('gridApi') private gridApi: GridApi;
  @Autowired('gridOptionsWrapper')
  private gridOptionsWrapper: GridOptionsWrapper;

  private horizontalScrollShowing: boolean;
  private verticalScrollShowing: boolean;

  public setScrollsVisible(params: SetScrollsVisibleParams): void {
    const atLeastOneDifferent =
      this.horizontalScrollShowing !== params.horizontalScrollShowing ||
      this.verticalScrollShowing !== params.verticalScrollShowing;

    if (atLeastOneDifferent) {
      this.horizontalScrollShowing = params.horizontalScrollShowing;
      this.verticalScrollShowing = params.verticalScrollShowing;

      const event: ScrollVisibilityChangedEvent = {
        type: Events.EVENT_SCROLL_VISIBILITY_CHANGED,
        api: this.gridApi,
        columnApi: this.columnApi,
      };
      this.eventService.dispatchEvent(event);
    }
  }

  // used by pagination service - to know page height
  public isHorizontalScrollShowing(): boolean {
    return this.horizontalScrollShowing;
  }

  // used by header container
  public isVerticalScrollShowing(): boolean {
    return this.verticalScrollShowing;
  }
}
