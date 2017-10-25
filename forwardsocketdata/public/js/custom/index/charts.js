var Charting = (function () {
    function Charting(simGUI) {
        this.simGUI = simGUI;
        this.refreshTimerId = -1;
        this.lastUpdatedOn = new Date();
    }
    Charting.prototype.deferUpdateCharts = function (simulations, full) {
        var _this = this;
        // prevent update flood by max 1 update per second or when gui changed
        var timeDiff = new Date().getTime() - this.lastUpdatedOn.getTime();
        if (timeDiff > 1000 || full) {
            this.updateCharts(simulations, full);
            this.lastUpdatedOn = new Date();
        }
        else {
            window.clearTimeout(this.refreshTimerId);
            this.refreshTimerId = window.setTimeout(function () {
                _this.updateCharts(simulations, full);
                _this.lastUpdatedOn = new Date();
            }, timeDiff);
        }
    };
    Charting.prototype.updateCharts = function (simulations, full) {
        var showDeltas = $("#chkShowDeltas").prop("checked");
        var selectedSimulation = this.simGUI.simulationContainer.getSimulation(this.simGUI.selectedStream);
        if (selectedSimulation.nodes.length <= 0)
            return;
        if (this.simGUI.selectedNode == -1 || this.simGUI.selectedNode >= selectedSimulation.nodes.length) {
            this.updateChartsForAll(selectedSimulation, simulations, full, showDeltas);
        }
        else
            this.updateChartsForNode(selectedSimulation, simulations, full, showDeltas);
    };
    Charting.prototype.updateChartsForNode = function (selectedSimulation, simulations, full, showDeltas) {
        var firstNode = selectedSimulation.nodes[this.simGUI.selectedNode];
        if (firstNode.values.length <= 0)
            return;
        if (this.simGUI.currentChart == null || full) {
            var series = [];
            for (var i = 0; i < simulations.length; i++) {
                var values = simulations[i].nodes[this.simGUI.selectedNode].values;
                var selectedData = [];
                if (!showDeltas) {
                    for (var i_1 = 0; i_1 < values.length; i_1++) {
                        var value = values[i_1][this.simGUI.selectedPropertyForChart];
                        if (value != -1)
                            selectedData.push([values[i_1].timestamp, value]);
                    }
                }
                else {
                    if (values[0][this.simGUI.selectedPropertyForChart] != -1)
                        selectedData.push([values[0].timestamp, values[0][this.simGUI.selectedPropertyForChart]]);
                    for (var i_2 = 1; i_2 < values.length; i_2++) {
                        var value = values[i_2][this.simGUI.selectedPropertyForChart];
                        var beforeValue = values[i_2 - 1][this.simGUI.selectedPropertyForChart];
                        if (value != -1 && beforeValue != -1)
                            selectedData.push([values[i_2].timestamp, value - beforeValue]);
                    }
                }
                series.push({
                    name: this.simGUI.simulationContainer.getStream(i),
                    data: selectedData
                });
            }
            var self_1 = this;
            var title = $($(".nodeProperty[data-property='" + this.simGUI.selectedPropertyForChart + "'] td").get(0)).text();
            $('#nodeChart').empty().highcharts({
                chart: {
                    type: 'spline',
                    animation: "Highcharts.svg",
                    marginRight: 10,
                    events: {
                        load: function () {
                            self_1.simGUI.currentChart = this;
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
            for (var s = 0; s < simulations.length; s++) {
                var values = simulations[s].nodes[this.simGUI.selectedNode].values;
                if (!showDeltas || values.length < 2) {
                    for (var i = this.simGUI.currentChart.series[s].data.length; i < values.length; i++) {
                        var val = values[i];
                        this.simGUI.currentChart.series[s].addPoint([val.timestamp, val[this.simGUI.selectedPropertyForChart]], false, false);
                    }
                }
                else {
                    for (var i = this.simGUI.currentChart.series[s].data.length; i < values.length; i++) {
                        var beforeVal = values[i - 1];
                        var val = values[i];
                        this.simGUI.currentChart.series[s].addPoint([val.timestamp, val[this.simGUI.selectedPropertyForChart] - beforeVal[this.simGUI.selectedPropertyForChart]], false, false);
                    }
                }
            }
            this.simGUI.currentChart.redraw(false);
        }
        var lastValue = firstNode.values[firstNode.values.length - 1];
        var activeDozePieData = [{ name: "Active", y: lastValue.totalActiveTime },
            { name: "Doze", y: lastValue.totalDozeTime }];
        this.createPieChart("#nodeChartActiveDoze", 'Active/doze time', activeDozePieData);
        var activeTransmissionsSuccessDroppedData = [{ name: "OK", y: lastValue.nrOfTransmissions - lastValue.nrOfTransmissionsDropped },
            { name: "Dropped", y: lastValue.nrOfTransmissionsDropped }];
        this.createPieChart("#nodeChartTxSuccessDropped", 'TX OK/dropped', activeTransmissionsSuccessDroppedData);
        var activeReceivesSuccessDroppedData = [{ name: "OK", y: lastValue.nrOfReceives - lastValue.nrOfReceivesDropped },
            { name: "Dropped", y: lastValue.nrOfReceivesDropped }];
        this.createPieChart("#nodeChartRxSuccessDropped", 'RX OK/dropped', activeReceivesSuccessDroppedData);
        var activePacketsSuccessDroppedData = [{ name: "OK", y: lastValue.nrOfSuccessfulPackets },
            { name: "Dropped", y: lastValue.nrOfDroppedPackets }];
        this.createPieChart("#nodeChartPacketSuccessDropped", 'Packets OK/dropped', activePacketsSuccessDroppedData);
    };
    Charting.prototype.updateChartsForAll = function (selectedSimulation, simulations, full, showDeltas) {
        if (this.simGUI.selectedPropertyForChart == "channelTraffic")
            this.updateChartsForTraffic(simulations, full, showDeltas);
        else if (this.simGUI.selectedPropertyForChart == "totalPacketLoss") {
            this.updateChartsForPacketLoss(simulations, full, showDeltas);
        }
        else {
            if ($("#chkShowDistribution").prop("checked"))
                this.updateDistributionChart(selectedSimulation, showDeltas);
            else
                this.updateAverageChart(selectedSimulation, showDeltas, full);
        }
        var totalReceiveActiveTime = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "totalActiveTime");
        var totalReceiveDozeTime = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "totalDozeTime");
        if (totalReceiveActiveTime.length > 0 && totalReceiveDozeTime.length > 0) {
            var activeDozePieData = [{ name: "Active", y: totalReceiveActiveTime[0] },
                { name: "Doze", y: totalReceiveDozeTime[0] }];
            this.createPieChart("#nodeChartActiveDoze", 'Active/doze time', activeDozePieData);
        }
        var nrOfTransmissions = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfTransmissions");
        var nrOfTransmissionsDropped = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfTransmissionsDropped");
        if (nrOfTransmissions.length > 0 && nrOfTransmissionsDropped.length > 0) {
            var activeTransmissionsSuccessDroppedData = [{ name: "OK", y: nrOfTransmissions[0] - nrOfTransmissionsDropped[0] },
                { name: "Dropped", y: nrOfTransmissionsDropped[0] }];
            this.createPieChart("#nodeChartTxSuccessDropped", 'TX OK/dropped', activeTransmissionsSuccessDroppedData);
        }
        var nrOfReceives = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfReceives");
        var nrOfReceivesDropped = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfReceivesDropped");
        if (nrOfReceives.length > 0 && nrOfReceivesDropped.length > 0) {
            var activeReceivesSuccessDroppedData = [{ name: "OK", y: nrOfReceives[0] - nrOfReceivesDropped[0] },
                { name: "Dropped", y: nrOfReceivesDropped[0] }];
            this.createPieChart("#nodeChartRxSuccessDropped", 'RX OK/dropped', activeReceivesSuccessDroppedData);
        }
        var nrOfSuccessfulPackets = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfSuccessfulPackets");
        var nrOfDroppedPackets = this.simGUI.getAverageAndStdDevValue(selectedSimulation, "nrOfDroppedPackets");
        if (nrOfSuccessfulPackets.length > 0 && nrOfDroppedPackets.length > 0) {
            var activePacketsSuccessDroppedData = [{ name: "OK", y: nrOfSuccessfulPackets[0] },
                { name: "Dropped", y: nrOfDroppedPackets[0] }];
            this.createPieChart("#nodeChartPacketSuccessDropped", 'Packets OK/dropped', activePacketsSuccessDroppedData);
        }
    };
    Charting.prototype.updateDistributionChart = function (selectedSimulation, showDeltas) {
        var series = [];
        // to ensure we can easily compare we need to have the scale on the X-axis starting and ending on the same values
        // so determine the overall minimum and maximum
        var overallMin = Number.MAX_VALUE;
        var overallMax = Number.MIN_VALUE;
        for (var _i = 0, _a = this.simGUI.simulationContainer.getStreams(); _i < _a.length; _i++) {
            var s = _a[_i];
            var mm = this.simGUI.getMinMaxOfProperty(s, this.simGUI.selectedPropertyForChart, showDeltas);
            if (mm.length > 0) {
                if (overallMin > mm[0])
                    overallMin = mm[0];
                if (overallMax < mm[1])
                    overallMax = mm[1];
            }
        }
        var minMax = this.simGUI.getMinMaxOfProperty(this.simGUI.selectedStream, this.simGUI.selectedPropertyForChart, showDeltas);
        // create 100 classes
        var nrOfClasses = 100;
        var classSize = (minMax[1] - minMax[0]) / nrOfClasses;
        var seriesValues = new Array(nrOfClasses + 1);
        for (var i_3 = 0; i_3 <= nrOfClasses; i_3++)
            seriesValues[i_3] = 0;
        for (var i = 0; i < selectedSimulation.nodes.length; i++) {
            var values = selectedSimulation.nodes[i].values;
            if (showDeltas && values.length > 1) {
                var curVal = values[values.length - 1][this.simGUI.selectedPropertyForChart];
                var beforeVal = values[values.length - 2][this.simGUI.selectedPropertyForChart];
                var val = curVal - beforeVal;
                var alpha = (val - minMax[0]) / (minMax[1] - minMax[0]);
                seriesValues[Math.round(alpha * nrOfClasses)]++;
            }
            else if (values.length > 0) {
                var val = values[values.length - 1][this.simGUI.selectedPropertyForChart];
                var alpha = (val - minMax[0]) / (minMax[1] - minMax[0]);
                seriesValues[Math.round(alpha * nrOfClasses)]++;
            }
        }
        for (var i_4 = 0; i_4 <= seriesValues.length; i_4++) {
            var classStartValue = minMax[0] + classSize * i_4;
            series.push([classStartValue, seriesValues[i_4]]);
        }
        var self = this;
        var title = $($(".nodeProperty[data-property='" + this.simGUI.selectedPropertyForChart + "'] td").get(0)).text();
        $('#nodeChart').empty().highcharts({
            chart: {
                type: 'column',
                animation: "Highcharts.svg",
                alignTicks: false,
                events: {
                    load: function () {
                        self.simGUI.currentChart = this;
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
    };
    Charting.prototype.updateAverageChart = function (selectedSimulation, showDeltas, full) {
        var self = this;
        var title = $($(".nodeProperty[data-property='" + this.simGUI.selectedPropertyForChart + "'] td").get(0)).text();
        var seriesAverages = [];
        var seriesRanges = [];
        var simulations = this.simGUI.simulationContainer.getSimulations();
        var canUpdateIncremental = this.simGUI.currentChart != null && !full && simulations.length * 2 == this.simGUI.currentChart.series.length;
        var showAreas = simulations.length < 3;
        for (var s = 0; s < simulations.length; s++) {
            var averages = [];
            var ranges = [];
            var nrOfValues = simulations[s].nodes[0].values.length - 1;
            if (nrOfValues > 0) {
                var offset = (canUpdateIncremental) ? this.simGUI.currentChart.series[showAreas ? s * 2 : s].data.length : 0;
                for (var i = offset; i < nrOfValues; i++) {
                    var sum = 0;
                    var count = 0;
                    var max = Number.MIN_VALUE;
                    var min = Number.MAX_VALUE;
                    var timestamp = simulations[s].nodes[0].values[i].timestamp;
                    for (var _i = 0, _a = simulations[s].nodes; _i < _a.length; _i++) {
                        var n = _a[_i];
                        var values = n.values;
                        if (i < values.length) {
                            if (values[i][this.simGUI.selectedPropertyForChart] != -1) {
                                var value = values[i][this.simGUI.selectedPropertyForChart];
                                sum += value;
                                count++;
                                if (max < value)
                                    max = value;
                                if (min > value)
                                    min = value;
                            }
                        }
                    }
                    var avg = count == 0 ? -1 : sum / count;
                    if (showAreas) {
                        var sumSquares = 0;
                        for (var _b = 0, _c = simulations[s].nodes; _b < _c.length; _b++) {
                            var n = _c[_b];
                            var values = n.values;
                            if (i < values.length) {
                                if (values[i][this.simGUI.selectedPropertyForChart] != -1) {
                                    var val = (values[i][this.simGUI.selectedPropertyForChart] - avg) * (values[i][this.simGUI.selectedPropertyForChart] - avg);
                                    sumSquares += val;
                                }
                            }
                        }
                        var stddev = count == 0 ? 0 : Math.sqrt(sumSquares / count);
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
            for (var s = 0; s < simulations.length; s++) {
                for (var i_5 = 0; i_5 < seriesAverages[s].length; i_5++) {
                    this.simGUI.currentChart.series[showAreas ? s * 2 : s].addPoint(seriesAverages[s][i_5], false, false, false);
                    if (showAreas)
                        this.simGUI.currentChart.series[s * 2 + 1].addPoint(seriesRanges[s][i_5], false, false, false);
                }
            }
            this.simGUI.currentChart.redraw(false);
        }
        else {
            var series = [];
            for (var s = 0; s < simulations.length; s++) {
                series.push({
                    name: simulations[s].config.name,
                    type: "spline",
                    data: seriesAverages[s],
                    zIndex: 1,
                });
                if (showAreas) {
                    series.push({
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
                    animation: "Highcharts.svg",
                    marginRight: 10,
                    events: {
                        load: function () {
                            self.simGUI.currentChart = this;
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
    };
    Charting.prototype.updateChartsForTraffic = function (simulations, full, showDeltas) {
        var self = this;
        var series = [];
        var lastSums = [];
        for (var s = 0; s < simulations.length; s++)
            lastSums.push(0);
        for (var s = 0; s < simulations.length; s++) {
            var data = [];
            for (var i = 0; i < simulations[s].totalSlotUsageTimestamps.length; i++) {
                var sum = 0;
                for (var j = 0; j < simulations[s].slotUsageAP[i].length; j++)
                    sum += simulations[s].slotUsageAP[i][j];
                for (var j = 0; j < simulations[s].slotUsageSTA[j].length; j++)
                    sum += simulations[s].slotUsageSTA[i][j];
                data.push([
                    simulations[s].totalSlotUsageTimestamps[i],
                    showDeltas ? sum - lastSums[s] : sum
                ]);
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
                animation: "Highcharts.svg",
                marginRight: 10,
                events: {
                    load: function () {
                        self.simGUI.currentChart = this;
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
    };
    Charting.prototype.updateChartsForPacketLoss = function (simulations, full, showDeltas) {
        var self = this;
        var series = [];
        var lastSums = [];
        for (var s = 0; s < simulations.length; s++)
            lastSums.push(0);
        for (var s = 0; s < simulations.length; s++) {
            var data = [];
            //data.push([showDeltas ? simulations[s].totalPacketLoss - lastSums[s] : simulations[s].totalPacketLoss]);
            for (var i = 0; i < simulations[s].totalPacketLoss.length; i++) {
                if (simulations[s].totalSlotUsageTimestamps[i] >= 0) {
                    data.push([
                        simulations[s].totalSlotUsageTimestamps[i],
                        showDeltas ? simulations[s].totalPacketLoss[i] - lastSums[s] : simulations[s].totalPacketLoss[i]
                    ]);
                    lastSums[s] = simulations[s].totalPacketLoss[simulations[s].totalPacketLoss.length - 1];
                    //console.log("Time " + simulations[s].totalSlotUsageTimestamps[i] + "  ;value " + simulations[s].totalPacketLoss[i] + " ; last " + lastSums[s]);
                    //console.log("----------------------" + s);
                }
            }
            series.push({
                name: simulations[s].config.name,
                type: "spline",
                data: data,
                zIndex: 2,
            });
        }
        $('#nodeChart').empty().highcharts({
            chart: {
                animation: "Highcharts.svg",
                marginRight: 10,
                events: {
                    load: function () {
                        self.simGUI.currentChart = this;
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
    };
    Charting.prototype.createPieChart = function (selector, title, data) {
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
    };
    return Charting;
}());
//# sourceMappingURL=charts.js.map