import { ChartProxy, ChartProxyParams } from "../chartProxy";
import { PieSeriesOptions, PolarChartOptions } from "@ag-grid-community/core";
import { PolarChart } from "ag-charts-community";

export abstract class PolarChartProxy extends ChartProxy<PolarChart, PolarChartOptions<PieSeriesOptions>> {

    protected constructor(params: ChartProxyParams) {
        super(params);
    }

}
