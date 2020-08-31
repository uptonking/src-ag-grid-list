/**
 * 预定义的模块名称，如ClientSideRowModelModule=@ag-grid-community/client-side-row-model
 */
export enum ModuleNames {
  // when using modules, user references this
  CommunityCoreModule = '@ag-grid-community/core', // should this be grid-community-core?
  // when not using modules, user references this
  CommunityAllModules = '@ag-grid-community/all', // should this be grid-community-all

  // community modules
  ClientSideRowModelModule = '@ag-grid-community/client-side-row-model',
  InfiniteRowModelModule = '@ag-grid-community/infinite-row-model',
  CsvExportModule = '@ag-grid-community/csv-export',
  RowNodeCache = '@ag-grid-community/row-node-cache',

  // enterprise core - users never import on this, but other enterprise modules do
  EnterpriseCoreModule = '@ag-grid-enterprise/core', // should this be grid-enterprise-core?
  // when not using modules, user references this
  EnterpriseAllModules = '@ag-grid-enterprise/all', // should this be grid-enterprise-all

  // enterprise modules
  RowGroupingModule = '@ag-grid-enterprise/row-grouping',
  ColumnToolPanelModule = '@ag-grid-enterprise/column-tool-panel',
  FiltersToolPanelModule = '@ag-grid-enterprise/filters-tool-panel',
  MenuModule = '@ag-grid-enterprise/menu',
  SetFilterModule = '@ag-grid-enterprise/set-filter',
  StatusBarModule = '@ag-grid-enterprise/status-bar',
  SideBarModule = '@ag-grid-enterprise/side-bar',
  RangeSelectionModule = '@ag-grid-enterprise/range-selection',
  MasterDetailModule = '@ag-grid-enterprise/master-detail',
  RichSelectModule = '@ag-grid-enterprise/rich-select',
  GridChartsModule = '@ag-grid-enterprise/charts',
  ViewportRowModelModule = '@ag-grid-enterprise/viewport-row-model',
  ServerSideRowModelModule = '@ag-grid-enterprise/server-side-row-model', // or
  ExcelExportModule = '@ag-grid-enterprise/excel-export',
  ClipboardModule = '@ag-grid-enterprise/clipboard',
  DateTimeCellEditorModule = '@ag-grid-enterprise/date-time-cell-editor',

  // framework wrappers currently don't provide beans, comps etc, so no need to be modules,
  // however i argue they should be as in theory they 'could' provide beans etc
  AngularModule = '@ag-grid-community/angular',
  ReactModule = '@ag-grid-community/react',
  VueModule = '@ag-grid-community/vue',
  PolymerModule = '@ag-grid-community/polymer',

  // and then this, which is definitely not a grid module, as it should not have any dependency
  // on the grid (ie shouldn't even reference the Module interface)
  // ChartsModule = "@ag-grid-community/charts-core",
}
