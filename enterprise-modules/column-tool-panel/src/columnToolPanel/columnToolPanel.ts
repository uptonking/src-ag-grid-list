import {
    _,
    Autowired,
    ColDef,
    ColGroupDef,
    ColumnApi,
    Component,
    Events,
    GridApi,
    IColumnToolPanel,
    IToolPanelComp,
    IToolPanelParams,
    ModuleNames,
    ModuleRegistry
} from "@ag-grid-community/core";
import { PivotModePanel } from "./pivotModePanel";
import { PivotDropZonePanel, RowGroupDropZonePanel, ValuesDropZonePanel } from "@ag-grid-enterprise/row-grouping"
import { PrimaryColsPanel } from "./primaryColsPanel";

export interface ToolPanelColumnCompParams extends IToolPanelParams {
    suppressRowGroups: boolean;
    suppressValues: boolean;
    suppressPivots: boolean;
    suppressPivotMode: boolean;
    suppressSideButtons: boolean;
    suppressColumnFilter: boolean;
    suppressColumnSelectAll: boolean;
    suppressColumnExpandAll: boolean;
    contractColumnSelection: boolean;
    suppressSyncLayoutWithGrid: boolean;
}

export class ColumnToolPanel extends Component implements IColumnToolPanel, IToolPanelComp {

    private static TEMPLATE = `<div class="ag-column-panel"></div>`;

    @Autowired("gridApi") private gridApi: GridApi;
    @Autowired("columnApi") private columnApi: ColumnApi;

    private initialised = false;
    private params: ToolPanelColumnCompParams;

    private childDestroyFuncs: Function[] = [];

    private pivotModePanel: PivotModePanel;
    private primaryColsPanel: PrimaryColsPanel;
    private rowGroupDropZonePanel: RowGroupDropZonePanel;
    private valuesDropZonePanel: ValuesDropZonePanel;
    private pivotDropZonePanel: PivotDropZonePanel;

    constructor() {
        super(ColumnToolPanel.TEMPLATE);
    }

    // lazy initialise the panel
    public setVisible(visible: boolean): void {
        super.setDisplayed(visible);
        if (visible && !this.initialised) {
            this.init(this.params);
        }
    }

    public init(params: ToolPanelColumnCompParams): void {
        const defaultParams: ToolPanelColumnCompParams = {
            suppressSideButtons: false,
            suppressColumnSelectAll: false,
            suppressColumnFilter: false,
            suppressColumnExpandAll: false,
            contractColumnSelection: false,
            suppressPivotMode: false,
            suppressRowGroups: false,
            suppressValues: false,
            suppressPivots: false,
            suppressSyncLayoutWithGrid: false,
            api: this.gridApi,
            columnApi: this.columnApi
        };

        _.mergeDeep(defaultParams, params);
        this.params = defaultParams;

        if (this.isRowGroupingModuleLoaded() && !this.params.suppressPivotMode) {
            this.pivotModePanel = this.createManagedBean(new PivotModePanel());
            this.appendChild(this.pivotModePanel);
        }

        this.primaryColsPanel = this.createManagedBean(new PrimaryColsPanel());

        this.primaryColsPanel.init(true, this.params);
        _.addCssClass(this.primaryColsPanel.getGui(), 'ag-column-panel-column-select');
        this.appendChild(this.primaryColsPanel);

        if (this.isRowGroupingModuleLoaded()) {
            if (!this.params.suppressRowGroups) {
                this.rowGroupDropZonePanel = this.createManagedBean(new RowGroupDropZonePanel(false));
                this.appendChild(this.rowGroupDropZonePanel);
            }

            if (!this.params.suppressValues) {
                this.valuesDropZonePanel = this.createManagedBean(new ValuesDropZonePanel(false));
                this.appendChild(this.valuesDropZonePanel);
            }

            if (!this.params.suppressPivots) {
                this.pivotDropZonePanel = this.createManagedBean(new PivotDropZonePanel(false));
                this.appendChild(this.pivotDropZonePanel);
            }
            this.setLastVisible();
            this.addManagedListener(this.eventService, Events.EVENT_COLUMN_PIVOT_MODE_CHANGED, this.setLastVisible.bind(this));
        }

        this.initialised = true;
    }

