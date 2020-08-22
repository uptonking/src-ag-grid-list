import {
  Autowired,
  Bean,
  GridOptionsWrapper,
  IRowNodeStage,
  SelectableService,
  StageExecuteParams,
  BeanStub,
} from '@ag-grid-community/core';

import { FilterService } from './filterService';

@Bean('filterStage')
export class FilterStage extends BeanStub implements IRowNodeStage {
  @Autowired('gridOptionsWrapper')
  private gridOptionsWrapper: GridOptionsWrapper;
  @Autowired('selectableService') private selectableService: SelectableService;
  @Autowired('filterService') private filterService: FilterService;

  public execute(params: StageExecuteParams): void {
    const { rowNode, changedPath } = params;

    this.filterService.filter(changedPath);

    this.selectableService.updateSelectableAfterFiltering(rowNode);
  }
}
