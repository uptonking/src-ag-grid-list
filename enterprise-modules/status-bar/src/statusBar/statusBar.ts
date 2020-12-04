import {
    Autowired,
    Component,
    UserComponentFactory,
    GridOptions,
    GridOptionsWrapper,
    PostConstruct,
    Promise,
    RefSelector,
    _,
    IStatusPanelComp
} from '@ag-grid-community/core';
import { StatusBarService } from "./statusBarService";

export class StatusBar extends Component {

    private static TEMPLATE = /* html */
        `<div class="ag-status-bar">
            <div ref="eStatusBarLeft" class="ag-status-bar-left"></div>
            <div ref="eStatusBarCenter" class="ag-status-bar-center"></div>
            <div ref="eStatusBarRight" class="ag-status-bar-right"></div>
        </div>`;

    @Autowired('gridOptionsWrapper') private gridOptionsWrapper: GridOptionsWrapper;
    @Autowired('gridOptions') private gridOptions: GridOptions;
    @Autowired('userComponentFactory') private userComponentFactory: UserComponentFactory;
    @Autowired('statusBarService') private statusBarService: StatusBarService;

    @RefSelector('eStatusBarLeft') private eStatusBarLeft: HTMLElement;
    @RefSelector('eStatusBarCenter') private eStatusBarCenter: HTMLElement;
    @RefSelector('eStatusBarRight') private eStatusBarRight: HTMLElement;

    constructor() {
        super(StatusBar.TEMPLATE);
    }

    @PostConstruct
    private postConstruct(): void {
        if (this.gridOptions.statusBar && this.gridOptions.statusBar.statusPanels) {
            const leftStatusPanelComponents = this.gridOptions.statusBar.statusPanels
                .filter((componentConfig) => componentConfig.align === 'left');
            this.createAndRenderComponents(leftStatusPanelComponents, this.eStatusBarLeft);

            const centerStatusPanelComponents = this.gridOptions.statusBar.statusPanels
                .filter((componentConfig) => componentConfig.align === 'center');
            this.createAndRenderComponents(centerStatusPanelComponents, this.eStatusBarCenter);

            const rightStatusPanelComponents = this.gridOptions.statusBar.statusPanels
                .filter((componentConfig) => (!componentConfig.align || componentConfig.align === 'right'));
            this.createAndRenderComponents(rightStatusPanelComponents, this.eStatusBarRight);
        } else {
            this.setDisplayed(false);
        }
    }

    private createAndRenderComponents(statusBarComponents: any[], ePanelComponent: HTMLElement) {
        const componentDetails: { key: string; promise: Promise<IStatusPanelComp> }[] = [];

        statusBarComponents.forEach(componentConfig => {
            const params = {
                api: this.gridOptionsWrapper.getApi(),
                columnApi: this.gridOptionsWrapper.getColumnApi(),
                context: this.gridOptionsWrapper.getContext()
            };

            const promise = this.userComponentFactory.newStatusPanelComponent(componentConfig, params);

            componentDetails.push({
                // default to the component name if no key supplied
                key: componentConfig.key || componentConfig.statusPanel,
                promise
            });
        });

        Promise.all(componentDetails.map((details) => details.promise))
            .then(() => {
                componentDetails.forEach(componentDetail => {
                    componentDetail.promise.then((component: IStatusPanelComp) => {
                        const destroyFunc = () => {
                            this.getContext().destroyBean(component);
                        };

                        if (this.isAlive()) {
                            this.statusBarService.registerStatusPanel(componentDetail.key, component);
                            ePanelComponent.appendChild(component.getGui());
                            this.addDestroyFunc(destroyFunc);
                        } else {
                            destroyFunc();
                        }
                    });
                });
            });
    }
}