    public setPivotModeSectionVisible(visible: boolean): void {
        if (!this.isRowGroupingModuleLoaded()) { return };

        if (this.pivotModePanel) {
            this.pivotModePanel.setDisplayed(visible);
        } else if (visible) {
            this.pivotModePanel = this.createBean(new PivotModePanel());

            // ensure pivot mode panel is positioned at the top of the columns tool panel
            this.getGui().insertBefore(this.pivotModePanel.getGui(), this.getGui().firstChild);
            this.childDestroyFuncs.push( ()=> this.destroyBean(this.pivotModePanel));
        }
        this.setLastVisible();
    }

    public setRowGroupsSectionVisible(visible: boolean): void {
        if (!this.isRowGroupingModuleLoaded()) { return };

        if (this.rowGroupDropZonePanel) {
            this.rowGroupDropZonePanel.setDisplayed(visible);
        } else if (visible) {
            this.rowGroupDropZonePanel = this.createManagedBean(new RowGroupDropZonePanel(false));
            this.appendChild(this.rowGroupDropZonePanel);
        }

        this.setLastVisible();
    }

    public setValuesSectionVisible(visible: boolean): void {
        if (!this.isRowGroupingModuleLoaded()) { return };

        if (this.valuesDropZonePanel) {
            this.valuesDropZonePanel.setDisplayed(visible);
        } else if (visible) {
            this.valuesDropZonePanel = this.createManagedBean(new ValuesDropZonePanel(false));
            this.appendChild(this.valuesDropZonePanel);
        }

        this.setLastVisible();
    }

    public setPivotSectionVisible(visible: boolean): void {
        if (!this.isRowGroupingModuleLoaded()) { return };

        if (this.pivotDropZonePanel) {
            this.pivotDropZonePanel.setDisplayed(visible);
        } else if (visible) {
            this.pivotDropZonePanel = this.createManagedBean(new PivotDropZonePanel(false));
            this.appendChild(this.pivotDropZonePanel);
            this.pivotDropZonePanel.setDisplayed(visible);
        }

        this.setLastVisible();
    }

    private setLastVisible(): void {
        const eGui = this.getGui();

        const columnDrops: HTMLElement[] = Array.prototype.slice.call(eGui.querySelectorAll('.ag-column-drop'));

        columnDrops.forEach(columnDrop => _.removeCssClass(columnDrop, 'ag-last-column-drop'));

        const lastVisible = _.last(eGui.querySelectorAll('.ag-column-drop:not(.ag-hidden)') as any) as HTMLElement;

        if (lastVisible) {
            _.addCssClass(lastVisible, 'ag-last-column-drop');
        }
    }

    private isRowGroupingModuleLoaded(): boolean {
        return ModuleRegistry.assertRegistered(ModuleNames.RowGroupingModule, 'Row Grouping');
    }

    public expandColumnGroups(groupIds?: string[]): void {
        this.primaryColsPanel.expandGroups(groupIds);
    }

    public collapseColumnGroups(groupIds?: string[]): void {
        this.primaryColsPanel.collapseGroups(groupIds);
    }

    public setColumnLayout(colDefs: (ColDef | ColGroupDef)[]): void {
        this.primaryColsPanel.setColumnLayout(colDefs);
    }

    public syncLayoutWithGrid(): void {
        this.primaryColsPanel.syncLayoutWithGrid();
    }

    public destroyChildren(): void {
        this.childDestroyFuncs.forEach(func => func());
        this.childDestroyFuncs.length = 0;
        _.clearElement(this.getGui());
    }

    public refresh(): void {
        this.destroyChildren();
        this.init(this.params);
    }

    // this is a user component, and IComponent has "public destroy()" as part of the interface.
    // so this must be public.
    public destroy(): void {
        this.destroyChildren();
        super.destroy();
    }
}
