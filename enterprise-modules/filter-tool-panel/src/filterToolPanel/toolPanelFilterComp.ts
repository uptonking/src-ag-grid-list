import {
    Autowired,
    Column,
    ColumnController,
    Component,
    Events,
    FilterManager,
    FilterOpenedEvent,
    GridOptionsWrapper,
    IFilterComp,
    RefSelector,
    PostConstruct,
    Constants,
    _
} from "@ag-grid-community/core";

export class ToolPanelFilterComp extends Component {
    private static TEMPLATE = /* html */`
        <div class="ag-filter-toolpanel-instance">
            <div class="ag-filter-toolpanel-header ag-filter-toolpanel-instance-header" ref="eFilterToolPanelHeader">
                <div ref="eExpand" class="ag-filter-toolpanel-expand"></div>
                <span ref="eFilterName" class="ag-header-cell-text"></span>
                <span ref="eFilterIcon" class="ag-header-icon ag-filter-icon ag-filter-toolpanel-instance-header-icon" aria-hidden="true"></span>
            </div>
            <div class="ag-filter-toolpanel-instance-body ag-filter" ref="agFilterToolPanelBody" />
        </div>`;

    @RefSelector('eFilterToolPanelHeader') private eFilterToolPanelHeader: HTMLElement;
    @RefSelector('eFilterName') private eFilterName: HTMLElement;
    @RefSelector('agFilterToolPanelBody') private agFilterToolPanelBody: HTMLElement;
    @RefSelector('eFilterIcon') private eFilterIcon: HTMLElement;
    @RefSelector('eExpand') private eExpand: HTMLElement;

    @Autowired('filterManager') private filterManager: FilterManager;
    @Autowired('gridOptionsWrapper') private gridOptionsWrapper: GridOptionsWrapper;
    @Autowired('columnController') private columnController: ColumnController;

    private eExpandChecked: HTMLElement;
    private eExpandUnchecked: HTMLElement;
    private hideHeader: boolean;
    private column: Column;
    private expanded: boolean = false;
    private underlyingFilter: IFilterComp;

    constructor(hideHeader = false) {
        super(ToolPanelFilterComp.TEMPLATE);
        this.hideHeader = hideHeader;
    }

    @PostConstruct
    private postConstruct() {
        this.eExpandChecked = _.createIconNoSpan('columnSelectOpen', this.gridOptionsWrapper);
        this.eExpandUnchecked = _.createIconNoSpan('columnSelectClosed', this.gridOptionsWrapper);
        this.eExpand.appendChild(this.eExpandChecked);
        this.eExpand.appendChild(this.eExpandUnchecked);
    }

    public setColumn(column: Column): void {
        this.column = column;
        this.eFilterName.innerText = this.columnController.getDisplayNameForColumn(this.column, 'header', false) as string;
        this.addManagedListener(this.eFilterToolPanelHeader, 'click', this.toggleExpanded.bind(this));
        this.addManagedListener(this.eFilterToolPanelHeader, 'keydown', (e: KeyboardEvent) => {
            if (e.keyCode === Constants.KEY_ENTER) {
                this.toggleExpanded();
            }
        });
        this.addManagedListener(this.eventService, Events.EVENT_FILTER_OPENED, this.onFilterOpened.bind(this));
        this.addInIcon('filter', this.eFilterIcon, this.column);

        _.addOrRemoveCssClass(this.eFilterIcon, 'ag-hidden', !this.isFilterActive());
        _.addCssClass(this.eExpandChecked, 'ag-hidden');

        if (this.hideHeader) {
            _.addOrRemoveCssClass(this.eFilterToolPanelHeader, 'ag-hidden', true);
            this.eFilterToolPanelHeader.removeAttribute('tabindex');
        } else {
            this.eFilterToolPanelHeader.setAttribute('tabindex', '0');
        }

        this.addManagedListener(this.column, Column.EVENT_FILTER_CHANGED, this.onFilterChanged.bind(this));
    }

    public getColumn(): Column {
        return this.column;
    }

    public getColumnFilterName(): string {
        return this.columnController.getDisplayNameForColumn(this.column, 'header', false) as string;
    }

    public addCssClassToTitleBar(cssClass: string) {
        _.addCssClass(this.eFilterToolPanelHeader, cssClass);
    }

    private addInIcon(iconName: string, eParent: HTMLElement, column: Column): void {
        if (eParent == null) { return; }

        const eIcon = _.createIconNoSpan(iconName, this.gridOptionsWrapper, column);
        eParent.appendChild(eIcon);
    }

    public isFilterActive(): boolean {
        return this.filterManager.isFilterActive(this.column);
    }

    private onFilterChanged(): void {
        _.addOrRemoveCssClass(this.eFilterIcon, 'ag-hidden', !this.isFilterActive());

        this.dispatchEvent({ type: Column.EVENT_FILTER_CHANGED });
    }

    public toggleExpanded(): void {
        this.expanded ? this.collapse() : this.expand();
    }

    public expand(): void {
        if (this.expanded) return;

        this.expanded = true;

        const container = _.loadTemplate(/* html */`<div class="ag-filter-toolpanel-instance-filter" />`);
        const filterPromise = this.filterManager.getOrCreateFilterWrapper(this.column, 'TOOLBAR').filterPromise;

        if (filterPromise) {
            filterPromise.then(filter => {
                this.underlyingFilter = filter;

                container.appendChild(filter.getGui());

                this.agFilterToolPanelBody.appendChild(container);

                if (filter.afterGuiAttached) {
                    filter.afterGuiAttached({});
                }
            });
        }

        _.setDisplayed(this.eExpandChecked, true);
        _.setDisplayed(this.eExpandUnchecked, false);
    }

    public collapse(): void {
        if (!this.expanded) return;

        this.expanded = false;
        this.agFilterToolPanelBody.removeChild(this.agFilterToolPanelBody.children[0]);

        _.setDisplayed(this.eExpandChecked, false);
        _.setDisplayed(this.eExpandUnchecked, true);
    }

    public refreshFilter(): void {
        if (!this.expanded) { return; }

        const filter = this.underlyingFilter as any;

        if (!filter) return;

        // set filters should be updated when the filter has been changed elsewhere, i.e. via api. Note that we can't
        // use 'afterGuiAttached' to refresh the virtual list as it also focuses on the mini filter which changes the
        // scroll position in the filter list panel
        const isSetFilter = filter.refreshVirtualList as any;

        if (isSetFilter) {
            filter.refreshVirtualList();
        }
    }

    private onFilterOpened(event: FilterOpenedEvent): void {
        if (event.source !== 'COLUMN_MENU') { return; }
        if (event.column !== this.column) { return; }
        if (!this.expanded) { return; }

        this.collapse();
    }
}
