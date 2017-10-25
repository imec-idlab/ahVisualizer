
class Charting {

    private refreshTimerId: number = -1;
    private lastUpdatedOn: Date = new Date();

    constructor(private simGUI: SimulationGUI) {

    }

    deferUpdateCharts(simulations: Simulation[], full: boolean) {
        // prevent update flood by max 1 update per second or when gui changed
        let timeDiff = new Date().getTime() - this.lastUpdatedOn.getTime();
        if (timeDiff > 1000 || full) {
            this.updateCharts(simulations, full);
            this.lastUpdatedOn = new Date();
        }
        else {

            window.clearTimeout(this.refreshTimerId);
            this.refreshTimerId = window.setTimeout(() => {
                this.updateCharts(simulations, full);
                this.lastUpdatedOn = new Date();
            }, timeDiff);
        }
    }

    private updateCharts(simulations: Simulation[], full: boolean) {
        let showDeltas: boolean = $("#chkShowDeltas").prop("checked");
        let selectedSimulation = this.simGUI.simulationContainer.getSimulation(this.simGUI.selectedStream);

        if (selectedSimulation.nodes.length <= 0)
            return;

        if (this.simGUI.selectedNode == -1 || this.simGUI.selectedNode >= selectedSimulation.nodes.length) {
            this.updateChartsForAll(selectedSimulation, simulations, full, showDeltas);
        }
        else
            this.updateChartsForNode(selectedSimulation, simulations, full, showDeltas);
    }

    private updateChartsForNode(selectedSimulation: Simulation, simulations: Simulation[], full: boolean, showDeltas: boolean) {
        let firstNode = selectedSimulation.nodes[this.simGUI.selectedNode];

        if (firstNode.values.length <= 0)
            return;

        if (this.simGUI.currentChart == null || full) {

            let series = [];
            for (let i = 0; i < simulations.length; i++) {
                let values = simulations[i].nodes[this.simGUI.selectedNode].values;

                var selectedData = [];

                if (!showDeltas) {
                    for (let i = 0; i < values.length; i++) {
                        let value = values[i][this.simGUI.selectedPropertyForChart];
                        if (value != -1)
                            selectedData.push([values[i].timestamp, value]);
                    }
                }
                else {
                    if (values[0][this.simGUI.selectedPropertyForChart] != -1)
                        selectedData.push([values[0].timestamp, values[0][this.simGUI.selectedPropertyForChart]]);
                    for (let i = 1; i < values.length; i++) {
                        let value = values[i][this.simGUI.selectedPropertyForChart];
                        let beforeValue = values[i - 1][this.simGUI.selectedPropertyForChart];
                        if (value != -1 && beforeValue != -1)
                            selectedData.push([values[i].timestamp, value - beforeValue]);
                    }
                }

                series.push({
                    name: this.simGUI.simulationContainer.getStream(i),
                    data: selectedData
                });
            }



            let self = this;
            let title = $($(".nodeProperty[data-property='" + this.simGUI.selectedPropertyForChart + "'] td").get(0)).text();


            $('#nodeChart').empty().highcharts({
                chart: {
                    type: 'spline',
                    animation: "Highcharts.svg", // don't animate in old IE
                    marginRight: 10,
                    events: {
                        load: function () {
                            self.simGUI.currentChart = (<HighchartsChartObject>this);
                        }
                    },
                    zoomType: "x"
                },
                plotOptions: {
                    series: {
                        animation: false,
                        marker: { enabled: false }
                    }
                },
                title: { text: title },
                xAxis: {
                    type: 'linear',
                    tickPixelInterval: 100,
                },
                yAxis: {
                    title: { text: 'Value' },
                    plotLines: [{
                        value: 0,
                        width: 1,
                        color: '#808080'
                    }]
                },
                legend: { enabled: true },
                series: series,
                credits: false
            });

        }
        else {
            for (let s = 0; s < simulations.length; s++) {
                let values = simulations[s].nodes[this.simGUI.selectedNode].values;
                if (!showDeltas || values.length < 2) {
                    for (let i = this.simGUI.currentChart.series[s].data.length; i < values.length; i++) {
                        let val = values[i];
                        this.simGUI.currentChart.series[s].addPoint([val.timestamp, val[this.simGUI.selectedPropertyForChart]], false, false);
                    }
                }
                else {
                    for (let i = this.simGUI.currentChart.series[s].data.length; i < values.length; i++) {
                        let beforeVal = values[i - 1];
                        let val = values[i];
                        this.simGUI.currentChart.series[s].addPoint([val.timestamp, val[this.simGUI.selectedPropertyForChart] - beforeVal[this.simGUI.selectedPropertyForChart]], false, false);
                    }
                }
            }

            this.simGUI.currentChart.redraw(false);
        }



        let lastValue = firstNode.values[firstNode.values.length - 1];

        let activeDozePieData = [{ name: "Active", y: lastValue.totalActiveTime },
        { name: "Doze", y: lastValue.totalDozeTime }]
        this.createPieChart("#nodeChartActiveDoze", 'Active/doze time', activeDozePieData);



        let activeTransmissionsSuccessDroppedData = [{ name: "OK", y: lastValue.nrOfTransmissions - lastValue.nrOfTransmissionsDropped },
        { name: "Dropped", y: lastValue.nrOfTransmissionsDropped }]
        this.createPieChart("#nodeChartTxSuccessDropped", 'TX OK/dropped', activeTransmissionsSuccessDroppedData);



        let activeReceivesSuccessDroppedData = [{ name: "OK", y: lastValue.nrOfReceives - lastValue.nrOfReceivesDropped },
        { name: "Dropped", y: lastValue.nrOfReceivesDropped }]
        this.createPieChart("#nodeChartRxSuccessDropped", 'RX OK/dropped', activeReceivesSuccessDroppedData);



        let activePacketsSuccessDroppedData = [{ name: "OK", y: lastValue.nrOfSuccessfulPackets },
        { name: "Dropped", y: lastValue.nrOfDroppedPackets }]
        this.createPieChart("#nodeChartPacketSuccessDropped", 'Packets OK/dropped', activePacketsSuccessDroppedData);

    }

