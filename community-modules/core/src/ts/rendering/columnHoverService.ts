import { Autowired, Bean } from '../context/context';
import { Events, ColumnHoverChangedEvent } from '../events';
import { Column } from '../entities/column';
import { BeanStub } from '../context/beanStub';
import { ColumnApi } from '../columnController/columnApi';
import { GridApi } from '../gridApi';

/**
 * 在表头列触发columnHoverChanged事件
 */
@Bean('columnHoverService')
export class ColumnHoverService extends BeanStub {
  @Autowired('columnApi') private columnApi: ColumnApi;
  @Autowired('gridApi') private gridApi: GridApi;

  private selectedColumns: Column[];

  public setMouseOver(columns: Column[]): void {
    this.selectedColumns = columns;
    const event: ColumnHoverChangedEvent = {
      type: Events.EVENT_COLUMN_HOVER_CHANGED,
      api: this.gridApi,
      columnApi: this.columnApi,
    };
    this.eventService.dispatchEvent(event);
  }

  public clearMouseOver(): void {
    this.selectedColumns = null;
    const event: ColumnHoverChangedEvent = {
      type: Events.EVENT_COLUMN_HOVER_CHANGED,
      api: this.gridApi,
      columnApi: this.columnApi,
    };
    this.eventService.dispatchEvent(event);
  }

  public isHovered(column: Column): boolean {
    return this.selectedColumns && this.selectedColumns.indexOf(column) >= 0;
  }
}
