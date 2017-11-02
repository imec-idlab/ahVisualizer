/// <reference path="../../../../typings/globals/jquery/index.d.ts" />
/// <reference path="../../../../typings/globals/socket.io/index.d.ts" />
/// <reference path="../../../../typings/globals/highcharts/index.d.ts" />

declare namespace io {
    class Options {
        reconnection: boolean;
        timeout: number;
    }
    function connect(url: string): SocketIO.Socket;
    function socket(url: string, opts: Options): SocketIO.Socket;
}

class SimulationContainer {

    private keys: string[] = [];

    private simulations = {};
    getSimulation(stream: string): Simulation {
        return this.simulations[stream];
    }

    setSimulation(stream: string, sim: Simulation) {
        this.simulations[stream] = sim;
        this.keys.push(stream);
    }

    hasSimulations(): boolean {
        return this.keys.length > 0;
    }

    getStream(idx: number): string {
        return this.keys[idx];
    }

    getStreams(): string[] {
        return this.keys.slice(0);
    }

    getSimulations(): Simulation[] {
        let sims: Simulation[] = [];
        for (let k of this.keys) {
            sims.push(this.simulations[k]);
        }
        return sims;
    }

}


var toolTipContainer: any[] = [];
// The Tool-Tip instance:
function ToolTip(canvas: HTMLCanvasElement, region: any, text: string, width: number, timeout: number) {

    var me = this,                                // self-reference for event handlers
        div = document.createElement("div"),      // the tool-tip div
        parent = canvas.parentNode,               // parent node for canvas
        visible = false;                          // current status

    // set some initial styles, can be replaced by class-name etc.
    div.style.cssText = "position:fixed;padding:7px;background:white;opacity:0.9;border-style:solid;border-color:#7cb5ec;border-width:1px;pointer-events:none;width:" + width + "px";
    div.innerHTML = text;

    // show the tool-tip
    this.show = function (pos) {
        if (!visible) {                               // ignore if already shown (or reset time)
            //me.hideOther();
            visible = true;                           // lock so it's only shown once
            setDivPos(pos);                           // set position
            parent.appendChild(div);                  // add to parent of canvas
            setTimeout(hide, timeout);                // timeout for hide
        }
    }

    // hide the tool-tip
    function hide() {
        visible = false;                            // hide it after timeout
        parent.removeChild(div);                    // remove from DOM     
    }

    // check mouse position, add limits as wanted... just for example:
    function check(e) {
        var pos = getPos(e),
            posAbs = { x: e.clientX, y: e.clientY };  // div is fixed, so use clientX/Y
        if (!visible &&
            pos.x >= region.x && pos.x < region.x + region.w &&
            pos.y >= region.y && pos.y < region.y + region.h) {
            me.show(posAbs);                          // show tool-tip at this pos
        }
        else setDivPos(posAbs);                       // otherwise, update position
    }

    // get mouse position relative to canvas
    function getPos(e) {
        var r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top }
    }

    // update and adjust div position if needed (anchor to a different corner etc.)
    function setDivPos(pos) {
        if (visible) {
            if (pos.x < 0) pos.x = 0;
            if (pos.y < 0) pos.y = 0;
            // other bound checks here
            div.style.left = pos.x + "px";
            div.style.top = pos.y + "px";
        }
    }

    // we need to use shared event handlers:
    canvas.addEventListener("mousemove", check);
    canvas.addEventListener("click", check);
}


class SimulationGUI {

    public simulationContainer: SimulationContainer = new SimulationContainer();
    public selectedNode: number = 0;
    public selectedPropertyForChart: string = "totalTransmitTime";
    public selectedStream: string = "";
    public automaticHideNullProperties: boolean = true;
    public headersListFullyShown: string[] = [];

    private ctx: CanvasRenderingContext2D;
    private animations: Animation[] = [];

    area: number = 2000;

    currentChart: HighchartsChartObject = null;

    private heatMapPalette: Palette;
    private rawGroupColors: Color[] = [new Color(200, 0, 0),
    new Color(0, 200, 0),
    new Color(0, 0, 200),
    new Color(200, 0, 200),
    new Color(200, 200, 0),
    new Color(0, 200, 200),
    new Color(100, 100, 0),
    new Color(100, 0, 100),
    new Color(0, 0, 100),
    new Color(0, 0, 0)];