    private updateChartsForAll(selectedSimulation: Simulation, simulations: Simulation[], full: boolean, showDeltas: boolean) {


        if (this.simGUI.selectedPropertyForChart == "channelTraffic")
            this.updateChartsForTraffic(simulations, full, showDeltas);
        else if (this.simGUI.selectedPropertyForChart == "totalPacketLoss" && this.simGUI.selectedStream == "live") {
            $("#simTotalPacketLoss").removeClass("configProperty");
            $("#simTotalPacketLoss").addClass("chartProperty");
            this.updateChartsForPacketLoss(simulations, full, showDeltas);
        }
        else {
            if ($("#chkShowDistribution").prop("checked"))
                this.updateDistributionChart(selectedSimulation, showDeltas);
            else
                this.updateAverageChart(selectedSimulation, showDeltas, full);
        }

        let totalReceiveActiveTime = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "totalActiveTime");
        let totalReceiveDozeTime = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "totalDozeTime");

        if (totalReceiveActiveTime.length > 0 && totalReceiveDozeTime.length > 0) {
            let activeDozePieData = [{ name: "Active", y: totalReceiveActiveTime[0] },
            { name: "Doze", y: totalReceiveDozeTime[0] }]
            this.createPieChart("#nodeChartActiveDoze", 'Active/doze time', activeDozePieData);
        }

        let nrOfTransmissions = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfTransmissions");
        let nrOfTransmissionsDropped = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfTransmissionsDropped");

        if (nrOfTransmissions.length > 0 && nrOfTransmissionsDropped.length > 0) {
            let activeTransmissionsSuccessDroppedData = [{ name: "OK", y: nrOfTransmissions[0] - nrOfTransmissionsDropped[0] },
            { name: "Dropped", y: nrOfTransmissionsDropped[0] }]
            this.createPieChart("#nodeChartTxSuccessDropped", 'TX OK/dropped', activeTransmissionsSuccessDroppedData);
        }

        let nrOfReceives = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfReceives");
        let nrOfReceivesDropped = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfReceivesDropped");

        if (nrOfReceives.length > 0 && nrOfReceivesDropped.length > 0) {
            let activeReceivesSuccessDroppedData = [{ name: "OK", y: nrOfReceives[0] - nrOfReceivesDropped[0] },
            { name: "Dropped", y: nrOfReceivesDropped[0] }]
            this.createPieChart("#nodeChartRxSuccessDropped", 'RX OK/dropped', activeReceivesSuccessDroppedData);
        }

        let nrOfSuccessfulPackets = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfSuccessfulPackets");
        let nrOfDroppedPackets = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfDroppedPackets");

        if (nrOfSuccessfulPackets.length > 0 && nrOfDroppedPackets.length > 0) {
            let activePacketsSuccessDroppedData = [{ name: "OK", y: nrOfSuccessfulPackets[0] },
            { name: "Dropped", y: nrOfDroppedPackets[0] }]
            this.createPieChart("#nodeChartPacketSuccessDropped", 'Packets OK/dropped', activePacketsSuccessDroppedData);
        }
    }

    private updateDistributionChart(selectedSimulation: Simulation, showDeltas: boolean) {
        let series = [];

        // to ensure we can easily compare we need to have the scale on the X-axis starting and ending on the same values
        // so determine the overall minimum and maximum
        let overallMin = Number.MAX_VALUE;
        let overallMax = Number.MIN_VALUE;
        for (let s of this.simGUI.simulationContainer.getStreams()) {
            let mm = this.simGUI.getMinMaxOfProperty(s, this.simGUI.selectedPropertyForChart, showDeltas);
            if (mm.length > 0) {
                if (overallMin > mm[0]) overallMin = mm[0];
                if (overallMax < mm[1]) overallMax = mm[1];
            }
        }

        let minMax = this.simGUI.getMinMaxOfProperty(this.simGUI.selectedStream, this.simGUI.selectedPropertyForChart, showDeltas);
        // create 100 classes
        let nrOfClasses = 100;

        let classSize = (minMax[1] - minMax[0]) / nrOfClasses;

        let seriesValues = new Array(nrOfClasses + 1);
        for (let i = 0; i <= nrOfClasses; i++)
            seriesValues[i] = 0;

        for (var i = 0; i < selectedSimulation.nodes.length; i++) {
            let values = selectedSimulation.nodes[i].values;
            if (showDeltas && values.length > 1) {
                let curVal = values[values.length - 1][this.simGUI.selectedPropertyForChart];
                let beforeVal = values[values.length - 2][this.simGUI.selectedPropertyForChart];
                let val = curVal - beforeVal;
                let alpha = (val - minMax[0]) / (minMax[1] - minMax[0]);
                seriesValues[Math.round(alpha * nrOfClasses)]++;
            }
            else if (values.length > 0) {
                let val = values[values.length - 1][this.simGUI.selectedPropertyForChart];
                let alpha = (val - minMax[0]) / (minMax[1] - minMax[0]);
                seriesValues[Math.round(alpha * nrOfClasses)]++;
            }
        }

        for (let i = 0; i <= seriesValues.length; i++) {
            let classStartValue = minMax[0] + classSize * i;
            series.push([classStartValue, seriesValues[i]]);
        }

        let self = this;
        let title = $($(".nodeProperty[data-property='" + this.simGUI.selectedPropertyForChart + "'] td").get(0)).text();


        $('#nodeChart').empty().highcharts({
            chart: {
                type: 'column',
                animation: "Highcharts.svg", // don't animate in old IE
                alignTicks: false,
                events: {
                    load: function () {
                        self.simGUI.currentChart = (<HighchartsChartObject>this);
                    }
                },
            },
            title: { text: "Distribution of " + title },
            plotOptions: {
                series: {
                    animation: false,
                    marker: { enabled: false },
                    shadow: false,
                },
                column: {
                    borderWidth: 0,
                    pointPadding: 0,
                    groupPadding: 0,
                    pointWidth: 10
                }
            },
            xAxis: {
                min: overallMin,
                max: overallMax
            },
            yAxis: {
                endOnTick: false
            },
            series: [{
                name: " ",
                data: series
            }],
            legend: { enabled: false },
            credits: false
        });
    }

    private updateAverageChart(selectedSimulation: Simulation, showDeltas: boolean, full: boolean) {

        let self = this;
        let title = $($(".nodeProperty[data-property='" + this.simGUI.selectedPropertyForChart + "'] td").get(0)).text();

        let seriesAverages = [];
        let seriesRanges = [];

        let simulations = this.simGUI.simulationContainer.getSimulations();
        let canUpdateIncremental: boolean = this.simGUI.currentChart != null && !full && simulations.length * 2 == this.simGUI.currentChart.series.length;
        let showAreas = simulations.length < 3;


        for (let s = 0; s < simulations.length; s++) {
            let averages = [];
            let ranges = [];
            let nrOfValues = simulations[s].nodes[0].values.length - 1;

            if (nrOfValues > 0) {


                let offset = (canUpdateIncremental) ? this.simGUI.currentChart.series[showAreas ? s * 2 : s].data.length : 0;

                for (var i = offset; i < nrOfValues; i++) {
                    let sum = 0;
                    let count = 0;
                    let max = Number.MIN_VALUE;
                    let min = Number.MAX_VALUE;

                    let timestamp = simulations[s].nodes[0].values[i].timestamp;
                    for (let n of simulations[s].nodes) {
                        let values = n.values;
                        if (i < values.length) {

                            if (values[i][this.simGUI.selectedPropertyForChart] != -1) {
                                let value = values[i][this.simGUI.selectedPropertyForChart];
                                sum += value;
                                count++;
                                if (max < value) max = value;
                                if (min > value) min = value;
                            }
                        }
                    }

                    let avg = count == 0 ? -1 : sum / count;

                    if (showAreas) {
                        let sumSquares = 0;
                        for (let n of simulations[s].nodes) {
                            let values = n.values;
                            if (i < values.length) {
                                if (values[i][this.simGUI.selectedPropertyForChart] != -1) {
                                    let val = (values[i][this.simGUI.selectedPropertyForChart] - avg) * (values[i][this.simGUI.selectedPropertyForChart] - avg);
                                    sumSquares += val;
                                }
                            }
                        }

                        let stddev = count == 0 ? 0 : Math.sqrt(sumSquares / count);

                        if (count > 0)
                            ranges.push([timestamp, Math.max(min, avg - stddev), Math.min(max, avg + stddev)]);
                        else
                            ranges.push([timestamp, avg, avg]);
                    }
                    averages.push([timestamp, avg]);
                }

                seriesAverages.push(averages);
                seriesRanges.push(ranges);
            }
        }



        if (canUpdateIncremental) {

            for (let s = 0; s < simulations.length; s++) {
                for (let i = 0; i < seriesAverages[s].length; i++) {
                    this.simGUI.currentChart.series[showAreas ? s * 2 : s].addPoint(seriesAverages[s][i], false, false, false);
                    if (showAreas)
                        this.simGUI.currentChart.series[s * 2 + 1].addPoint(seriesRanges[s][i], false, false, false);
                }
            }
            this.simGUI.currentChart.redraw(false);
        }
        else {

            let series = [];
            for (let s = 0; s < simulations.length; s++) {
                series.push({
                    name: simulations[s].config.name,
                    type: "spline",
                    data: seriesAverages[s],
                    zIndex: 1,
                });
                if (showAreas) {
                    series.push(<any>{
                        name: 'Range',
                        data: seriesRanges[s],
                        type: 'arearange',
                        zIndex: 0,
                        lineWidth: 0,
                        linkedTo: ':previous',
                        color: Highcharts.getOptions().colors[s],
                        fillOpacity: 0.3,
                    });
                }
            }

            $('#nodeChart').empty().highcharts({
                chart: {
                    animation: "Highcharts.svg", // don't animate in old IE
                    marginRight: 10,
                    events: {
                        load: function () {
                            self.simGUI.currentChart = (<HighchartsChartObject>this);
                        }
                    },
                    zoomType: "x"
                },
                plotOptions: {
                    series: {
                        animation: false,
                        marker: { enabled: false }
                    }
                },
                title: { text: title },
                xAxis: {
                    type: 'linear',
                    tickPixelInterval: 100,
                },
                yAxis: {
                    title: { text: 'Value' },
                    plotLines: [{
                        value: 0,
                        width: 1,
                        color: '#808080'
                    }]
                },
                legend: { enabled: true },
                series: series,
                credits: false
            });
        }
    }

    private updateChartsForTraffic(simulations: Simulation[], full: boolean, showDeltas: boolean) {
        let self = this;
        let series = [];

        let lastSums: number[] = [];
        for (let s = 0; s < simulations.length; s++)
            lastSums.push(0);

        for (let s = 0; s < simulations.length; s++) {
            let data = [];
            for (let i = 0; i < simulations[s].totalSlotUsageTimestamps.length; i++) {

                let sum = 0;
                for (let j = 0; j < simulations[s].slotUsageAP[i].length; j++)
                    sum += simulations[s].slotUsageAP[i][j];

                for (let j = 0; j < simulations[s].slotUsageSTA[j].length; j++)
                    sum += simulations[s].slotUsageSTA[i][j];

                data.push([
                    simulations[s].totalSlotUsageTimestamps[i],
                    showDeltas ? sum - lastSums[s] : sum]
                );

                lastSums[s] = sum;
            }

            series.push({
                name: simulations[s].config.name,
                type: "spline",
                data: data,
                zIndex: 1,
            });
        }



        $('#nodeChart').empty().highcharts({
            chart: {
                animation: "Highcharts.svg", // don't animate in old IE
                marginRight: 10,
                events: {
                    load: function () {
                        self.simGUI.currentChart = (<HighchartsChartObject>this);
                    }
                },
                zoomType: "x"
            },
            plotOptions: {
                series: {
                    animation: false,
                    marker: { enabled: false }
                }
            },
            title: { text: 'Channel traffic' },
            xAxis: {
                type: 'linear',
                tickPixelInterval: 100,
            },
            yAxis: {
                title: { text: 'Value' },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            legend: { enabled: true },
            series: series,
            credits: false
        });
    }

    private updateChartsForPacketLoss(simulations: Simulation[], full: boolean, showDeltas: boolean) {
        let series = [];
        let self = this;
        let lastSums: number[] = [];
        for (let s = 0; s < simulations.length; s++)
            lastSums.push(0);

        for (let s = 0; s < simulations.length; s++) {
            let data = [];
            for (let i = 0; i < simulations[s].totalSlotUsageTimestamps.length; i++) {
                if (simulations[s].totalSlotUsageTimestamps[i] && simulations[s].totalPacketLoss[i]) {
                    data.push([
                        simulations[s].totalSlotUsageTimestamps[i],
                        showDeltas ? simulations[s].totalPacketLoss[i] - lastSums[s] : simulations[s].totalPacketLoss[i]]
                    );
                    lastSums[s] = simulations[s].totalPacketLoss[simulations[s].totalPacketLoss.length - 1];

                }
            }
            series.push({
                name: simulations[s].config.name,
                type: "spline",
                data: data,
                zIndex: 1,
            });
        }



        $('#nodeChart').empty().highcharts({
            chart: {
                animation: "Highcharts.svg", // don't animate in old IE
                marginRight: 10,
                events: {
                    load: function () {
                        self.simGUI.currentChart = (<HighchartsChartObject>this);
                    }
                },
                zoomType: "x"
            },
            plotOptions: {
                series: {
                    animation: false,
                    marker: { enabled: false }
                }
            },
            title: { text: 'Total Packet Loss' },
            xAxis: {
                type: 'linear',
                tickPixelInterval: 100,
            },
            yAxis: {
                title: { text: 'Value' },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            legend: { enabled: true },
            series: series,
            credits: false
        });
    }

    private createPieChart(selector: string, title: string, data: any) {
        $(selector).empty().highcharts({
            chart: {
                plotBackgroundColor: null,
                plotBorderWidth: null,
                plotShadow: false,
                type: 'pie',
                marginTop: 20
            },
            title: { text: title, style: { fontSize: "0.8em" } },
            tooltip: { pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>' },
            plotOptions: {
                pie: {
                    allowPointSelect: true,
                    cursor: 'pointer',
                    dataLabels: {
                        enabled: false,
                        format: '<b>{point.name}</b>: {point.percentage:.1f} %'
                    },
                    animation: false
                }
            },
            series: [{ data: data }],
            credits: false,
            exporting: { enabled: false }
        });
    }
}