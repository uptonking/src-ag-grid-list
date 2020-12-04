import {
    _,
    Autowired,
    ColDef,
    ColGroupDef,
    ColumnApi,
    Component,
    GridApi,
    IFiltersToolPanel,
    IToolPanelComp,
    IToolPanelParams,
    RefSelector
} from "@ag-grid-community/core";
import { FiltersToolPanelHeaderPanel } from "./filtersToolPanelHeaderPanel";
import { FiltersToolPanelListPanel } from "./filtersToolPanelListPanel";

export interface ToolPanelFiltersCompParams extends IToolPanelParams {
    suppressExpandAll: boolean;
    suppressFilterSearch: boolean;
    suppressSyncLayoutWithGrid: boolean;
}

export class FiltersToolPanel extends Component implements IFiltersToolPanel, IToolPanelComp {

    private static TEMPLATE = /* html */
        `<div class="ag-filter-toolpanel">
            <ag-filters-tool-panel-header ref="filtersToolPanelHeaderPanel"></ag-filters-tool-panel-header>
            <ag-filters-tool-panel-list ref="filtersToolPanelListPanel"></ag-filters-tool-panel-list> 
         </div>`;

    @RefSelector('filtersToolPanelHeaderPanel') private filtersToolPanelHeaderPanel: FiltersToolPanelHeaderPanel;

    @RefSelector('filtersToolPanelListPanel') private filtersToolPanelListPanel: FiltersToolPanelListPanel;

    @Autowired('gridApi') private gridApi: GridApi;
    @Autowired('columnApi') private columnApi: ColumnApi;

    private initialised = false;
    private params: ToolPanelFiltersCompParams;

    constructor() {
        super(FiltersToolPanel.TEMPLATE);
    }

    public init(params: ToolPanelFiltersCompParams): void {
        this.initialised = true;

        const defaultParams: ToolPanelFiltersCompParams = {
            suppressExpandAll: false,
            suppressFilterSearch: false,
            suppressSyncLayoutWithGrid: false,
            api: this.gridApi,
            columnApi: this.columnApi
        };
        _.mergeDeep(defaultParams, params);
        this.params = defaultParams;

        this.filtersToolPanelHeaderPanel.init(this.params);
        this.filtersToolPanelListPanel.init(this.params);

        const hideExpand = this.params.suppressExpandAll;
        const hideSearch = this.params.suppressFilterSearch;

        if (hideExpand && hideSearch) {
            this.filtersToolPanelHeaderPanel.setDisplayed(false);
        }

        this.addManagedListener(this.filtersToolPanelHeaderPanel, 'expandAll', this.onExpandAll.bind(this));
        this.addManagedListener(this.filtersToolPanelHeaderPanel, 'collapseAll', this.onCollapseAll.bind(this));
        this.addManagedListener(this.filtersToolPanelHeaderPanel, 'searchChanged', this.onSearchChanged.bind(this));

        this.addManagedListener(this.filtersToolPanelListPanel, 'groupExpanded', this.onGroupExpanded.bind(this));
    }

    // lazy initialise the panel
    public setVisible(visible: boolean): void {
        super.setDisplayed(visible);
        if (visible && !this.initialised) {
            this.init(this.params);
        }
    }

    public onExpandAll(): void {
        this.filtersToolPanelListPanel.expandFilterGroups(true);
    }

    public onCollapseAll(): void {
        this.filtersToolPanelListPanel.expandFilterGroups(false);
    }

    private onSearchChanged(event: any): void {
        this.filtersToolPanelListPanel.performFilterSearch(event.searchText);
    }

    public setFilterLayout(colDefs: (ColDef | ColGroupDef)[]): void {
        this.filtersToolPanelListPanel.setFiltersLayout(colDefs);
    }

    private onGroupExpanded(event: any): void {
        this.filtersToolPanelHeaderPanel.setExpandState(event.state);
    }

    public expandFilterGroups(groupIds?: string[]): void {
        this.filtersToolPanelListPanel.expandFilterGroups(true, groupIds);
    }

    public collapseFilterGroups(groupIds?: string[]): void {
        this.filtersToolPanelListPanel.expandFilterGroups(false, groupIds);
    }

    public expandFilters(colIds?: string[]): void {
        this.filtersToolPanelListPanel.expandFilters(true, colIds);
    }

    public collapseFilters(colIds?: string[]): void {
        this.filtersToolPanelListPanel.expandFilters(false, colIds);
    }

    public syncLayoutWithGrid(): void {
        this.filtersToolPanelListPanel.syncFilterLayout();
    }

    public refresh(): void {
        this.init(this.params);
    }

    // this is a user component, and IComponent has "public destroy()" as part of the interface.
    // so we need to override destroy() just to make the method public.
    public destroy(): void {
        super.destroy();
    }
}
