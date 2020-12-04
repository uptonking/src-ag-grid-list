import {
    AgColorPicker,
    AgGroupComponent,
    Autowired,
    Component,
    PostConstruct,
    RefSelector,
    AgGroupComponentParams
} from "@ag-grid-community/core";
import { ChartController } from "../../../chartController";
import { ChartTranslator } from "../../../chartTranslator";

export class BackgroundPanel extends Component {
    public static TEMPLATE = /* html */
        `<div>
            <ag-group-component ref="chartBackgroundGroup">
                <ag-color-picker ref="colorPicker"></ag-color-picker>
            </ag-group-component>
        <div>`;

    @RefSelector('chartBackgroundGroup') private group: AgGroupComponent;
    @RefSelector('colorPicker') private colorPicker: AgColorPicker;

    @Autowired('chartTranslator') private chartTranslator: ChartTranslator;

    private readonly chartController: ChartController;

    constructor(chartController: ChartController) {
        super();
        this.chartController = chartController;
    }

    @PostConstruct
    private init() {
        const groupParams: AgGroupComponentParams = {
            cssIdentifier: 'charts-format-sub-level',
            direction: 'vertical',
            suppressOpenCloseIcons: true
        };
        this.setTemplate(BackgroundPanel.TEMPLATE, {chartBackgroundGroup: groupParams});

        this.initGroup();
        this.initColorPicker();
    }

    private initGroup(): void {
        this.group
            .setTitle(this.chartTranslator.translate('background'))
            .setEnabled(this.chartController.getChartProxy().getChartOption('background.visible'))
            .hideOpenCloseIcons(true)
            .hideEnabledCheckbox(false)
            .onEnableChange(enabled => this.chartController.getChartProxy().setChartOption('background.visible', enabled));
    }

    private initColorPicker(): void {
        this.colorPicker
            .setLabel(this.chartTranslator.translate('color'))
            .setLabelWidth('flex')
            .setInputWidth(45)
            .setValue(this.chartController.getChartProxy().getChartOption('background.fill'))
            .onValueChange(newColor => this.chartController.getChartProxy().setChartOption('background.fill', newColor));
    }
}
