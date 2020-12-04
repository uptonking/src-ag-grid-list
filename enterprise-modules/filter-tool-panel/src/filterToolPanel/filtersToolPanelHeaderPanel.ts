import {
    _,
    Autowired, Column,
    ColumnController,
    Component,
    Events,
    GridOptionsWrapper,
    PostConstruct,
    PreConstruct,
    RefSelector,
    AgInputTextField
} from "@ag-grid-community/core";
import { ToolPanelFiltersCompParams } from "./filtersToolPanel";

export enum EXPAND_STATE { EXPANDED, COLLAPSED, INDETERMINATE }

export class FiltersToolPanelHeaderPanel extends Component {

    @Autowired('gridOptionsWrapper') private gridOptionsWrapper: GridOptionsWrapper;
    @Autowired('columnController') private columnController: ColumnController;

    @RefSelector('eExpand') private eExpand: HTMLElement;
    @RefSelector('eFilterTextField') private eSearchTextField: AgInputTextField;

    private eExpandChecked: HTMLElement;
    private eExpandUnchecked: HTMLElement;
    private eExpandIndeterminate: HTMLElement;

    private onSearchTextChangedDebounced: () => void;

    private currentExpandState: EXPAND_STATE;

    private params: ToolPanelFiltersCompParams;

    @PreConstruct
    private preConstruct(): void {
        this.setTemplate( /* html */
            `<div class="ag-filter-toolpanel-search" role="presentation">
                <div ref="eExpand" class="ag-filter-toolpanel-expand"></div>
                <ag-input-text-field ref="eFilterTextField" class="ag-filter-toolpanel-search-input"></ag-input-text-field>
            </div>`
        );
    }

    @PostConstruct
    public postConstruct(): void {
        this.eSearchTextField.onValueChange(this.onSearchTextChanged.bind(this));

        this.createExpandIcons();
        this.setExpandState(EXPAND_STATE.EXPANDED);
        this.addManagedListener(this.eExpand, 'click', this.onExpandClicked.bind(this));
        this.addManagedListener(this.eventService, Events.EVENT_NEW_COLUMNS_LOADED, this.showOrHideOptions.bind(this));
    }

    public init(params: ToolPanelFiltersCompParams): void {
        this.params = params;

        if (this.columnController.isReady()) {
            this.showOrHideOptions();
        }
    }

    private createExpandIcons() {
        this.eExpand.appendChild(this.eExpandChecked = _.createIconNoSpan('columnSelectOpen', this.gridOptionsWrapper));
        this.eExpand.appendChild(this.eExpandUnchecked = _.createIconNoSpan('columnSelectClosed', this.gridOptionsWrapper));
        this.eExpand.appendChild(this.eExpandIndeterminate = _.createIconNoSpan('columnSelectIndeterminate', this.gridOptionsWrapper));
    }

    // we only show expand / collapse if we are showing filters
    private showOrHideOptions(): void {
        const showFilterSearch = !this.params.suppressFilterSearch;
        const showExpand = !this.params.suppressExpandAll;
        const translate = this.gridOptionsWrapper.getLocaleTextFunc();

        this.eSearchTextField.setInputPlaceholder(translate('searchOoo', 'Search...'));

        const isFilterGroupPresent = (col: Column) => col.getOriginalParent() && col.isFilterAllowed();
        const filterGroupsPresent = this.columnController.getAllGridColumns().some(isFilterGroupPresent);

        _.setDisplayed(this.eSearchTextField.getGui(), showFilterSearch);
        _.setDisplayed(this.eExpand, showExpand && filterGroupsPresent);
    }

    private onSearchTextChanged(): void {
        if (!this.onSearchTextChangedDebounced) {
            this.onSearchTextChangedDebounced = _.debounce(() => {
                this.dispatchEvent({type: 'searchChanged', searchText: this.eSearchTextField.getValue()});
            }, 300);
        }

        this.onSearchTextChangedDebounced();
    }

    private onExpandClicked(): void {
        const event = this.currentExpandState === EXPAND_STATE.EXPANDED ? {type: 'collapseAll'} : {type: 'expandAll'};
        this.dispatchEvent(event);
    }

    public setExpandState(state: EXPAND_STATE): void {
        this.currentExpandState = state;

        _.setDisplayed(this.eExpandChecked, this.currentExpandState === EXPAND_STATE.EXPANDED);
        _.setDisplayed(this.eExpandUnchecked, this.currentExpandState === EXPAND_STATE.COLLAPSED);
        _.setDisplayed(this.eExpandIndeterminate, this.currentExpandState === EXPAND_STATE.INDETERMINATE);
    }
}
