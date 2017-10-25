
class EventManager {

    events: SimulationEvent[] = [];

    private updateGUI: boolean;

    constructor(private sim: SimulationGUI) {

    }

    processEvents() {

        let eventsProcessed: boolean = this.events.length > 0;
        if (this.events.length > 1000) // don't update the GUI anymore on each event if too many events are pending
            this.updateGUI = false;
        else
            this.updateGUI = true;

        let lastTime: number;
        for (let f = 0; f < this.events.length; f++){
            //console.log(this.events[f].parts[1]);
        }
        while (this.events.length > 0) {
            let ev = this.events[0];


            switch (ev.parts[1]) {
                case 'startheader':

                    break;
                case 'rawconfig':
                    this.onRawConfig(ev.stream, parseInt(ev.parts[2]), parseInt(ev.parts[3]), parseInt(ev.parts[4]), parseInt(ev.parts[5]),
                        parseInt(ev.parts[6]), parseInt(ev.parts[7]), parseInt(ev.parts[8]), parseInt(ev.parts[9]));
                    break;
                case 'start':
                    this.onStart(ev.stream, parseInt(ev.parts[2]), ev.parts[3], parseFloat(ev.parts[4]), parseFloat(ev.parts[5]),
                        parseInt(ev.parts[6]), parseInt(ev.parts[7]), parseInt(ev.parts[8]), ev.parts[9],
                        parseFloat(ev.parts[10]), parseFloat(ev.parts[11]), ev.parts[12], parseInt(ev.parts[13]), parseInt(ev.parts[14]), ev.parts[15], parseInt(ev.parts[16]),
                        parseInt(ev.parts[17]), parseInt(ev.parts[18]), parseInt(ev.parts[19]), parseInt(ev.parts[20]), parseInt(ev.parts[21]), parseInt(ev.parts[22]), parseInt(ev.parts[23]),
                        parseInt(ev.parts[24]), parseInt(ev.parts[25]), parseInt(ev.parts[26]), parseInt(ev.parts[27]), parseFloat(ev.parts[28]), parseFloat(ev.parts[29]),
                        parseInt(ev.parts[30]), parseInt(ev.parts[31]), ev.parts[32], parseInt(ev.parts[33]), parseInt(ev.parts[34]),
                        parseInt(ev.parts[35]), parseInt(ev.parts[36]), parseInt(ev.parts[37]));
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
                    this.onStatsUpdated(ev.stream, ev.time, parseInt(ev.parts[2]),
                        parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseFloat(ev.parts[5]), parseFloat(ev.parts[6]),
                        parseInt(ev.parts[7]), parseInt(ev.parts[8]), parseInt(ev.parts[9]), parseInt(ev.parts[10]),
                        parseInt(ev.parts[11]), parseInt(ev.parts[12]), parseInt(ev.parts[13]),
                        parseFloat(ev.parts[14]), parseFloat(ev.parts[15]),
                        parseInt(ev.parts[16]), parseInt(ev.parts[17]), parseFloat(ev.parts[18]), parseInt(ev.parts[19]), parseInt(ev.parts[20]),
                        parseInt(ev.parts[21]), parseInt(ev.parts[22]), parseInt(ev.parts[23]), parseInt(ev.parts[24]),
                        ev.parts[25], ev.parts[26], parseInt(ev.parts[27]),
                        parseInt(ev.parts[28]), parseInt(ev.parts[29]), parseFloat(ev.parts[30]),
                        parseInt(ev.parts[31]), parseInt(ev.parts[32]), parseInt(ev.parts[33]),
                        parseInt(ev.parts[34]), parseFloat(ev.parts[35]), parseInt(ev.parts[36]),
                        parseInt(ev.parts[37]), parseInt(ev.parts[38]), parseInt(ev.parts[39]),
                        parseInt(ev.parts[40]), parseFloat(ev.parts[41]), parseFloat(ev.parts[42]),
                        parseInt(ev.parts[43]), parseFloat(ev.parts[44]), parseFloat(ev.parts[45]), parseFloat(ev.parts[46]), parseFloat(ev.parts[47]),
                        parseFloat(ev.parts[48]), parseFloat(ev.parts[49]), parseFloat(ev.parts[50]));
                    break;

                case 'slotstatsSTA':
                    {
                        let values: number[] = [];
                        for (var i = 2; i < ev.parts.length; i++)
                            values.push(parseInt(ev.parts[i]));

                        this.onSlotStats(ev.stream, ev.time, values, false);

                        break;
                    }
                case 'slotstatsAP':
                    {
                        let values: number[] = [];
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
    }

    onReceiveBulk(entry: IEntries) {
        for (let l of entry.lines) {
            this.onReceive({ stream: entry.stream, line: l });
        }

        if (this.events.length > 10000) // prevent epic memory build up
            this.processEvents();
    }

    onReceive(entry: IEntry) {
        let parts = entry.line.split(';');
        let time = parseInt(parts[0]);
        //console.log("evManager3 " + parts);
        
        
        time = time / (1000 * 1000); // ns -> ms

        let ev = new SimulationEvent(entry.stream, time, parts);
        this.events.push(ev);
    }

    onStart(stream: string, aidRAWRange: number,
        dataMode: string, dataRate: number, bandwidth: number, trafficInterval: number, trafficPacketsize: number, beaconInterval: number,
        name: string, propagationLossExponent: number, propagationLossReferenceLoss: number, apAlwaysSchedulesForNextSlot: string, minRTO: number, simulationTime: number,
        trafficType: string, trafficIntervalDeviation: number, tcpSegmentSize: number, tcpInitialSlowStartThreshold: number, tcpInitialCWnd: number,
        maxTimeOfPacketsInQueue: number, ipCameraMotionPercentage: number, ipCameraMotionDuration: number, ipCameraDataRate: number, nsta: number, cooldownPeriod: number,
        firmwareSize: number, firmwareBlockSize: number, firmwareCorruptionProbability: number, firmwareNewUpdateProbability: number, sensorMeasurementSize: number,
        numberOfRAWGroups: number, RAWSlotFormat: string, RAWSlotCount: number, numberOfRAWSlots: number,
        contentionPerRAWSlot: number, contentionPerRAWSlotOnlyInFirstGroup: number, numRpsElements?: number) {
        let simulation = this.sim.simulationContainer.getSimulation(stream);
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

        let config = simulation.config;
        
        config.AIDRAWRange = aidRAWRange;
        config.numberOfRAWGroups = numberOfRAWGroups;
        config.RAWSlotFormat = RAWSlotCount > 0 ? RAWSlotFormat : undefined;;
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

    }


    onSlotStats(stream: string, timestamp: number, values: number[], isAP: boolean) {
        let sim = this.sim.simulationContainer.getSimulation(stream);

        if (isAP) {
            sim.slotUsageAP.push(values);
            sim.totalSlotUsageTimestamps.push(timestamp);
        }
        else
            sim.slotUsageSTA.push(values);

        let arr: number[];
        if (isAP)
            arr = sim.totalSlotUsageAP;
        else
            arr = sim.totalSlotUsageSTA;

        for (let i = 0; i < values.length; i++)
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
            let smoothingFactor = 0.8;
            for (let i = 0; i < values.length; i++) {
                arr[i] = arr[i] * smoothingFactor + (1 - smoothingFactor) * values[i];
            }
        }
    }

    onRawConfig(stream: string, rpsIndex: number, rawIndex: number, rawSlotFormat: number, rawSlotDurationCount: number,
        nRawSlots: number, rawSlotBoundary: number, rawGroupAidStart: number, rawGroupAidEnd: number) {
        let config = this.sim.simulationContainer.getSimulation(stream).config;
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
        let slotDuration = 500 + 120 * rawSlotDurationCount;
        config.rawSlotDuration.push(slotDuration);
        config.nRawSlots.push(nRawSlots);
        config.rawSlotBoundary.push(rawSlotBoundary);
        config.rawGroupAidStart.push(rawGroupAidStart);
        config.rawGroupAidEnd.push(rawGroupAidEnd);
        config.rawGroupDurations.push(nRawSlots * slotDuration);

    }

    onNodeAdded(stream: string, isSTA: boolean, id: number, x: number, y: number, aId: number) {
        let n: SimulationNode = isSTA ? new STANode() : new APNode();
        n.id = id;
        n.x = x;
        n.y = y;
        n.aId = aId;

        this.sim.simulationContainer.getSimulation(stream).nodes.push(n);
        if (!isSTA)
            this.sim.simulationContainer.getSimulation(stream).apNode = <APNode>n;
        // this.sim.onNodeAdded(stream, id);
    }

    onNodeAssociated(stream: string, id: number, aId: number, rpsIndex: number, groupNumber: number, rawSlotIndex: number) {
        let simulation = this.sim.simulationContainer.getSimulation(stream);
        if (id < 0 || id >= simulation.nodes.length) return;

        let n = simulation.nodes[id];
        n.aId = aId;
        n.rpsIndex = rpsIndex;
        n.groupNumber = groupNumber;
        n.rawSlotIndex = rawSlotIndex;
        (<STANode>n).isAssociated = true;

        this.sim.onNodeAssociated(stream, id);
    }


    onNodeDeassociated(stream: string, id: number) {
        let simulation = this.sim.simulationContainer.getSimulation(stream);
        if (id < 0 || id >= simulation.nodes.length) return;

        let n = simulation.nodes[id];
        (<STANode>n).isAssociated = false;

        this.sim.onNodeAssociated(stream, id);
    }

    hasIncreased(n: SimulationNode, prop: string): boolean {
        if (n.values.length >= 2) {
            let oldVal = n.values[n.values.length - 2];
            let newVal = n.values[n.values.length - 1];

            return oldVal[prop] < newVal[prop];
        }
        else
            return false;
    }

    onStatsUpdated(stream: string, timestamp: number, id: number,
        totalTransmitTime: number, totalReceiveTime: number, totalDozeTime: number, totalActiveTime: number,
        nrOfTransmissions: number, nrOfTransmissionsDropped: number, nrOfReceives: number, nrOfReceivesDropped: number,
        nrOfSentPackets: number, nrOfSuccessfulPackets: number, nrOfDroppedPackets: number,
        avgPacketTimeOfFlight: number, goodputKbit: number,
        edcaQueueLength: number, nrOfSuccessfulRoundtripPackets: number, avgRoundTripTime: number, tcpCongestionWindow: number,
        numberOfTCPRetransmissions: number, numberOfTCPRetransmissionsFromAP: number, nrOfReceivesDroppedByDestination: number,
        numberOfMACTxRTSFailed: number, numberOfMACTxMissedACK: number, numberOfDropsByReason: string, numberOfDropsByReasonAtAP: string,
        tcpRtoValue: number, numberOfAPScheduledPacketForNodeInNextSlot: number, numberOfAPSentPacketForNodeImmediately: number, avgRemainingSlotTimeWhenAPSendingInSameSlot: number,
        numberOfCollisions: number, numberofMACTxMissedACKAndDroppedPacket: number, tcpConnected: number,
        tcpSlowStartThreshold: number, tcpEstimatedBandwidth: number, tcpRTT: number, numberOfBeaconsMissed: number, numberOfTransmissionsDuringRAWSlot: number,
        totalNumberOfDrops: number, firmwareTransferTime: number, ipCameraSendingRate: number, ipCameraReceivingRate: number, numberOfTransmissionsCancelledDueToCrossingRAWBoundary: number, 
        jitter: number, reliability: number, interPacketDelayAtServer: number, interPacketDelayAtClient: number, interPacketDelayDeviationPercentageAtServer: number, 
        interPacketDelayDeviationPercentageAtClient: number, latency: number) {
        // ^- it's getting awfully crowded around here


        let simulation = this.sim.simulationContainer.getSimulation(stream);

        if (id < 0 || id >= simulation.nodes.length) return;
        // keep track of statistics

        let n = simulation.nodes[id];

        let nodeVal: NodeValue = new NodeValue();
        n.values.push(nodeVal);

        nodeVal.timestamp = timestamp;
        nodeVal.totalTransmitTime = totalTransmitTime;

        nodeVal.totalReceiveTime = totalReceiveTime
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
            let dropParts = numberOfDropsByReason.split(',');
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
            let dropParts = numberOfDropsByReasonAtAP.split(',');
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
    }
}

class SimulationEvent {
    constructor(public stream: string, public time: number, public parts: string[]) {

    }
}