    private charting: Charting;

    constructor(private canvas: HTMLCanvasElement) {
        this.ctx = <CanvasRenderingContext2D>canvas.getContext("2d");

        this.heatMapPalette = new Palette();
        this.heatMapPalette.addColor(new Color(255, 0, 0, 1, 0));
        this.heatMapPalette.addColor(new Color(255, 255, 0, 1, 0.5));
        this.heatMapPalette.addColor(new Color(0, 255, 0, 1, 1));

        this.charting = new Charting(this);
    }

    draw() {
        this.ctx.fillStyle = "white";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        let selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);

        if (typeof selectedSimulation == "undefined")
            return;

        
        this.drawNodes();
        this.drawRange();
        this.drawSlotStats();
        

        for (let a of this.animations) {
            a.draw(this.canvas, this.ctx, this.area);
        }
    }

    private drawSlotStats() {
        let canv = <HTMLCanvasElement>document.getElementById("canvSlots");
        let ctx = canv.getContext("2d");
        let selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);

        if (selectedSimulation.slotUsageAP.length == 0 || selectedSimulation.slotUsageSTA.length == 0)
            return;
        
        //let lastValues = selectedSimulation.totalSlotUsageAP;

        let max = Number.MIN_VALUE;
        for (let i = 0; i < Math.min(selectedSimulation.totalSlotUsageAP.length, selectedSimulation.totalSlotUsageSTA.length); i++) {
            let sum = selectedSimulation.totalSlotUsageAP[i] + selectedSimulation.totalSlotUsageSTA[i];
            if (max < sum) max = sum;
        }

        let width = canv.width;
        let height = canv.height;

        let padding = 5;

        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = "#CCC";
        ctx.fillStyle = "#7cb5ec";

        ctx.lineWidth = 1;
        if (selectedSimulation.config.nRawSlots.length > 0) {
            let nRps = selectedSimulation.config.numRpsElements;
            let groupsPerRps = selectedSimulation.config.nGroupsPerRps;
            let slotsPerGroup = selectedSimulation.config.nRawSlots;
            let ind = 0;
            let rawLengths: number[] = []; // sum of durations of all RAW groups in the same RPS; length same as nRps
            for (let i = 0; i < nRps; i++) {
                let totalRawDuration = 0;
                for (let j = ind; j < groupsPerRps[i] + ind; j++) {
                    totalRawDuration += selectedSimulation.config.rawGroupDurations[j];
                }
                rawLengths.push(totalRawDuration);
                ind += groupsPerRps[i];
            }
            var m = rawLengths.reduce(function (a, b) { return Math.max(a, b) });
            let iRps = rawLengths.indexOf(m); // index of the most filled RPS with RAW groups

            // we want to scale the longest total raw groups in one rps to the window width
            // all the other groups in RPSs will be scaled to the longest
            // the goal is to have a feeling about RAW slot durations and RAW groups' durations
            var numerous = groupsPerRps.reduce(function (a, b) { return Math.max(a, b) });
            let coefProp = (width - (2 + numerous) * padding) / (rawLengths[iRps]);

            let multiGroupWidths: number[][] = [];
            let multiSlotWidths: number[][] = [];


            ind = 0;
            for (let i = 0; i < nRps; i++) {
                multiGroupWidths[i] = [];
                multiSlotWidths[i] = [];
                for (let j = ind; j < ind + groupsPerRps[i]; j++) {
                    let groupWidth = coefProp * selectedSimulation.config.rawGroupDurations[j];
                    multiGroupWidths[i].push(groupWidth);
                    //widths of groups for [i][j] where i is index of RPS and j index of RAW group inside the i-th RPS
                    multiSlotWidths[i].push(groupWidth / slotsPerGroup[j]);
                }
                ind += groupsPerRps[i];
            }
            let rectHeight = height / nRps - (nRps + 1) * padding;

            let currentSlotNum = 0;
            ind = 0;
            for (let i = 0; i < nRps; i++) { // iterate through RPS elements
                for (let j = 0; j < multiGroupWidths[i].length; j++) {// iterate through RAW groups within RPS elements
                    ctx.beginPath();
                    let xGroupCoord;
                    if (j != 0)
                        xGroupCoord = padding + j * (padding + multiGroupWidths[i][j - 1] + 0.5) + 0.5;
                    else
                        xGroupCoord = padding + 0.5, i * rectHeight + (i + 1) * (padding + 0.5);

                    ctx.rect(xGroupCoord, i * rectHeight + (i + 1) * (padding + 0.5), multiGroupWidths[i][j], rectHeight);

                    ctx.stroke();
                    let slots = multiGroupWidths[i][j] / multiSlotWidths[i][j]; // number of slots in current group

                    for (let k = 0; k < slots; k++) { // iterate through slots within RAW groups

                        let sum = selectedSimulation.totalSlotUsageAP[currentSlotNum] + selectedSimulation.totalSlotUsageSTA[currentSlotNum];

                        if (sum > 0) {
                            let percAP = selectedSimulation.totalSlotUsageAP[currentSlotNum] / sum;
                            let percSTA = selectedSimulation.totalSlotUsageSTA[currentSlotNum] / sum;

                            let value;
                            let y;
                            value = selectedSimulation.totalSlotUsageAP[currentSlotNum];
                            currentSlotNum++;
                            y = (1 - sum / max) * rectHeight; // supljina u slotu prazno vertikalno

                            let fullBarHeight = (rectHeight - y); // ap+sta bar height orange+blue
                            let barHeight = fullBarHeight * percAP; // ap bar height orange
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
                    let region = { x: xGroupCoord, y: i * rectHeight + (i + 1) * (padding + 0.5), w: multiGroupWidths[i][j], h: rectHeight };
                    let showtext = "Cross-slot: " + selectedSimulation.config.rawSlotBoundary[ind] + "; Slot count: " + selectedSimulation.config.rawSlotDurationCount[ind] + "; AID start: " + selectedSimulation.config.rawGroupAidStart[ind] + "; AID end: " + selectedSimulation.config.rawGroupAidEnd[ind];
                    if (toolTipContainer.length == ind) {
                        toolTipContainer.push(new ToolTip(canv, region, showtext, 150, 2000));
                    }
                    ind++;
                }
            }
        }
        else {
            let groups = selectedSimulation.config.numberOfRAWGroups;
            let slots = selectedSimulation.config.numberOfRAWSlots;
            let groupWidth = Math.floor(width / groups) - 2 * padding;
            let rectHeight = height - 2 * padding;
            for (var g = 0; g < groups; g++) {
                ctx.beginPath();
                ctx.rect(padding + g * (padding + groupWidth) + 0.5, padding + 0.5, groupWidth, rectHeight);
                ctx.stroke();

                let slotWidth = groupWidth / slots;
                for (let s = 0; s < slots; s++) {


                    let sum = selectedSimulation.totalSlotUsageAP[g * slots + s] + selectedSimulation.totalSlotUsageSTA[g * slots + s];
                    if (sum > 0) {
                        let percAP = selectedSimulation.totalSlotUsageAP[g * slots + s] / sum;
                        let percSTA = selectedSimulation.totalSlotUsageSTA[g * slots + s] / sum;

                        let value;
                        let y;
                        value = selectedSimulation.totalSlotUsageAP[g * slots + s];
                        y = (1 - sum / max) * rectHeight;

                        let fullBarHeight = (rectHeight - y);
                        let barHeight = fullBarHeight * percAP;
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


    }

    private drawRange() {
        if (!this.simulationContainer.hasSimulations())
            return;

        this.ctx.strokeStyle = "#CCC";

        let selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        if (typeof selectedSimulation == "undefined")
            return;
                   
        for (let n of selectedSimulation.nodes) {
            if (n.type == "AP") {
                for (let i = 1; i <= Math.ceil(selectedSimulation.config.rho/100) ; i++) {
                    let radius = 100 * i * (this.canvas.width / this.area);
                    this.ctx.beginPath();
                    this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), radius, 0, Math.PI * 2, false);
                    this.ctx.stroke();
                }
            }
        }
    }

    getMinMaxOfProperty(stream: string, prop: string, deltas: boolean): number[] {
        if (!this.simulationContainer.hasSimulations())
            return [0, 0];

        let curMax: number = Number.MIN_VALUE;
        let curMin: number = Number.MAX_VALUE;
        if (prop != "") {
            let selectedSimulation = this.simulationContainer.getSimulation(stream);
            for (let n of selectedSimulation.nodes) {
                let values = n.values;
                if (deltas && values.length > 1) {
                    let curVal = values[values.length - 1][prop];
                    let beforeVal = values[values.length - 2][prop];
                    let value = curVal - beforeVal;
                    if (curMax < value) curMax = value;
                    if (curMin > value) curMin = value;
                }
                else if (values.length > 0) {
                    let value = values[values.length - 1][prop];
                    if (curMax < value) curMax = value;
                    if (curMin > value) curMin = value;
                }
            }
            return [curMin, curMax];
        }
        else
            return [0, 0];

    }
    private getColorForNode(n: SimulationNode, curMax: number, curMin: number, el: JQuery): string {
        if (this.selectedPropertyForChart != "") {
            let type = el.attr("data-type");
            if (typeof type != "undefined" && type != "") {
                let min;
                if (el.attr("data-max") == "*")
                    min = curMin;
                else
                    min = parseInt(el.attr("data-min"));
                let max: number;
                if (el.attr("data-max") == "*")
                    max = curMax;
                else
                    max = parseInt(el.attr("data-max"));

                let values = n.values;
                if (values.length > 0) {
                    let value = values[values.length - 1][this.selectedPropertyForChart];

                    let alpha: number;
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

        if (n.type == "STA" && !(<STANode>n).isAssociated)
            return "black";
        else
            return this.rawGroupColors[n.groupNumber % this.rawGroupColors.length].toString();
    }

    private drawNodes() {
        if (!this.simulationContainer.hasSimulations())
            return;

        let minmax = this.getMinMaxOfProperty(this.selectedStream, this.selectedPropertyForChart, false);
        let curMax = minmax[1];
        let curMin = minmax[0];
        let selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);
        
        let el = $($(".nodeProperty[data-property='" + this.selectedPropertyForChart + "']").get(0));
        for (let n of selectedSimulation.nodes) {
            this.ctx.beginPath();

            if (n.type == "AP") {
                this.ctx.fillStyle = "black";
                this.area = n.x * 2;
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 6, 0, Math.PI * 2, false);
                
            }
            else {
                this.ctx.fillStyle = this.getColorForNode(n, curMax, curMin, el);
                this.ctx.arc(n.x * (this.canvas.width / this.area), n.y * (this.canvas.width / this.area), 3, 0, Math.PI * 2, false); //
            }
            this.ctx.fill();

            if (this.selectedNode >= 0 && this.selectedNode == n.id) {
                this.ctx.beginPath();
                this.ctx.strokeStyle = "blue";
                this.ctx.lineWidth = 3;
                this.ctx.arc(n.x * (this.canvas.width/ this.area), n.y * (this.canvas.width / this.area), 8, 0, Math.PI * 2, false);
                this.ctx.stroke();
                this.ctx.lineWidth = 1;
            }
        }
    }

    update(dt: number) {
        for (let a of this.animations) {
            a.update(dt);
        }

        let newAnimationArr: Animation[] = [];
        for (let i: number = this.animations.length - 1; i >= 0; i--) {
            if (!this.animations[i].isFinished())
                newAnimationArr.push(this.animations[i]);
        }
        this.animations = newAnimationArr;
    }

    addAnimation(anim: Animation) {
        this.animations.push(anim);
    }

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
    onNodeAssociated(stream: string, id: number) {
        if (stream == this.selectedStream) {
            let n = this.simulationContainer.getSimulation(stream).nodes[id];
            this.addAnimation(new AssociatedAnimation(n.x, n.y));
        }
    }

    onSimulationTimeUpdated(time: number) {
        $("#simCurrentTime").text(time);
    }

    changeNodeSelection(id: number) {

        // don't change the node if channel traffic is selected
        if (id != -1 && (this.selectedPropertyForChart == "channelTraffic" || this.selectedPropertyForChart == "totalPacketLoss"))
            return;

        this.selectedNode = id;

        this.updateGUI(true);
    }

    /*private refreshTimerId: number = -1;
    private lastUpdatedOn: Date = new Date();*/

    updateGUI(full: boolean) {
        if (!this.simulationContainer.hasSimulations())
            return;


        let simulations = this.simulationContainer.getSimulations();
        let selectedSimulation = this.simulationContainer.getSimulation(this.selectedStream);

        if (typeof selectedSimulation == "undefined")
            return;

        this.updateConfigGUI(selectedSimulation);
        let sp = this.getAverageAndStdDevValue(selectedSimulation, "nrOfSuccessfulPackets")[0];
        if (sp) {
            let pl = 100 - 100 * sp / this.getAverageAndStdDevValue(selectedSimulation, "nrOfSentPackets")[0];
            selectedSimulation.totalPacketLoss.push(pl);
            $("#simTotalPacketLoss").text(`${pl.toFixed(2)} %`);
        }
        else { $("#simTotalPacketLoss").text(`100 %`); }

        if (selectedSimulation.totalTraffic) {
            $("#simChannelTraffic").text(`${selectedSimulation.totalTraffic}B (${(selectedSimulation.totalTraffic * 8 / selectedSimulation.currentTime).toFixed(2)}Kbit/s)`);
        }
        else {
            $("#simChannelTraffic").text(`0 B (0 Kbit/s)`);
        }
        var propertyElements = $(".nodeProperty");

        if (this.selectedNode < 0 || this.selectedNode >= selectedSimulation.nodes.length)
            this.updateGUIForAll(simulations, selectedSimulation, full);
        else
            this.updateGUIForSelectedNode(simulations, selectedSimulation, full);


    }

    private updateConfigGUI(selectedSimulation: Simulation) {

        $("#simulationName").text(selectedSimulation.config.name);
        var configElements = $(".configProperty");
        for (let i = 0; i < configElements.length; i++) {
            let prop = $(configElements[i]).attr("data-property");
            //if the property is nullable i.e. the metric is not measured for this particular scenario don't show it
            if (selectedSimulation.config[prop] && selectedSimulation.config[prop] != -1) {
                $($(configElements[i]).find("td").get(1)).text(selectedSimulation.config[prop]);
            }
            else {
                $($(configElements[i]).find("td").get(1)).parent().hide();
            }
        }
    }
    private updateGUIForSelectedNode(simulations: Simulation[], selectedSimulation: Simulation, full: boolean) {
        let node = selectedSimulation.nodes[this.selectedNode];


        $("#nodeTitle").text("Node " + node.id);

        let distance = Math.sqrt((node.x - selectedSimulation.apNode.x) ** 2 + (node.y - selectedSimulation.apNode.y) ** 2)
        $("#nodePosition").text(node.x.toFixed(2) + "," + node.y.toFixed(2) + ", dist: " + distance.toFixed(2));
        if (node.type == "STA" && !(<STANode>node).isAssociated) {
            $("#nodeAID").text("Not associated");
        }
        else {
            $("#nodeAID").text(node.aId);
            $("#nodeRpsIndex").text(node.rpsIndex);
            $("#nodeGroupNumber").text(node.groupNumber);
            $("#nodeRawSlotIndex").text(node.rawSlotIndex);
        }

        var propertyElements = $(".nodeProperty");
        for (let i = 0; i < propertyElements.length; i++) {
            let prop = $(propertyElements[i]).attr("data-property");

            let values = node.values;

            if (typeof values != "undefined") {

                let el: string = "";

                if (values.length > 0) {

                    let avgStdDev = this.getAverageAndStdDevValue(selectedSimulation, prop);
                    if (simulations.length > 1) {
                        // compare with avg of others
                        let sumVal = 0;
                        let nrVals = 0;
                        for (let j = 0; j < simulations.length; j++) {
                            if (simulations[j] != selectedSimulation && this.selectedNode < simulations[j].nodes.length) {
                                let vals = simulations[j].nodes[this.selectedNode].values;
                                if (vals.length > 0) {
                                    sumVal += vals[vals.length - 1][prop];
                                    nrVals++;
                                }
                            }
                        }

                        let avg = sumVal / nrVals;
                        if (values[values.length - 1][prop] > avg)
                            el = `<div class='valueup' title='Value has increased compared to average (${avg.toFixed(2)}) of other simulations'>${values[values.length - 1][prop]}</div>`;
                        else if (values[values.length - 1][prop] < avg)
                            el = `<div class='valuedown' title='Value has decreased compared to average (${avg.toFixed(2)}) of other simulations'>${values[values.length - 1][prop]}</div>`;
                        else
                            el = values[values.length - 1][prop] + "";
                    }
                    else {
                        el = values[values.length - 1][prop] + "";
                    }
                    let prevSiblingHeader = ($($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('- ')[1] ? $($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('- ')[1] :
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
                    let propType = $(propertyElements[i]).attr("data-type");
                    let zScore = avgStdDev[1] == 0 ? 0 : ((values[values.length - 1][prop] - avgStdDev[0]) / avgStdDev[1]);

                    if (!isNaN(avgStdDev[0]) && !isNaN(avgStdDev[1])) {
                        // scale zscore to [0-1]
                        let alpha = zScore / 2;
                        if (alpha > 1) alpha = 1;
                        else if (alpha < -1) alpha = -1;
                        alpha = (alpha + 1) / 2;


                        let color: string;
                        if (propType == "LOWER_IS_BETTER")
                            color = this.heatMapPalette.getColorAt(1 - alpha).toString();
                        else if (propType == "HIGHER_IS_BETTER")
                            color = this.heatMapPalette.getColorAt(alpha).toString();
                        else
                            color = "black";

                        // prefix z-score
                        el = `<div class="zscore" title="Z-score: ${zScore}" style="background-color: ${color}" />` + el;
                    }
                    $($(propertyElements[i]).find("td").get(1)).empty().append(el);
                }
            }
            else
                $($(propertyElements[i]).find("td").get(1)).empty().append("Property not found");
        }

        this.charting.deferUpdateCharts(simulations, full);
    }


    getAverageAndStdDevValue(simulation: Simulation, prop: string): number[] {

        let sum = 0;
        let count = 0;
        for (var i = 0; i < simulation.nodes.length; i++) {
            var node = simulation.nodes[i];
            let values = node.values;
            if (values.length > 0) {

                if (values[values.length - 1][prop] != -1) {
                    sum += values[values.length - 1][prop];
                    count++;
                }
            }
        }
        if (count == 0) return [];

        let avg = sum / count;

        let sumSquares = 0;
        for (var i = 0; i < simulation.nodes.length; i++) {
            var node = simulation.nodes[i];
            let values = node.values;
            if (values.length > 0) {
                if (values[values.length - 1][prop] != -1) {
                    let val = (values[values.length - 1][prop] - avg) * (values[values.length - 1][prop] - avg);
                    sumSquares += val;
                }
            }
        }
        let stddev = Math.sqrt(sumSquares / count);

        return [avg, stddev];
    }

    private updateGUIForAll(simulations: Simulation[], selectedSimulation: Simulation, full: boolean) {


        $("#nodeTitle").text("All nodes");
        $("#nodePosition").text("---");
        $("#nodeAID").text("---");
        $("#nodeRpsIndex").text("---");
        $("#nodeGroupNumber").text("---");
        $("#nodeRawSlotIndex").text("---");

        var propertyElements = $(".nodeProperty");
        for (let i = 0; i < propertyElements.length; i++) {
            let prop = $(propertyElements[i]).attr("data-property");
            let avgAndStdDev = this.getAverageAndStdDevValue(selectedSimulation, prop);

            let el: string = "";
            let prevSiblingHeader = ($($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('- ')[1] ? $($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('- ')[1] :
                $($(propertyElements[i]).prevAll('tr.header').get(0)).text().split('+ ')[1]);
            if (this.headersListFullyShown.length > 0 && prevSiblingHeader) {
                //prevSiblingHeader.replace(/(\r\n|\n|\r)/, "");
                prevSiblingHeader = (prevSiblingHeader.substr(0, prevSiblingHeader.indexOf("\r")) != "") ? prevSiblingHeader.substr(0, prevSiblingHeader.indexOf("\r")) : prevSiblingHeader.substr(0, prevSiblingHeader.indexOf("\n"));
            }
            if (avgAndStdDev.length > 0) {
                let text = `${avgAndStdDev[0].toFixed(2)} (stddev: ${avgAndStdDev[1].toFixed(2)})`;
                if (simulations.length > 1) {
                    // compare with avg of others
                    let sumVal = 0;
                    let nrVals = 0;
                    for (let j = 0; j < simulations.length; j++) {
                        if (simulations[j] != selectedSimulation) {
                            let avgAndStdDevOther = this.getAverageAndStdDevValue(simulations[j], prop);

                            if (avgAndStdDevOther.length > 0) {
                                sumVal += avgAndStdDevOther[0];
                                nrVals++;
                            }
                        }
                    }

                    let avg = sumVal / nrVals;

                    if (avgAndStdDev[0] > avg)
                        el = `<div class='valueup' title='Average has increased compared to average (${avg.toFixed(2)}) of other simulations'>${text}</div>`;
                    else if (avgAndStdDev[0] < avg)
                        el = `<div class='valuedown' title='Average has decreased compared to average (${avg.toFixed(2)}) of other simulations'>${text}</div>`;
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
    }


}

interface IEntry {
    stream: string;
    line: string;
}
interface IEntries {
    stream: string;
    lines: string[];
}

function getParameterByName(name: string, url?: string) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return "";
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

$(document).ready(function () {


    let sim: SimulationGUI = null;
    let evManager: EventManager = null;

    let time = new Date().getTime();


    let canvas = <HTMLCanvasElement>$("#canv").get(0);
    sim = new SimulationGUI(canvas);

    let streams: string[];
    let compare = getParameterByName("compare");
    if (compare == "")
        streams = ["live"];
    else
        streams = compare.split(',');
    for (let stream of streams) {
        let rdb = `<input class="rdbStream" name="streams" type='radio' data-stream='${stream}'>&nbsp;`;
        $("#rdbStreams").append(rdb);
    }
    sim.selectedStream = streams[0];
    $(`.rdbStream[data-stream='${sim.selectedStream}']`).prop("checked", true);

    // connect to the nodejs server with a websocket
    console.log("Connecting to websocket");
    let opts = {
        reconnection: false,
        timeout: 1000000
    };


    let hasConnected = false;
    var sock: SocketIO.Socket = (<any>io)("http://" + window.location.host + "/", opts);

    sock.on("connect", function (data) {
        if (hasConnected) // only connect once
            return;

        hasConnected = true
        console.log("Websocket connected, listening for events");
        evManager = new EventManager(sim);


        console.log("Subscribing to " + streams);
        sock.emit("subscribe", {
            simulations: streams
        });


    }).on("error", function () {
        console.log("Unable to connect to server websocket endpoint");
    });

    sock.on("fileerror", function (data: string) {
        alert("Error: " + data);
    });

    sock.on("entry", function (data: IEntry) {
        evManager.onReceive(data);

    });

    sock.on("bulkentry", function (data: IEntries) {
        evManager.onReceiveBulk(data);
    });

    if (sim.selectedStream != "live") {
        // because data is not available 
        $("#simTotalPacketLoss").removeClass("chartProperty");
        $("#simTotalPacketLoss").addClass("configProperty");
        $("#simTotalPacketLoss").parent().hide();
    }

    $(canvas).keydown(ev => {
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

    $(canvas).click(ev => {
        if (!sim.simulationContainer.hasSimulations())
            return;

        var rect = canvas.getBoundingClientRect();
        let x = (ev.clientX - rect.left) / (canvas.width / sim.area);
        let y = (ev.clientY - rect.top) / (canvas.width / sim.area);

        let selectedSimulation = sim.simulationContainer.getSimulation(sim.selectedStream);
        let selectedNode: SimulationNode = null;
        for (let n of selectedSimulation.nodes) {

            let dist = Math.sqrt((n.x - x) ** 2 + (n.y - y) ** 2);
            if (dist < 3) {
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
    })
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
        let rdbs = $(".rdbStream");
        for (let i = 0; i < rdbs.length; i++) {
            let rdb = $(rdbs.get(i));
            if (rdb.prop("checked")) {
                sim.selectedStream = rdb.attr("data-stream");
                sim.updateGUI(true);
            }
        }
    });

    $('.header').click(function () {
        $(this).find('span').text(function (_, value) {
            return value == '-' ? '+' : '-'
        });
        let sign = $(this).find('span').text();
        let elem = $(this).find('th').text().substr(2);
        if (sign == '-') {
            sim.automaticHideNullProperties = true;
            let i = sim.headersListFullyShown.indexOf(elem);
            sim.headersListFullyShown.splice(i, 1);
            sim.updateGUI(true);
        }
        else {
            sim.automaticHideNullProperties = false;
            $(this).nextUntil('tr.header').show();
            elem.trim();
            sim.headersListFullyShown.push(elem)
        }
    });

    /*$("#pnlDistribution").show();
    sim.changeNodeSelection(-1);*/
    loop();


    function loop() {
        sim.draw();
        let newTime = new Date().getTime();

        let dt = newTime - time;

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
