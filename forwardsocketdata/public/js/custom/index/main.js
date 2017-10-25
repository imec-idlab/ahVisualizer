var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var Animation = (function () {
    function Animation() {
        this.time = 0;
        this.color = new Color(0, 0, 0, 1, 0);
    }
    Animation.prototype.update = function (dt) {
        this.time += dt;
    };
    return Animation;
}());
var BroadcastAnimation = (function (_super) {
    __extends(BroadcastAnimation, _super);
    function BroadcastAnimation(x, y) {
        var _this = _super.call(this) || this;
        _this.x = x;
        _this.y = y;
        _this.max_radius = 50;
        _this.max_time = 1000;
        _this.color = new Color(255, 0, 0);
        return _this;
    }
    BroadcastAnimation.prototype.draw = function (canvas, ctx, area) {
        var radius = this.time / this.max_time * this.max_radius;
        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.beginPath();
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), radius, 0, Math.PI * 2, false);
        ctx.stroke();
    };
    BroadcastAnimation.prototype.isFinished = function () {
        return this.time >= this.max_time;
    };
    return BroadcastAnimation;
}(Animation));
var ReceivedAnimation = (function (_super) {
    __extends(ReceivedAnimation, _super);
    function ReceivedAnimation(x, y) {
        var _this = _super.call(this) || this;
        _this.x = x;
        _this.y = y;
        _this.max_radius = 10;
        _this.max_time = 1000;
        _this.color = new Color(0, 255, 0);
        return _this;
    }
    ReceivedAnimation.prototype.draw = function (canvas, ctx, area) {
        var radius = (1 - this.time / this.max_time) * this.max_radius;
        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), radius, 0, Math.PI * 2, false);
        ctx.stroke();
    };
    ReceivedAnimation.prototype.isFinished = function () {
        return this.time >= this.max_time;
    };
    return ReceivedAnimation;
}(Animation));
var AssociatedAnimation = (function (_super) {
    __extends(AssociatedAnimation, _super);
    function AssociatedAnimation(x, y) {
        var _this = _super.call(this) || this;
        _this.x = x;
        _this.y = y;
        _this.max_time = 3000;
        return _this;
    }
    AssociatedAnimation.prototype.draw = function (canvas, ctx, area) {
        var offset = this.time / this.max_time * Math.PI * 2;
        this.color.alpha = 1 - this.time / this.max_time;
        ctx.strokeStyle = this.color.toString();
        ctx.beginPath();
        ctx.setLineDash(([10, 2]));
        ctx.lineWidth = 3;
        ctx.arc(this.x * (canvas.width / area), this.y * (canvas.width / area), 10, offset, offset + Math.PI * 2, false);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1;
    };
    AssociatedAnimation.prototype.isFinished = function () {
        return this.time >= this.max_time;
    };
    return AssociatedAnimation;
}(Animation));
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
                    tickPixelInterval: 100
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
                }
            },
            title: { text: "Distribution of " + title },
            plotOptions: {
                series: {
                    animation: false,
                    marker: { enabled: false },
                    shadow: false
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
                    zIndex: 1
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
                        fillOpacity: 0.3
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
                    tickPixelInterval: 100
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
                zIndex: 1
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
                tickPixelInterval: 100
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
        var series = [];
        var self = this;
        var lastSums = [];
        for (var s = 0; s < simulations.length; s++)
            lastSums.push(0);
        for (var s = 0; s < simulations.length; s++) {
            var data = [];
            for (var i = 0; i < simulations[s].totalSlotUsageTimestamps.length; i++) {
                if (simulations[s].totalSlotUsageTimestamps[i] && simulations[s].totalPacketLoss[i]) {
                    data.push([
                        simulations[s].totalSlotUsageTimestamps[i],
                        showDeltas ? simulations[s].totalPacketLoss[i] - lastSums[s] : simulations[s].totalPacketLoss[i]
                    ]);
                    lastSums[s] = simulations[s].totalPacketLoss[simulations[s].totalPacketLoss.length - 1];
                }
            }
            series.push({
                name: simulations[s].config.name,
                type: "spline",
                data: data,
                zIndex: 1
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
                tickPixelInterval: 100
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
var Color = (function () {
    function Color(red, green, blue, alpha, position) {
        if (alpha === void 0) { alpha = 1; }
        if (position === void 0) { position = 0; }
        this.red = Math.floor(red);
        this.green = Math.floor(green);
        this.blue = Math.floor(blue);
        this.alpha = alpha;
        this.position = Math.round(position * 100) / 100;
    }
    Color.prototype.toString = function () {
        return "rgba(" + this.red + ", " + this.green + "," + this.blue + ", " + this.alpha + ")";
    };
    return Color;
}());
var Palette = (function () {
    function Palette() {
        this.colors = [];
        this.lookup = [];
    }
    Palette.prototype.buildLookup = function () {
        this.lookup = [];
        for (var i = 0; i < 1000; i++)
            this.lookup.push(this.getColorAt(i / 1000));
    };
    ;
    Palette.prototype.getColorFromLookupAt = function (position) {
        var idx;
        if (isNaN(position))
            idx = 0;
        else
            idx = Math.floor(position * this.lookup.length);
        if (idx < 0)
            idx = 0;
        if (idx >= this.lookup.length)
            idx = this.lookup.length - 1;
        return this.lookup[idx];
    };
    ;
    Palette.prototype.getColorAt = function (position) {
        if (position < this.colors[0].position)
            return this.colors[0];
        if (position >= this.colors[this.colors.length - 1].position)
            return this.colors[this.colors.length - 1];
        for (var i = 0; i < this.colors.length; i++) {
            if (position >= this.colors[i].position && position < this.colors[i + 1].position) {
                var relColorAlpha = (position - this.colors[i].position) / (this.colors[i + 1].position - this.colors[i].position);
                var red = this.colors[i].red * (1 - relColorAlpha) + this.colors[i + 1].red * (relColorAlpha);
                var green = this.colors[i].green * (1 - relColorAlpha) + this.colors[i + 1].green * (relColorAlpha);
                var blue = this.colors[i].blue * (1 - relColorAlpha) + this.colors[i + 1].blue * (relColorAlpha);
                return new Color(red, green, blue, 1, position);
            }
        }
    };
    Palette.prototype.addColor = function (c) {
        this.colors.push(c);
    };
    Palette.prototype.drawTo = function (ctx, width, height) {
        for (var i = 0; i < width; i++) {
            var pos = i / width;
            var c = this.getColorFromLookupAt(pos);
            ctx.fillStyle = "rgb(" + c.red + "," + c.green + "," + c.blue + ")";
            ctx.fillRect(i, 0, 1, height);
        }
    };
    return Palette;
}());
var EventManager = (function () {
    function EventManager(sim) {
        this.sim = sim;
        this.events = [];
    }
    EventManager.prototype.processEvents = function () {
        var eventsProcessed = this.events.length > 0;
        if (this.events.length > 1000)
            this.updateGUI = false;
        else
            this.updateGUI = true;
        var lastTime;
        for (var f = 0; f < this.events.length; f++) {
            //console.log(this.events[f].parts[1]);
        }
        while (this.events.length > 0) {
            var ev = this.events[0];
            switch (ev.parts[1]) {
                case 'startheader':
                    break;
                case 'rawconfig':
                    this.onRawConfig(ev.stream, parseInt(ev.parts[2]), parseInt(ev.parts[3]), parseInt(ev.parts[4]), parseInt(ev.parts[5]), parseInt(ev.parts[6]), parseInt(ev.parts[7]), parseInt(ev.parts[8]), parseInt(ev.parts[9]));
                    break;
                case 'start':
                    this.onStart(ev.stream, parseInt(ev.parts[2]), ev.parts[3], parseFloat(ev.parts[4]), parseFloat(ev.parts[5]), parseInt(ev.parts[6]), parseInt(ev.parts[7]), parseInt(ev.parts[8]), ev.parts[9], parseFloat(ev.parts[10]), parseFloat(ev.parts[11]), ev.parts[12], parseInt(ev.parts[13]), parseInt(ev.parts[14]), ev.parts[15], parseInt(ev.parts[16]), parseInt(ev.parts[17]), parseInt(ev.parts[18]), parseInt(ev.parts[19]), parseInt(ev.parts[20]), parseInt(ev.parts[21]), parseInt(ev.parts[22]), parseInt(ev.parts[23]), parseInt(ev.parts[24]), parseInt(ev.parts[25]), parseInt(ev.parts[26]), parseInt(ev.parts[27]), parseFloat(ev.parts[28]), parseFloat(ev.parts[29]), parseInt(ev.parts[30]), parseInt(ev.parts[31]), ev.parts[32], parseInt(ev.parts[33]), parseInt(ev.parts[34]), parseInt(ev.parts[35]), parseInt(ev.parts[36]), parseInt(ev.parts[37]));
                    break;
                case 'stanodeadd':
                    this.onNodeAdded(ev.stream, true, parseInt(ev.parts[2]), parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseInt(ev.parts[5]));
                    break;
                case 'stanodeassoc':
                    this.onNodeAssociated(ev.stream, parseInt(ev.parts[2]), parseInt(ev.parts[3]), parseInt(ev.parts[4]), parseInt(ev.parts[5]), parseInt(ev.parts[6]));
                    break;
                case 'stanodedeassoc':
                    this.onNodeDeassociated(ev.stream, parseInt(ev.parts[2]));
                    break;
                case 'apnodeadd':
                    this.onNodeAdded(ev.stream, false, -1, parseFloat(ev.parts[2]), parseFloat(ev.parts[3]), -1);
                    break;
                case 'nodestats':
                    this.onStatsUpdated(ev.stream, ev.time, parseInt(ev.parts[2]), parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseFloat(ev.parts[5]), parseFloat(ev.parts[6]), parseInt(ev.parts[7]), parseInt(ev.parts[8]), parseInt(ev.parts[9]), parseInt(ev.parts[10]), parseInt(ev.parts[11]), parseInt(ev.parts[12]), parseInt(ev.parts[13]), parseFloat(ev.parts[14]), parseFloat(ev.parts[15]), parseInt(ev.parts[16]), parseInt(ev.parts[17]), parseFloat(ev.parts[18]), parseInt(ev.parts[19]), parseInt(ev.parts[20]), parseInt(ev.parts[21]), parseInt(ev.parts[22]), parseInt(ev.parts[23]), parseInt(ev.parts[24]), ev.parts[25], ev.parts[26], parseInt(ev.parts[27]), parseInt(ev.parts[28]), parseInt(ev.parts[29]), parseFloat(ev.parts[30]), parseInt(ev.parts[31]), parseInt(ev.parts[32]), parseInt(ev.parts[33]), parseInt(ev.parts[34]), parseFloat(ev.parts[35]), parseInt(ev.parts[36]), parseInt(ev.parts[37]), parseInt(ev.parts[38]), parseInt(ev.parts[39]), parseInt(ev.parts[40]), parseFloat(ev.parts[41]), parseFloat(ev.parts[42]), parseInt(ev.parts[43]), parseFloat(ev.parts[44]), parseFloat(ev.parts[45]), parseFloat(ev.parts[46]), parseFloat(ev.parts[47]), parseFloat(ev.parts[48]), parseFloat(ev.parts[49]), parseFloat(ev.parts[50]));
                    break;
                case 'slotstatsSTA':
                    {
                        var values = [];
                        for (var i = 2; i < ev.parts.length; i++)
                            values.push(parseInt(ev.parts[i]));
                        this.onSlotStats(ev.stream, ev.time, values, false);
                        break;
                    }
                case 'slotstatsAP':
                    {
                        var values = [];
                        for (var i = 2; i < ev.parts.length; i++)
                            values.push(parseInt(ev.parts[i]));
                        this.onSlotStats(ev.stream, ev.time, values, true);
                        break;
                    }
                default:
            }
            lastTime = ev.time;
            this.events.shift();
        }
        if (eventsProcessed) {
            this.sim.onSimulationTimeUpdated(lastTime);
            this.sim.updateGUI(false);
        }
    };
    EventManager.prototype.onReceiveBulk = function (entry) {
        for (var _i = 0, _a = entry.lines; _i < _a.length; _i++) {
            var l = _a[_i];
            this.onReceive({ stream: entry.stream, line: l });
        }
        if (this.events.length > 10000)
            this.processEvents();
    };
    EventManager.prototype.onReceive = function (entry) {
        var parts = entry.line.split(';');
        var time = parseInt(parts[0]);
        //console.log("evManager3 " + parts);
        time = time / (1000 * 1000); // ns -> ms
        var ev = new SimulationEvent(entry.stream, time, parts);
        this.events.push(ev);
    };
    EventManager.prototype.onStart = function (stream, aidRAWRange, dataMode, dataRate, bandwidth, trafficInterval, trafficPacketsize, beaconInterval, name, propagationLossExponent, propagationLossReferenceLoss, apAlwaysSchedulesForNextSlot, minRTO, simulationTime, trafficType, trafficIntervalDeviation, tcpSegmentSize, tcpInitialSlowStartThreshold, tcpInitialCWnd, maxTimeOfPacketsInQueue, ipCameraMotionPercentage, ipCameraMotionDuration, ipCameraDataRate, nsta, cooldownPeriod, firmwareSize, firmwareBlockSize, firmwareCorruptionProbability, firmwareNewUpdateProbability, sensorMeasurementSize, numberOfRAWGroups, RAWSlotFormat, RAWSlotCount, numberOfRAWSlots, contentionPerRAWSlot, contentionPerRAWSlotOnlyInFirstGroup, numRpsElements) {
        var simulation = this.sim.simulationContainer.getSimulation(stream);
        if (typeof simulation == "undefined") {
            simulation = new Simulation();
            this.sim.simulationContainer.setSimulation(stream, simulation);
        }
        simulation.nodes = [];
        simulation.slotUsageAP = [];
        simulation.slotUsageSTA = [];
        simulation.totalSlotUsageAP = [];
        simulation.totalSlotUsageSTA = [];
        simulation.totalTraffic = 0;
        simulation.totalPacketLoss = [];
        var config = simulation.config;
        config.AIDRAWRange = aidRAWRange;
        config.numberOfRAWGroups = numberOfRAWGroups;
        config.RAWSlotFormat = RAWSlotCount > 0 ? RAWSlotFormat : undefined;
        ;
        config.numberOfRAWSlots = numberOfRAWSlots;
        config.RAWSlotCount = RAWSlotCount;
        config.RAWSlotDuration = RAWSlotCount > 0 ? 500 + 120 * RAWSlotCount : undefined;
        config.dataMode = dataMode;
        config.dataRate = dataRate;
        config.bandwidth = bandwidth;
        config.trafficInterval = trafficInterval;
        config.payloadSize = trafficPacketsize;
        config.beaconInterval = beaconInterval;
        config.name = name;
        config.propagationLossExponent = propagationLossExponent;
        config.propagationLossReferenceLoss = propagationLossReferenceLoss;
        config.apAlwaysSchedulesForNextSlot = apAlwaysSchedulesForNextSlot;
        config.minRTO = minRTO;
        config.simulationTime = simulationTime;
        config.trafficType = trafficType;
        config.trafficIntervalDeviation = trafficIntervalDeviation;
        config.tcpSegmentSize = tcpSegmentSize;
        config.tcpInitialSlowStartThreshold = tcpInitialSlowStartThreshold;
        config.tcpInitialCWnd = tcpInitialCWnd;
        config.maxTimeOfPacketsInQueue = maxTimeOfPacketsInQueue;
        config.ipCameraMotionPercentage = ipCameraMotionPercentage;
        config.ipCameraMotionDuration = ipCameraMotionDuration;
        config.ipCameraDataRate = ipCameraDataRate;
        config.nrSta = nsta;
        config.cooldownPeriod = cooldownPeriod;
        config.firmwareSize = firmwareSize;
        config.firmwareBlockSize = firmwareBlockSize;
        config.firmwareCorruptionProbability = firmwareCorruptionProbability;
        config.firmwareNewUpdateProbability = firmwareNewUpdateProbability;
        config.sensorMeasurementSize = sensorMeasurementSize;
        config.contentionPerRAWSlot = contentionPerRAWSlot;
        config.contentionPerRAWSlotOnlyInFirstGroup = contentionPerRAWSlotOnlyInFirstGroup;
        config.numRpsElements = numRpsElements;
    };
    EventManager.prototype.onSlotStats = function (stream, timestamp, values, isAP) {
        var sim = this.sim.simulationContainer.getSimulation(stream);
        if (isAP) {
            sim.slotUsageAP.push(values);
            sim.totalSlotUsageTimestamps.push(timestamp);
        }
        else
            sim.slotUsageSTA.push(values);
        var arr;
        if (isAP)
            arr = sim.totalSlotUsageAP;
        else
            arr = sim.totalSlotUsageSTA;
        for (var i = 0; i < values.length; i++)
            sim.totalTraffic += values[i];
        sim.currentTime = timestamp;
        if (arr.length == 0) {
            if (isAP)
                sim.totalSlotUsageAP = values;
            else
                sim.totalSlotUsageSTA = values;
            arr = values;
        }
        else {
            var smoothingFactor = 0.8;
            for (var i = 0; i < values.length; i++) {
                arr[i] = arr[i] * smoothingFactor + (1 - smoothingFactor) * values[i];
            }
        }
    };
    EventManager.prototype.onRawConfig = function (stream, rpsIndex, rawIndex, rawSlotFormat, rawSlotDurationCount, nRawSlots, rawSlotBoundary, rawGroupAidStart, rawGroupAidEnd) {
        var config = this.sim.simulationContainer.getSimulation(stream).config;
        if (config.nGroupsPerRps)
            if (config.nGroupsPerRps.length == 0) {
                config.nGroupsPerRps.push(rawIndex + 1);
            }
            else {
                if (config.nGroupsPerRps[config.nGroupsPerRps.length - 1] >= rawIndex + 1) {
                    config.nGroupsPerRps.push(rawIndex + 1);
                }
                else {
                    config.nGroupsPerRps[config.nGroupsPerRps.length - 1]++;
                }
            }
        config.rawSlotFormat.push(rawSlotFormat);
        config.rawSlotDurationCount.push(rawSlotDurationCount);
        var slotDuration = 500 + 120 * rawSlotDurationCount;
        config.rawSlotDuration.push(slotDuration);
        config.nRawSlots.push(nRawSlots);
        config.rawSlotBoundary.push(rawSlotBoundary);
        config.rawGroupAidStart.push(rawGroupAidStart);
        config.rawGroupAidEnd.push(rawGroupAidEnd);
        config.rawGroupDurations.push(nRawSlots * slotDuration);
    };
    EventManager.prototype.onNodeAdded = function (stream, isSTA, id, x, y, aId) {
        var n = isSTA ? new STANode() : new APNode();
        n.id = id;
        n.x = x;
        n.y = y;
        n.aId = aId;
        this.sim.simulationContainer.getSimulation(stream).nodes.push(n);
        if (!isSTA)
            this.sim.simulationContainer.getSimulation(stream).apNode = n;
        // this.sim.onNodeAdded(stream, id);
    };
    EventManager.prototype.onNodeAssociated = function (stream, id, aId, rpsIndex, groupNumber, rawSlotIndex) {
        var simulation = this.sim.simulationContainer.getSimulation(stream);
        if (id < 0 || id >= simulation.nodes.length)
            return;
        var n = simulation.nodes[id];
        n.aId = aId;
        n.rpsIndex = rpsIndex;
        n.groupNumber = groupNumber;
        n.rawSlotIndex = rawSlotIndex;
        n.isAssociated = true;
        this.sim.onNodeAssociated(stream, id);
    };
    EventManager.prototype.onNodeDeassociated = function (stream, id) {
        var simulation = this.sim.simulationContainer.getSimulation(stream);
        if (id < 0 || id >= simulation.nodes.length)
            return;
        var n = simulation.nodes[id];
        n.isAssociated = false;
        this.sim.onNodeAssociated(stream, id);
    };
    EventManager.prototype.hasIncreased = function (n, prop) {
        if (n.values.length >= 2) {
            var oldVal = n.values[n.values.length - 2];
            var newVal = n.values[n.values.length - 1];
            return oldVal[prop] < newVal[prop];
        }
        else
            return false;
    };
    EventManager.prototype.onStatsUpdated = function (stream, timestamp, id, totalTransmitTime, totalReceiveTime, totalDozeTime, totalActiveTime, nrOfTransmissions, nrOfTransmissionsDropped, nrOfReceives, nrOfReceivesDropped, nrOfSentPackets, nrOfSuccessfulPackets, nrOfDroppedPackets, avgPacketTimeOfFlight, goodputKbit, edcaQueueLength, nrOfSuccessfulRoundtripPackets, avgRoundTripTime, tcpCongestionWindow, numberOfTCPRetransmissions, numberOfTCPRetransmissionsFromAP, nrOfReceivesDroppedByDestination, numberOfMACTxRTSFailed, numberOfMACTxMissedACK, numberOfDropsByReason, numberOfDropsByReasonAtAP, tcpRtoValue, numberOfAPScheduledPacketForNodeInNextSlot, numberOfAPSentPacketForNodeImmediately, avgRemainingSlotTimeWhenAPSendingInSameSlot, numberOfCollisions, numberofMACTxMissedACKAndDroppedPacket, tcpConnected, tcpSlowStartThreshold, tcpEstimatedBandwidth, tcpRTT, numberOfBeaconsMissed, numberOfTransmissionsDuringRAWSlot, totalNumberOfDrops, firmwareTransferTime, ipCameraSendingRate, ipCameraReceivingRate, numberOfTransmissionsCancelledDueToCrossingRAWBoundary, jitter, reliability, interPacketDelayAtServer, interPacketDelayAtClient, interPacketDelayDeviationPercentageAtServer, interPacketDelayDeviationPercentageAtClient, latency) {
        // ^- it's getting awfully crowded around here
        var simulation = this.sim.simulationContainer.getSimulation(stream);
        if (id < 0 || id >= simulation.nodes.length)
            return;
        // keep track of statistics
        var n = simulation.nodes[id];
        var nodeVal = new NodeValue();
        n.values.push(nodeVal);
        nodeVal.timestamp = timestamp;
        nodeVal.totalTransmitTime = totalTransmitTime;
        nodeVal.totalReceiveTime = totalReceiveTime;
        nodeVal.totalDozeTime = totalDozeTime;
        nodeVal.totalActiveTime = totalActiveTime;
        nodeVal.nrOfTransmissions = nrOfTransmissions;
        nodeVal.nrOfTransmissionsDropped = nrOfTransmissionsDropped;
        nodeVal.nrOfReceives = nrOfReceives;
        nodeVal.nrOfReceivesDropped = nrOfReceivesDropped;
        nodeVal.nrOfReceivesDroppedByDestination = nrOfReceivesDroppedByDestination;
        nodeVal.nrOfSentPackets = nrOfSentPackets;
        nodeVal.nrOfSuccessfulPackets = nrOfSuccessfulPackets;
        nodeVal.nrOfDroppedPackets = nrOfDroppedPackets;
        nodeVal.latency = latency;
        nodeVal.avgSentReceiveTime = avgPacketTimeOfFlight;
        nodeVal.goodputKbit = goodputKbit;
        nodeVal.edcaQueueLength = edcaQueueLength;
        nodeVal.nrOfSuccessfulRoundtripPackets = nrOfSuccessfulRoundtripPackets;
        nodeVal.avgRoundtripTime = avgRoundTripTime;
        nodeVal.tcpCongestionWindow = tcpCongestionWindow;
        nodeVal.numberOfTCPRetransmissions = numberOfTCPRetransmissions;
        nodeVal.numberOfTCPRetransmissionsFromAP = numberOfTCPRetransmissionsFromAP;
        nodeVal.tcpRTO = tcpRtoValue;
        nodeVal.numberOfMACTxRTSFailed = numberOfMACTxRTSFailed;
        nodeVal.numberOfMACTxMissedACK = numberOfMACTxMissedACK;
        nodeVal.numberofMACTxMissedACKAndDroppedPacket = numberofMACTxMissedACKAndDroppedPacket;
        nodeVal.jitter = jitter;
        nodeVal.reliability = reliability;
        nodeVal.interPacketDelayAtServer = interPacketDelayAtServer;
        nodeVal.interPacketDelayAtClient = interPacketDelayAtClient;
        nodeVal.interPacketDelayDeviationPercentageAtServer = interPacketDelayDeviationPercentageAtServer;
        nodeVal.interPacketDelayDeviationPercentageAtClient = interPacketDelayDeviationPercentageAtClient;
        if (typeof numberOfDropsByReason != "undefined") {
            var dropParts = numberOfDropsByReason.split(',');
            nodeVal.numberOfDropsByReasonUnknown = parseInt(dropParts[0]);
            nodeVal.numberOfDropsByReasonPhyInSleepMode = parseInt(dropParts[1]);
            nodeVal.numberOfDropsByReasonPhyNotEnoughSignalPower = parseInt(dropParts[2]);
            nodeVal.numberOfDropsByReasonPhyUnsupportedMode = parseInt(dropParts[3]);
            nodeVal.numberOfDropsByReasonPhyPreambleHeaderReceptionFailed = parseInt(dropParts[4]);
            nodeVal.numberOfDropsByReasonPhyRxDuringChannelSwitching = parseInt(dropParts[5]);
            nodeVal.numberOfDropsByReasonPhyAlreadyReceiving = parseInt(dropParts[6]);
            nodeVal.numberOfDropsByReasonPhyAlreadyTransmitting = parseInt(dropParts[7]);
            nodeVal.numberOfDropsByReasonPhyAlreadyPlcpReceptionFailed = parseInt(dropParts[8]);
            nodeVal.numberOfDropsByReasonMacNotForAP = parseInt(dropParts[9]);
            nodeVal.numberOfDropsByReasonMacAPToAPFrame = parseInt(dropParts[10]);
            nodeVal.numberOfDropsByReasonMacQueueDelayExceeded = parseInt(dropParts[11]);
            nodeVal.numberOfDropsByReasonMacQueueSizeExceeded = parseInt(dropParts[12]);
            nodeVal.numberOfDropsByReasonTCPTxBufferExceeded = parseInt(dropParts[13]);
        }
        if (typeof numberOfDropsByReasonAtAP != "undefined") {
            var dropParts = numberOfDropsByReasonAtAP.split(',');
            nodeVal.numberOfDropsFromAPByReasonUnknown = parseInt(dropParts[0]);
            nodeVal.numberOfDropsFromAPByReasonPhyInSleepMode = parseInt(dropParts[1]);
            nodeVal.numberOfDropsFromAPByReasonPhyNotEnoughSignalPower = parseInt(dropParts[2]);
            nodeVal.numberOfDropsFromAPByReasonPhyUnsupportedMode = parseInt(dropParts[3]);
            nodeVal.numberOfDropsFromAPByReasonPhyPreambleHeaderReceptionFailed = parseInt(dropParts[4]);
            nodeVal.numberOfDropsFromAPByReasonPhyRxDuringChannelSwitching = parseInt(dropParts[5]);
            nodeVal.numberOfDropsFromAPByReasonPhyAlreadyReceiving = parseInt(dropParts[6]);
            nodeVal.numberOfDropsFromAPByReasonPhyAlreadyTransmitting = parseInt(dropParts[7]);
            nodeVal.numberOfDropsFromAPByReasonPhyAlreadyPlcpReceptionFailed = parseInt(dropParts[8]);
            nodeVal.numberOfDropsFromAPByReasonMacNotForAP = parseInt(dropParts[9]);
            nodeVal.numberOfDropsFromAPByReasonMacAPToAPFrame = parseInt(dropParts[10]);
            nodeVal.numberOfDropsFromAPByReasonMacQueueDelayExceeded = parseInt(dropParts[11]);
            nodeVal.numberOfDropsFromAPByReasonMacQueueSizeExceeded = parseInt(dropParts[12]);
            nodeVal.numberOfDropsFromAPByReasonTCPTxBufferExceeded = parseInt(dropParts[13]);
        }
        nodeVal.tcpRTO = tcpRtoValue;
        nodeVal.numberOfAPScheduledPacketForNodeInNextSlot = numberOfAPScheduledPacketForNodeInNextSlot;
        nodeVal.numberOfAPSentPacketForNodeImmediately = numberOfAPSentPacketForNodeImmediately;
        nodeVal.avgRemainingSlotTimeWhenAPSendingInSameSlot = avgRemainingSlotTimeWhenAPSendingInSameSlot;
        nodeVal.numberOfCollisions = numberOfCollisions;
        nodeVal.tcpConnected = tcpConnected;
        nodeVal.tcpSlowStartThreshold = tcpSlowStartThreshold;
        nodeVal.tcpEstimatedBandwidth = tcpEstimatedBandwidth;
        nodeVal.tcpRTT = tcpRTT;
        nodeVal.numberOfBeaconsMissed = numberOfBeaconsMissed;
        nodeVal.numberOfTransmissionsDuringRAWSlot = numberOfTransmissionsDuringRAWSlot;
        nodeVal.totalNumberOfDrops = totalNumberOfDrops;
        nodeVal.firmwareTransferTime = firmwareTransferTime;
        nodeVal.ipCameraSendingRate = ipCameraSendingRate;
        nodeVal.ipCameraReceivingRate = ipCameraReceivingRate;
        nodeVal.numberOfTransmissionsCancelledDueToCrossingRAWBoundary = numberOfTransmissionsCancelledDueToCrossingRAWBoundary;
        if (this.updateGUI && stream == this.sim.selectedStream) {
            if (this.hasIncreased(n, "totalTransmitTime")) {
                this.sim.addAnimation(new BroadcastAnimation(n.x, n.y));
            }
        }
        //if(this.hasIncreased(n.totalReceiveActiveTime))
        //   this.sim.addAnimation(new ReceivedAnimation(n.x, n.y));
        // this.sim.onNodeUpdated(stream, id);
    };
    return EventManager;
}());
var SimulationEvent = (function () {
    function SimulationEvent(stream, time, parts) {
        this.stream = stream;
        this.time = time;
        this.parts = parts;
    }
    return SimulationEvent;
}());
/// <reference path="../../../../typings/globals/jquery/index.d.ts" />
/// <reference path="../../../../typings/globals/socket.io/index.d.ts" />
/// <reference path="../../../../typings/globals/highcharts/index.d.ts" />
var SimulationContainer = (function () {
    function SimulationContainer() {
        this.keys = [];
        this.simulations = {};
    }
    SimulationContainer.prototype.getSimulation = function (stream) {
        return this.simulations[stream];
    };
    SimulationContainer.prototype.setSimulation = function (stream, sim) {
        this.simulations[stream] = sim;
        this.keys.push(stream);
    };
    SimulationContainer.prototype.hasSimulations = function () {
        return this.keys.length > 0;
    };
    SimulationContainer.prototype.getStream = function (idx) {
        return this.keys[idx];
    };
    SimulationContainer.prototype.getStreams = function () {
        return this.keys.slice(0);
    };
    SimulationContainer.prototype.getSimulations = function () {
        var sims = [];
        for (var _i = 0, _a = this.keys; _i < _a.length; _i++) {
            var k = _a[_i];
            sims.push(this.simulations[k]);
        }
        return sims;
    };
    return SimulationContainer;
}());
var toolTipContainer = [];
// The Tool-Tip instance:
function ToolTip(canvas, region, text, width, timeout) {
    var me = this, // self-reference for event handlers
    div = document.createElement("div"), // the tool-tip div
    parent = canvas.parentNode, // parent node for canvas
    visible = false; // current status
    // set some initial styles, can be replaced by class-name etc.
    div.style.cssText = "position:fixed;padding:7px;background:white;opacity:0.9;border-style:solid;border-color:#7cb5ec;border-width:1px;pointer-events:none;width:" + width + "px";
    div.innerHTML = text;
    // show the tool-tip
    this.show = function (pos) {
        if (!visible) {
            //me.hideOther();
            visible = true; // lock so it's only shown once
            setDivPos(pos); // set position
            parent.appendChild(div); // add to parent of canvas
            setTimeout(hide, timeout); // timeout for hide
        }
    };
    // hide the tool-tip
    function hide() {
        visible = false; // hide it after timeout
        parent.removeChild(div); // remove from DOM     
    }
    // check mouse position, add limits as wanted... just for example:
    function check(e) {
        var pos = getPos(e), posAbs = { x: e.clientX, y: e.clientY }; // div is fixed, so use clientX/Y
        if (!visible &&
            pos.x >= region.x && pos.x < region.x + region.w &&
            pos.y >= region.y && pos.y < region.y + region.h) {
            me.show(posAbs); // show tool-tip at this pos
        }
        else
            setDivPos(posAbs); // otherwise, update position
    }
    // get mouse position relative to canvas
    function getPos(e) {
        var r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    // update and adjust div position if needed (anchor to a different corner etc.)
    function setDivPos(pos) {
        if (visible) {
            if (pos.x < 0)
                pos.x = 0;
            if (pos.y < 0)
                pos.y = 0;
            // other bound checks here
            div.style.left = pos.x + "px";
            div.style.top = pos.y + "px";
        }
    }
    // we need to use shared event handlers:
    canvas.addEventListener("mousemove", check);
    canvas.addEventListener("click", check);
}
var SimulationGUI = (function () {
    function SimulationGUI(canvas) {
        this.canvas = canvas;
        this.simulationContainer = new SimulationContainer();
        this.selectedNode = 0;
        this.selectedPropertyForChart = "totalTransmitTime";
        this.selectedStream = "";
        this.automaticHideNullProperties = true;
        this.headersListFullyShown = [];
        this.animations = [];
        this.area = 2000;
        this.currentChart = null;
        this.rawGroupColors = [new Color(200, 0, 0),
            new Color(0, 200, 0),
            new Color(0, 0, 200),
            new Color(200, 0, 200),
            new Color(200, 200, 0),
            new Color(0, 200, 200),
            new Color(100, 100, 0),
            new Color(100, 0, 100),
            new Color(0, 0, 100),
            new Color(0, 0, 0)];
        this.ctx = canvas.getContext("2d");
        this.heatMapPalette = new Palette();
        this.heatMapPalette.addColor(new Color(255, 0, 0, 1, 0));
        this.heatMapPalette.addColor(new Color(255, 255, 0, 1, 0.5));
        this.heatMapPalette.addColor(new Color(0, 255, 0, 1, 1));
        this.charting = new Charting(this);
    }
    SimulationGUI.prototype.draw = function () {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        var selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        if (typeof selectedSimulation == "undefined")
            return;
        this.drawSlotStats();
        this.drawRange();
        this.drawNodes();
        for (var _i = 0, _a = this.animations; _i < _a.length; _i++) {
            var a = _a[_i];
            a.draw(this.canvas, this.ctx, this.area);
        }
    };
    SimulationGUI.prototype.drawSlotStats = function () {
        var canv = document.getElementById("canvSlots");
        var ctx = canv.getContext("2d");
        var selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        if (selectedSimulation.slotUsageAP.length == 0 || selectedSimulation.slotUsageSTA.length == 0)
            return;
        //let lastValues = selectedSimulation.totalSlotUsageAP;
        var max = Number.MIN_VALUE;
        for (var i = 0; i < Math.min(selectedSimulation.totalSlotUsageAP.length, selectedSimulation.totalSlotUsageSTA.length); i++) {
            var sum = selectedSimulation.totalSlotUsageAP[i] + selectedSimulation.totalSlotUsageSTA[i];
            if (max < sum)
                max = sum;
        }
        var width = canv.width;
        var height = canv.height;
        var padding = 5;
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "#CCC";
        ctx.fillStyle = "#7cb5ec";
        ctx.lineWidth = 1;
        if (selectedSimulation.config.nRawSlots.length > 1) {
            var nRps = selectedSimulation.config.numRpsElements;
            var groupsPerRps = selectedSimulation.config.nGroupsPerRps;
            var slotsPerGroup = selectedSimulation.config.nRawSlots;
            var ind = 0;
            var rawLengths = []; // sum of durations of all RAW groups in the same RPS; length same as nRps
            for (var i = 0; i < nRps; i++) {
                var totalRawDuration = 0;
                for (var j = ind; j < groupsPerRps[i] + ind; j++) {
                    totalRawDuration += selectedSimulation.config.rawGroupDurations[j];
                }
                rawLengths.push(totalRawDuration);
                ind += groupsPerRps[i];
            }
            var m = rawLengths.reduce(function (a, b) { return Math.max(a, b); });
            var iRps = rawLengths.indexOf(m); // index of the most filled RPS with RAW groups
            // we want to scale the longest total raw groups in one rps to the window width
            // all the other groups in RPSs will be scaled to the longest
            // the goal is to have a feeling about RAW slot durations and RAW groups' durations
            var numerous = groupsPerRps.reduce(function (a, b) { return Math.max(a, b); });
            var coefProp = (width - (2 + numerous) * padding) / (rawLengths[iRps]);
            var multiGroupWidths = [];
            var multiSlotWidths = [];
            ind = 0;
            for (var i = 0; i < nRps; i++) {
                multiGroupWidths[i] = [];
                multiSlotWidths[i] = [];
                for (var j = ind; j < ind + groupsPerRps[i]; j++) {
                    var groupWidth = coefProp * selectedSimulation.config.rawGroupDurations[j];
                    multiGroupWidths[i].push(groupWidth);
                    //widths of groups for [i][j] where i is index of RPS and j index of RAW group inside the i-th RPS
                    multiSlotWidths[i].push(groupWidth / slotsPerGroup[j]);
                }
                ind += groupsPerRps[i];
            }
            var rectHeight = height / nRps - (nRps + 1) * padding;
            var currentSlotNum = 0;
            ind = 0;
            for (var i = 0; i < nRps; i++) {
                for (var j = 0; j < multiGroupWidths[i].length; j++) {
                    ctx.beginPath();
                    var xGroupCoord = void 0;
                    if (j != 0)
                        xGroupCoord = padding + j * (padding + multiGroupWidths[i][j - 1] + 0.5) + 0.5;
                    else
                        xGroupCoord = padding + 0.5, i * rectHeight + (i + 1) * (padding + 0.5);
                    ctx.rect(xGroupCoord, i * rectHeight + (i + 1) * (padding + 0.5), multiGroupWidths[i][j], rectHeight);
                    ctx.stroke();
                    var slots = multiGroupWidths[i][j] / multiSlotWidths[i][j]; // number of slots in current group
                    for (var k = 0; k < slots; k++) {
                        var sum = selectedSimulation.totalSlotUsageAP[currentSlotNum] + selectedSimulation.totalSlotUsageSTA[currentSlotNum];
                        if (sum > 0) {
                            var percAP = selectedSimulation.totalSlotUsageAP[currentSlotNum] / sum;
                            var percSTA = selectedSimulation.totalSlotUsageSTA[currentSlotNum] / sum;
                            var value = void 0;
                            var y = void 0;
                            value = selectedSimulation.totalSlotUsageAP[currentSlotNum];
                            currentSlotNum++;
                            y = (1 - sum / max) * rectHeight; // supljina u slotu prazno vertikalno
                            var fullBarHeight = (rectHeight - y); // ap+sta bar height orange+blue
                            var barHeight = fullBarHeight * percAP; // ap bar height orange
                            ctx.fillStyle = "#ecb57c";
                            ctx.fillRect(xGroupCoord + k * multiSlotWidths[i][j], i * rectHeight + (i + 1) * (padding + 0.5) + y, multiSlotWidths[i][j], barHeight);
                            /*
                            // not needed
                            ctx.beginPath();
                            ctx.rect(padding + j * (padding + multiGroupWidths[i][j]) + k * multiSlotWidths[i][j] + 0.5, i * rectHeight + (i + 1) * (padding + 0.5), multiSlotWidths[i][j], rectHeight);
                            ctx.stroke();*/
                            y += barHeight;
                            barHeight = fullBarHeight * percSTA;
                            ctx.fillStyle = "#7cb5ec";
                            ctx.fillRect(xGroupCoord + k * multiSlotWidths[i][j], i * rectHeight + (i + 1) * (padding + 0.5) + y, multiSlotWidths[i][j], barHeight);
                        }
                        ctx.beginPath();
                        ctx.rect(xGroupCoord + k * multiSlotWidths[i][j], i * rectHeight + (i + 1) * (padding + 0.5), multiSlotWidths[i][j], rectHeight);
                        ctx.stroke();
                    }
                    // hover 
                    var region = { x: xGroupCoord, y: i * rectHeight + (i + 1) * (padding + 0.5), w: multiGroupWidths[i][j], h: rectHeight };
                    var showtext = "Cross-slot: " + selectedSimulation.config.rawSlotBoundary[ind] + "; Slot count: " + selectedSimulation.config.rawSlotDurationCount[ind] + "; AID start: " + selectedSimulation.config.rawGroupAidStart[ind] + "; AID end: " + selectedSimulation.config.rawGroupAidEnd[ind];
                    if (toolTipContainer.length == ind) {
                        toolTipContainer.push(new ToolTip(canv, region, showtext, 150, 2000));
                    }
                    ind++;
                }
            }
        }
        else {
            var groups = selectedSimulation.config.numberOfRAWGroups;
            var slots = selectedSimulation.config.numberOfRAWSlots;
            var groupWidth = Math.floor(width / groups) - 2 * padding;
            var rectHeight = height - 2 * padding;
            for (var g = 0; g < groups; g++) {
                ctx.beginPath();
                ctx.rect(padding + g * (padding + groupWidth) + 0.5, padding + 0.5, groupWidth, rectHeight);
                ctx.stroke();
                var slotWidth = groupWidth / slots;
                for (var s = 0; s < slots; s++) {
                    var sum = selectedSimulation.totalSlotUsageAP[g * slots + s] + selectedSimulation.totalSlotUsageSTA[g * slots + s];
                    if (sum > 0) {
                        var percAP = selectedSimulation.totalSlotUsageAP[g * slots + s] / sum;
                        var percSTA = selectedSimulation.totalSlotUsageSTA[g * slots + s] / sum;
                        var value = void 0;
                        var y = void 0;
                        value = selectedSimulation.totalSlotUsageAP[g * slots + s];
                        y = (1 - sum / max) * rectHeight;
                        var fullBarHeight = (rectHeight - y);
                        var barHeight = fullBarHeight * percAP;
                        ctx.fillStyle = "#ecb57c";
                        ctx.fillRect(padding + g * (padding + groupWidth) + s * slotWidth + 0.5, padding + y + 0.5, slotWidth, barHeight);
                        y += barHeight;
                        barHeight = fullBarHeight * percSTA;
                        ctx.fillStyle = "#7cb5ec";
                        ctx.fillRect(padding + g * (padding + groupWidth) + s * slotWidth + 0.5, padding + y + 0.5, slotWidth, barHeight);
                    }
                    ctx.beginPath();
                    ctx.rect(padding + g * (padding + groupWidth) + s * slotWidth + 0.5, padding + 0.5, slotWidth, height - 2 * padding);
                    ctx.stroke();
                }
            }
        }
    };
    SimulationGUI.prototype.drawRange = function () {
        if (!this.simulationContainer.hasSimulations())
            return;
        this.ctx.strokeStyle = "#CCC";
        var selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        if (typeof selectedSimulation == "undefined")
            return;
        for (var _i = 0, _a = selectedSimulation.nodes; _i < _a.length; _i++) {
            var n = _a[_i];
            if (n.type == "AP") {
                for (var i = 1; i <= 10; i++) {
                    var radius = 100 * i * (this.canvas.width / this.area);
                    this.ctx.beginPath();
                    this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), radius, 0, Math.PI * 2, false);
                    this.ctx.stroke();
                }
            }
        }
    };
    SimulationGUI.prototype.getMinMaxOfProperty = function (stream, prop, deltas) {
        if (!this.simulationContainer.hasSimulations())
            return [0, 0];
        var curMax = Number.MIN_VALUE;
        var curMin = Number.MAX_VALUE;
        if (prop != "") {
            var selectedSimulation = this.simulationContainer.getSimulation(stream);
            for (var _i = 0, _a = selectedSimulation.nodes; _i < _a.length; _i++) {
                var n = _a[_i];
                var values = n.values;
                if (deltas && values.length > 1) {
                    var curVal = values[values.length - 1][prop];
                    var beforeVal = values[values.length - 2][prop];
                    var value = curVal - beforeVal;
                    if (curMax < value)
                        curMax = value;
                    if (curMin > value)
                        curMin = value;
                }
                else if (values.length > 0) {
                    var value = values[values.length - 1][prop];
                    if (curMax < value)
                        curMax = value;
                    if (curMin > value)
                        curMin = value;
                }
            }
            return [curMin, curMax];
        }
        else
            return [0, 0];
    };
    SimulationGUI.prototype.getColorForNode = function (n, curMax, curMin, el) {
        if (this.selectedPropertyForChart != "") {
            var type = el.attr("data-type");
            if (typeof type != "undefined" && type != "") {
                var min = void 0;
                if (el.attr("data-max") == "*")
                    min = curMin;
                else
                    min = parseInt(el.attr("data-min"));
                var max = void 0;
                if (el.attr("data-max") == "*")
                    max = curMax;
                else
                    max = parseInt(el.attr("data-max"));
                var values = n.values;
                if (values.length > 0) {
                    var value = values[values.length - 1][this.selectedPropertyForChart];
                    var alpha = void 0;
                    if (max - min != 0)
                        alpha = (value - min) / (max - min);
                    else
                        alpha = 1;
                    if (type == "LOWER_IS_BETTER")
                        return this.heatMapPalette.getColorAt(1 - alpha).toString();
                    else
                        return this.heatMapPalette.getColorAt(alpha).toString();
                }
            }
        }
        if (n.type == "STA" && !n.isAssociated)
            return "black";
        else
            return this.rawGroupColors[n.groupNumber % this.rawGroupColors.length].toString();
    };
    SimulationGUI.prototype.drawNodes = function () {
        if (!this.simulationContainer.hasSimulations())
            return;
        var minmax = this.getMinMaxOfProperty(this.selectedStream, this.selectedPropertyForChart, false);
        var curMax = minmax[1];
        var curMin = minmax[0];
        var selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        var el = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "']").get(0));
        for (var _i = 0, _a = selectedSimulation.nodes; _i < _a.length; _i++) {
            var n = _a[_i];
            this.ctx.beginPath();
            if (n.type == "AP") {
                this.ctx.fillStyle = "black";
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 6, 0, Math.PI * 2, false);
            }
            else {
                this.ctx.fillStyle = this.getColorForNode(n, curMax, curMin, el);
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 3, 0, Math.PI * 2, false);
            }
            this.ctx.fill();
            if (this.selectedNode >= 0 && this.selectedNode == n.id) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = "blue";
                this.ctx.lineWidth = 3;
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 8, 0, Math.PI * 2, false);
                this.ctx.stroke();
                this.ctx.lineWidth = 1;
            }
        }
    };
    SimulationGUI.prototype.update = function (dt) {
        for (var _i = 0, _a = this.animations; _i < _a.length; _i++) {
            var a = _a[_i];
            a.update(dt);
        }
        var newAnimationArr = [];
        for (var i = this.animations.length - 1; i >= 0; i--) {
            if (!this.animations[i].isFinished())
                newAnimationArr.push(this.animations[i]);
        }
        this.animations = newAnimationArr;
    };
    SimulationGUI.prototype.addAnimation = function (anim) {
        this.animations.push(anim);
    };
    /*onNodeUpdated(stream: string, id: number) {
        // bit of a hack to only update all overview on node stats with id = 0 because otherwise it would hammer the GUI update
        if (id == this.selectedNode || (this.selectedNode == -1 && id == 0)) {
                this.updateGUI(false);
        }
    }

    onNodeAdded(stream: string, id: number) {
        if (id == this.selectedNode)
            this.updateGUI(true);
    }
*/
    SimulationGUI.prototype.onNodeAssociated = function (stream, id) {
        if (stream == this.selectedStream) {
            var n = this.simulationContainer.getSimulation(stream).nodes[id];
            this.addAnimation(new AssociatedAnimation(n.x, n.y));
        }
    };
    SimulationGUI.prototype.onSimulationTimeUpdated = function (time) {
        $("#simCurrentTime").text(time);
    };
    SimulationGUI.prototype.changeNodeSelection = function (id) {
        // don't change the node if channel traffic is selected
        if (id != -1 && (this.selectedPropertyForChart == "channelTraffic" || this.selectedPropertyForChart == "totalPacketLoss"))
            return;
        this.selectedNode = id;
        this.updateGUI(true);
    };
    /*private refreshTimerId: number = -1;
    private lastUpdatedOn: Date = new Date();*/
    SimulationGUI.prototype.updateGUI = function (full) {
        if (!this.simulationContainer.hasSimulations())
            return;
        var simulations = this.simulationContainer.getSimulations();
        var selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        if (typeof selectedSimulation == "undefined")
            return;
        this.updateConfigGUI(selectedSimulation);
        var sp = this.getAverageAndStdDevValue(selectedSimulation, "nrOfSuccessfulPackets")[0];
        if (sp) {
            var pl = 100 - 100 * sp / this.getAverageAndStdDevValue(selectedSimulation, "nrOfSentPackets")[0];
            selectedSimulation.totalPacketLoss.push(pl);
            $("#simTotalPacketLoss").text(pl.toFixed(2) + " %");
        }
        else {
            $("#simTotalPacketLoss").text("100 %");
        }
        if (selectedSimulation.totalTraffic) {
            $("#simChannelTraffic").text(selectedSimulation.totalTraffic + "B (" + (selectedSimulation.totalTraffic * 8 / selectedSimulation.currentTime).toFixed(2) + "Kbit/s)");
        }
        else {
            $("#simChannelTraffic").text("0 B (0 Kbit/s)");
        }
        var propertyElements = $(".nodeProperty");
        if (this.selectedNode < 0 || this.selectedNode >= selectedSimulation.nodes.length)
            this.updateGUIForAll(simulations, selectedSimulation, full);
        else
            this.updateGUIForSelectedNode(simulations, selectedSimulation, full);
    };
    SimulationGUI.prototype.updateConfigGUI = function (selectedSimulation) {
        $("#simulationName").text(selectedSimulation.config.name);
        var configElements = $(".configProperty");
        for (var i = 0; i < configElements.length; i++) {
            var prop = $(configElements[i]).attr("data-property");
            //if the property is nullable i.e. the metric is not measured for this particular scenario don't show it
            if (selectedSimulation.config[prop] && selectedSimulation.config[prop] != -1) {
                $($(configElements[i]).find("td").get(1)).text(selectedSimulation.config[prop]);
            }
            else {
                $($(configElements[i]).find("td").get(1)).parent().hide();
            }
        }
    };
    SimulationGUI.prototype.updateGUIForSelectedNode = function (simulations, selectedSimulation, full) {
        var node = selectedSimulation.nodes[this.selectedNode];
        $("#nodeTitle").text("Node " + node.id);
        var distance = Math.sqrt(Math.pow((node.x - selectedSimulation.apNode.x), 2) + Math.pow((node.y - selectedSimulation.apNode.y), 2));
        $("#nodePosition").text(node.x.toFixed(2) + "," + node.y.toFixed(2) + ", dist: " + distance.toFixed(2));
        if (node.type == "STA" && !node.isAssociated) {
            $("#nodeAID").text("Not associated");
        }
        else {
            $("#nodeAID").text(node.aId);
            $("#nodeRpsIndex").text(node.rpsIndex);
            $("#nodeGroupNumber").text(node.groupNumber);
            $("#nodeRawSlotIndex").text(node.rawSlotIndex);
        }
        var propertyElements = $(".nodeProperty");
        for (var i = 0; i < propertyElements.length; i++) {
            var prop = $(propertyElements[i]).attr("data-property");
            var values = node.values;
            if (typeof values != "undefined") {
                var el = "";
                if (values.length > 0) {
                    var avgStdDev = this.getAverageAndStdDevValue(selectedSimulation, prop);
                    if (simulations.length > 1) {
                        // compare with avg of others
                        var sumVal = 0;
                        var nrVals = 0;
                        for (var j = 0; j < simulations.length; j++) {
                            if (simulations[j] != selectedSimulation && this.selectedNode < simulations[j].nodes.length) {
                                var vals = simulations[j].nodes[this.selectedNode].values;
                                if (vals.length > 0) {
                                    sumVal += vals[vals.length - 1][prop];
                                    nrVals++;
                                }
                            }
                        }
                        var avg = sumVal / nrVals;
                        if (values[values.length - 1][prop] > avg)
                            el = "<div class='valueup' title='Value has increased compared to average (" + avg.toFixed(2) + ") of other simulations'>" + values[values.length - 1][prop] + "</div>";
                        else if (values[values.length - 1][prop] < avg)
                            el = "<div class='valuedown' title='Value has decreased compared to average (" + avg.toFixed(2) + ") of other simulations'>" + values[values.length - 1][prop] + "</div>";
                        else
                            el = values[values.length - 1][prop] + "";
                    }
                    else {
                        el = values[values.length - 1][prop] + "";
                    }
                    var prevSiblingHeader = ($($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('- ')[1] ? $($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('- ')[1] :
                        $($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('+ ')[1]);
                    if (this.headersListFullyShown.length > 0 && prevSiblingHeader) {
                        //prevSiblingHeader.replace(/(\r\n|\n|\r)/, "");
                        prevSiblingHeader = (prevSiblingHeader.substr(0, prevSiblingHeader.indexOf("\r")) != "") ? prevSiblingHeader.substr(0, prevSiblingHeader.indexOf("\r")) : prevSiblingHeader.substr(0, prevSiblingHeader.indexOf("\n"));
                    }
                    if (this.automaticHideNullProperties) {
                        if ((selectedSimulation.nodes[this.selectedNode].values[values.length - 1][prop] &&
                            selectedSimulation.nodes[this.selectedNode].values[values.length - 1][prop] != -1) ||
                            this.headersListFullyShown.indexOf(prevSiblingHeader) > -1) {
                            $(propertyElements[i]).show();
                        }
                        else {
                            $(propertyElements[i]).hide();
                        }
                    }
                    var propType = $(propertyElements[i]).attr("data-type");
                    var zScore = avgStdDev[1] == 0 ? 0 : ((values[values.length - 1][prop] - avgStdDev[0]) / avgStdDev[1]);
                    if (!isNaN(avgStdDev[0]) && !isNaN(avgStdDev[1])) {
                        // scale zscore to [0-1]
                        var alpha = zScore / 2;
                        if (alpha > 1)
                            alpha = 1;
                        else if (alpha < -1)
                            alpha = -1;
                        alpha = (alpha + 1) / 2;
                        var color = void 0;
                        if (propType == "LOWER_IS_BETTER")
                            color = this.heatMapPalette.getColorAt(1 - alpha).toString();
                        else if (propType == "HIGHER_IS_BETTER")
                            color = this.heatMapPalette.getColorAt(alpha).toString();
                        else
                            color = "black";
                        // prefix z-score
                        el = "<div class=\"zscore\" title=\"Z-score: " + zScore + "\" style=\"background-color: " + color + "\" />" + el;
                    }
                    $($(propertyElements[i]).find("td").get(1)).empty().append(el);
                }
            }
            else
                $($(propertyElements[i]).find("td").get(1)).empty().append("Property not found");
        }
        this.charting.deferUpdateCharts(simulations, full);
    };
    SimulationGUI.prototype.getAverageAndStdDevValue = function (simulation, prop) {
        var sum = 0;
        var count = 0;
        for (var i = 0; i < simulation.nodes.length; i++) {
            var node = simulation.nodes[i];
            var values = node.values;
            if (values.length > 0) {
                if (values[values.length - 1][prop] != -1) {
                    sum += values[values.length - 1][prop];
                    count++;
                }
            }
        }
        if (count == 0)
            return [];
        var avg = sum / count;
        var sumSquares = 0;
        for (var i = 0; i < simulation.nodes.length; i++) {
            var node = simulation.nodes[i];
            var values = node.values;
            if (values.length > 0) {
                if (values[values.length - 1][prop] != -1) {
                    var val = (values[values.length - 1][prop] - avg) * (values[values.length - 1][prop] - avg);
                    sumSquares += val;
                }
            }
        }
        var stddev = Math.sqrt(sumSquares / count);
        return [avg, stddev];
    };
    SimulationGUI.prototype.updateGUIForAll = function (simulations, selectedSimulation, full) {
        $("#nodeTitle").text("All nodes");
        $("#nodePosition").text("---");
        $("#nodeAID").text("---");
        $("#nodeRpsIndex").text("---");
        $("#nodeGroupNumber").text("---");
        $("#nodeRawSlotIndex").text("---");
        var propertyElements = $(".nodeProperty");
        for (var i = 0; i < propertyElements.length; i++) {
            var prop = $(propertyElements[i]).attr("data-property");
            var avgAndStdDev = this.getAverageAndStdDevValue(selectedSimulation, prop);
            var el = "";
            var prevSiblingHeader = ($($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('- ')[1] ? $($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('- ')[1] :
                $($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('+ ')[1]);
            if (this.headersListFullyShown.length > 0 && prevSiblingHeader) {
                //prevSiblingHeader.replace(/(\r\n|\n|\r)/, "");
                prevSiblingHeader = (prevSiblingHeader.substr(0, prevSiblingHeader.indexOf("\r")) != "") ? prevSiblingHeader.substr(0, prevSiblingHeader.indexOf("\r")) : prevSiblingHeader.substr(0, prevSiblingHeader.indexOf("\n"));
            }
            if (avgAndStdDev.length > 0) {
                var text = avgAndStdDev[0].toFixed(2) + " (stddev: " + avgAndStdDev[1].toFixed(2) + ")";
                if (simulations.length > 1) {
                    // compare with avg of others
                    var sumVal = 0;
                    var nrVals = 0;
                    for (var j = 0; j < simulations.length; j++) {
                        if (simulations[j] != selectedSimulation) {
                            var avgAndStdDevOther = this.getAverageAndStdDevValue(simulations[j], prop);
                            if (avgAndStdDevOther.length > 0) {
                                sumVal += avgAndStdDevOther[0];
                                nrVals++;
                            }
                        }
                    }
                    var avg = sumVal / nrVals;
                    if (avgAndStdDev[0] > avg)
                        el = "<div class='valueup' title='Average has increased compared to average (" + avg.toFixed(2) + ") of other simulations'>" + text + "</div>";
                    else if (avgAndStdDev[0] < avg)
                        el = "<div class='valuedown' title='Average has decreased compared to average (" + avg.toFixed(2) + ") of other simulations'>" + text + "</div>";
                    else
                        el = text;
                }
                else {
                    el = text;
                }
                if (this.automaticHideNullProperties) {
                    if ((el != '0.00 (stddev: 0.00)' && el != "NaN (stddev: NaN)") || this.headersListFullyShown.indexOf(prevSiblingHeader) > -1) {
                        $(propertyElements[i]).show();
                    }
                    else {
                        $(propertyElements[i]).hide();
                    }
                }
                $($(propertyElements[i]).find("td").get(1)).empty().append(el);
            }
            else {
                if (this.headersListFullyShown.indexOf(prevSiblingHeader) > -1) {
                    $(propertyElements[i]).show();
                }
                else {
                    $(propertyElements[i]).hide();
                }
            }
        }
        this.charting.deferUpdateCharts(simulations, full);
    };
    return SimulationGUI;
}());
function getParameterByName(name, url) {
    if (!url)
        url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"), results = regex.exec(url);
    if (!results)
        return "";
    if (!results[2])
        return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}
$(document).ready(function () {
    var sim = null;
    var evManager = null;
    var time = new Date().getTime();
    var canvas = $("#canv").get(0);
    sim = new SimulationGUI(canvas);
    var streams;
    var compare = getParameterByName("compare");
    if (compare == "")
        streams = ["live"];
    else
        streams = compare.split(',');
    for (var _i = 0, streams_1 = streams; _i < streams_1.length; _i++) {
        var stream = streams_1[_i];
        var rdb = "<input class=\"rdbStream\" name=\"streams\" type='radio' data-stream='" + stream + "'>&nbsp;";
        $("#rdbStreams").append(rdb);
    }
    sim.selectedStream = streams[0];
    $(".rdbStream[data-stream='" + sim.selectedStream + "']").prop("checked", true);
    // connect to the nodejs server with a websocket
    console.log("Connecting to websocket");
    var opts = {
        reconnection: false,
        timeout: 1000000
    };
    var hasConnected = false;
    var sock = io("http://" + window.location.host + "/", opts);
    sock.on("connect", function (data) {
        if (hasConnected)
            return;
        hasConnected = true;
        console.log("Websocket connected, listening for events");
        evManager = new EventManager(sim);
        console.log("Subscribing to " + streams);
        sock.emit("subscribe", {
            simulations: streams
        });
    }).on("error", function () {
        console.log("Unable to connect to server websocket endpoint");
    });
    sock.on("fileerror", function (data) {
        alert("Error: " + data);
    });
    sock.on("entry", function (data) {
        evManager.onReceive(data);
    });
    sock.on("bulkentry", function (data) {
        evManager.onReceiveBulk(data);
    });
    if (sim.selectedStream != "live") {
        // because data is not available 
        $("#simTotalPacketLoss").removeClass("chartProperty");
        $("#simTotalPacketLoss").addClass("configProperty");
        $("#simTotalPacketLoss").parent().hide();
    }
    $(canvas).keydown(function (ev) {
        if (!sim.simulationContainer.hasSimulations())
            return;
        if (ev.keyCode == 37) {
            // left
            if (sim.selectedNode - 1 >= 0)
                sim.changeNodeSelection(sim.selectedNode - 1);
        }
        else if (ev.keyCode == 39) {
            // right
            if (sim.selectedNode + 1 < sim.simulationContainer.getSimulation(sim.selectedStream).nodes.length) {
                sim.changeNodeSelection(sim.selectedNode + 1);
            }
        }
    });
    $(canvas).click(function (ev) {
        if (!sim.simulationContainer.hasSimulations())
            return;
        var rect = canvas.getBoundingClientRect();
        var x = (ev.clientX - rect.left) / (canvas.width / sim.area);
        var y = (ev.clientY - rect.top) / (canvas.width / sim.area);
        var selectedSimulation = sim.simulationContainer.getSimulation(sim.selectedStream);
        var selectedNode = null;
        for (var _i = 0, _a = selectedSimulation.nodes; _i < _a.length; _i++) {
            var n = _a[_i];
            var dist = Math.sqrt(Math.pow((n.x - x), 2) + Math.pow((n.y - y), 2));
            if (dist < 20) {
                selectedNode = n;
                break;
            }
        }
        if (selectedNode != null) {
            $("#pnlDistribution").hide();
            sim.changeNodeSelection(selectedNode.id);
        }
        else {
            $("#pnlDistribution").show();
            sim.changeNodeSelection(-1);
        }
    });
    $(".chartProperty").click(function (ev) {
        $(".chartProperty").removeClass("selected");
        $(this).addClass("selected");
        if (!$(this).hasClass("nodeProperty"))
            sim.selectedNode = -1;
        sim.selectedPropertyForChart = $(this).attr("data-property");
        sim.updateGUI(true);
    });
    $("#chkShowDistribution").change(function (ev) {
        sim.updateGUI(true);
    });
    $("#chkShowDeltas").change(function (ev) {
        sim.updateGUI(true);
    });
    $(".rdbStream").change(function (ev) {
        var rdbs = $(".rdbStream");
        for (var i = 0; i < rdbs.length; i++) {
            var rdb = $(rdbs.get(i));
            if (rdb.prop("checked")) {
                sim.selectedStream = rdb.attr("data-stream");
                sim.updateGUI(true);
            }
        }
    });
    $('.header').click(function () {
        $(this).find('span').text(function (_, value) {
            return value == '-' ? '+' : '-';
        });
        var sign = $(this).find('span').text();
        var elem = $(this).find('th').text().substr(2);
        if (sign == '-') {
            sim.automaticHideNullProperties = true;
            var i = sim.headersListFullyShown.indexOf(elem);
            sim.headersListFullyShown.splice(i, 1);
            sim.updateGUI(true);
        }
        else {
            sim.automaticHideNullProperties = false;
            $(this).nextUntil('tr.header').show();
            elem.trim();
            sim.headersListFullyShown.push(elem);
        }
    });
    /*$("#pnlDistribution").show();
    sim.changeNodeSelection(-1);*/
    loop();
    function loop() {
        sim.draw();
        var newTime = new Date().getTime();
        var dt = newTime - time;
        sim.update(dt);
        if (evManager != null) {
            try {
                evManager.processEvents();
            }
            catch (e) {
                console.error(e);
            }
        }
        time = newTime;
        window.setTimeout(loop, 25);
    }
});
var SimulationNode = (function () {
    function SimulationNode() {
        this.id = -1;
        this.x = 0;
        this.y = 0;
        this.aId = 0;
        this.rpsIndex = 0;
        this.groupNumber = 0;
        this.rawSlotIndex = 0;
        this.type = "";
        this.values = [];
    }
    return SimulationNode;
}());
var NodeValue = (function () {
    function NodeValue() {
        this.totalTransmitTime = 0;
        this.totalReceiveTime = 0;
        this.totalDozeTime = 0;
        this.totalActiveTime = 0;
        this.nrOfTransmissions = 0;
        this.nrOfTransmissionsDropped = 0;
        this.nrOfReceives = 0;
        this.nrOfReceivesDropped = 0;
        this.nrOfSentPackets = 0;
        this.nrOfSuccessfulPackets = 0;
        this.nrOfDroppedPackets = 0;
        this.latency = 0;
        this.avgSentReceiveTime = 0;
        this.goodputKbit = 0;
        this.edcaQueueLength = 0;
        this.nrOfSuccessfulRoundtripPackets = 0;
        this.avgRoundtripTime = 0;
        this.tcpCongestionWindow = 0;
        this.numberOfTCPRetransmissions = 0;
        this.nrOfReceivesDroppedByDestination = 0;
        this.numberOfTCPRetransmissionsFromAP = 0;
        this.numberOfMACTxRTSFailed = 0;
        this.numberofMACTxMissedACKAndDroppedPacket = 0;
        this.numberOfMACTxMissedACK = 0;
        this.numberOfDropsByReasonUnknown = 0;
        this.numberOfDropsByReasonPhyInSleepMode = 0;
        this.numberOfDropsByReasonPhyNotEnoughSignalPower = 0;
        this.numberOfDropsByReasonPhyUnsupportedMode = 0;
        this.numberOfDropsByReasonPhyPreambleHeaderReceptionFailed = 0;
        this.numberOfDropsByReasonPhyRxDuringChannelSwitching = 0;
        this.numberOfDropsByReasonPhyAlreadyReceiving = 0;
        this.numberOfDropsByReasonPhyAlreadyTransmitting = 0;
        this.numberOfDropsByReasonPhyAlreadyPlcpReceptionFailed = 0;
        this.numberOfDropsByReasonMacNotForAP = 0;
        this.numberOfDropsByReasonMacAPToAPFrame = 0;
        this.numberOfDropsByReasonMacQueueDelayExceeded = 0;
        this.numberOfDropsByReasonMacQueueSizeExceeded = 0;
        this.numberOfDropsByReasonTCPTxBufferExceeded = 0;
        this.numberOfDropsFromAPByReasonUnknown = 0;
        this.numberOfDropsFromAPByReasonPhyInSleepMode = 0;
        this.numberOfDropsFromAPByReasonPhyNotEnoughSignalPower = 0;
        this.numberOfDropsFromAPByReasonPhyUnsupportedMode = 0;
        this.numberOfDropsFromAPByReasonPhyPreambleHeaderReceptionFailed = 0;
        this.numberOfDropsFromAPByReasonPhyRxDuringChannelSwitching = 0;
        this.numberOfDropsFromAPByReasonPhyAlreadyReceiving = 0;
        this.numberOfDropsFromAPByReasonPhyAlreadyTransmitting = 0;
        this.numberOfDropsFromAPByReasonPhyAlreadyPlcpReceptionFailed = 0;
        this.numberOfDropsFromAPByReasonMacNotForAP = 0;
        this.numberOfDropsFromAPByReasonMacAPToAPFrame = 0;
        this.numberOfDropsFromAPByReasonMacQueueDelayExceeded = 0;
        this.numberOfDropsFromAPByReasonMacQueueSizeExceeded = 0;
        this.numberOfDropsFromAPByReasonTCPTxBufferExceeded = 0;
        this.tcpRTO = 0;
        this.numberOfAPScheduledPacketForNodeInNextSlot = 0;
        this.numberOfAPSentPacketForNodeImmediately = 0;
        this.avgRemainingSlotTimeWhenAPSendingInSameSlot = 0;
        this.numberOfCollisions = 0;
        this.tcpConnected = 0;
        this.tcpSlowStartThreshold = 0;
        this.tcpEstimatedBandwidth = 0;
        this.tcpRTT = 0;
        this.numberOfBeaconsMissed = 0;
        this.numberOfTransmissionsDuringRAWSlot = 0;
        this.totalNumberOfDrops = 0;
        this.firmwareTransferTime = 0;
        this.ipCameraSendingRate = 0;
        this.ipCameraReceivingRate = 0;
        this.numberOfTransmissionsCancelledDueToCrossingRAWBoundary = 0;
        this.reliability = 0;
    }
    return NodeValue;
}());
var APNode = (function (_super) {
    __extends(APNode, _super);
    function APNode() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.type = "AP";
        return _this;
    }
    return APNode;
}(SimulationNode));
var STANode = (function (_super) {
    __extends(STANode, _super);
    function STANode() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.type = "STA";
        _this.isAssociated = false;
        return _this;
    }
    return STANode;
}(SimulationNode));
var SimulationConfiguration = (function () {
    function SimulationConfiguration() {
        this.name = "";
        this.nGroupsPerRps = [];
        this.rawGroupDurations = [];
        this.rawSlotFormat = [];
        this.rawSlotDurationCount = [];
        this.rawSlotDuration = [];
        this.nRawSlots = [];
        this.rawSlotBoundary = [];
        this.rawGroupAidStart = [];
        this.rawGroupAidEnd = [];
    }
    return SimulationConfiguration;
}());
var Simulation = (function () {
    function Simulation() {
        this.nodes = [];
        this.slotUsageSTA = [];
        this.slotUsageAP = [];
        this.totalSlotUsageAP = [];
        this.totalSlotUsageSTA = [];
        this.totalSlotUsageTimestamps = [];
        this.totalTraffic = 0;
        this.currentTime = 0;
        //totalPacketLoss: number = 0;
        this.totalPacketLoss = [];
        this.config = new SimulationConfiguration();
    }
    return Simulation;
}());
//# sourceMappingURL=main.js.map