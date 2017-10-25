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
    div.style.cssText = "position:fixed;padding:7px;background:white;opacity:0.5;border-style:solid;border-color:#7cb5ec;border-width:1px;pointer-events:none;width:" + width + "px";
    div.innerHTML = text;
    // show the tool-tip
    this.show = function (pos) {
        if (!visible) {
            visible = true; // lock so it's only shown once
            setDivPos(pos); // set position
            parent.appendChild(div); // add to parent of canvas
            setTimeout(hideTooltip, timeout); // timeout for hide
            //console.log("SHOW");
        }
        //console.log("show nothing");
    };
    // hide the tool-tip
    function hideTooltip() {
        visible = false; // hide it after timeout
        parent.removeChild(div); // remove from DOM
        canvas.removeEventListener("click", check);
        canvas.removeEventListener("mousemove", check);
        //console.log("HIDE");
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
                    // hover xGroupCoord, i * rectHeight + (i + 1) * (padding + 0.5), multiGroupWidths[i][j], rectHeight
                    var region = { x: xGroupCoord, y: i * rectHeight + (i + 1) * (padding + 0.5), w: multiGroupWidths[i][j], h: rectHeight };
                    var showtext = "Cross-slot: " + selectedSimulation.config.rawSlotBoundary[ind] + "; Slot count: " + selectedSimulation.config.rawSlotDurationCount[ind] + "; AID start: " + selectedSimulation.config.rawGroupAidStart[ind] + "; AID end: " + selectedSimulation.config.rawGroupAidEnd[ind];
                    ind++;
                    if (toolTipContainer.length == 1) {
                        setTimeout(toolTipContainer[0].hideTooltip, 0);
                        toolTipContainer[0] = new ToolTip(canv, region, showtext, 150, 4000);
                    }
                    else {
                        toolTipContainer.push(new ToolTip(canv, region, showtext, 150, 4000));
                    }
                    //console.log(toolTipContainer);
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
                        // these 3 lines below are unnecessary
                        /*ctx.beginPath();
                        ctx.rect(padding + g * (padding + groupWidth) + s * slotWidth + 0.5, padding + 0.5, slotWidth, height - 2 * padding);
                        ctx.stroke();
                        */
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
                        //console.log("BEG-"+prevSiblingHeader+"-END")
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
                var prevSiblingHeader = ($($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('- ')[1] ? $($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('- ')[1] :
                    $($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('+ ')[1]);
                if (this.headersListFullyShown.length > 0 && prevSiblingHeader) {
                    prevSiblingHeader = prevSiblingHeader.substr(0, prevSiblingHeader.indexOf("\n"));
                }
                if (this.automaticHideNullProperties) {
                    if ((el != '0.00 (stddev: 0.00)' && el != "-1") || this.headersListFullyShown.indexOf(prevSiblingHeader) > -1) {
                        $(propertyElements[i]).show();
                    }
                    else {
                        //zero and -1 elements and the names of hidden metrics are shown in the browser console
                        $(propertyElements[i]).hide();
                    }
                }
                $($(propertyElements[i]).find("td").get(1)).empty().append(el);
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
//# sourceMappingURL=index.js.map