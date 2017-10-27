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
                    this.onStatsUpdated(ev.stream, ev.time, parseInt(ev.parts[2]), parseFloat(ev.parts[3]), parseFloat(ev.parts[4]), parseFloat(ev.parts[5]), parseFloat(ev.parts[6]), parseInt(ev.parts[7]), parseInt(ev.parts[8]), parseInt(ev.parts[9]), parseInt(ev.parts[10]), parseInt(ev.parts[11]), parseInt(ev.parts[12]), parseInt(ev.parts[13]), parseFloat(ev.parts[14]), parseFloat(ev.parts[15]), parseInt(ev.parts[16]), parseInt(ev.parts[17]), parseFloat(ev.parts[18]), parseInt(ev.parts[19]), parseInt(ev.parts[20]), parseInt(ev.parts[21]), parseInt(ev.parts[22]), parseInt(ev.parts[23]), parseInt(ev.parts[24]), ev.parts[25], ev.parts[26], parseInt(ev.parts[27]), parseInt(ev.parts[28]), parseInt(ev.parts[29]), parseFloat(ev.parts[30]), parseInt(ev.parts[31]), parseInt(ev.parts[32]), parseInt(ev.parts[33]), parseInt(ev.parts[34]), parseFloat(ev.parts[35]), parseInt(ev.parts[36]), parseInt(ev.parts[37]), parseInt(ev.parts[38]), parseInt(ev.parts[39]), parseInt(ev.parts[40]), parseFloat(ev.parts[41]), parseFloat(ev.parts[42]), parseInt(ev.parts[43]), parseFloat(ev.parts[44]), parseFloat(ev.parts[45]), parseFloat(ev.parts[46]), parseFloat(ev.parts[47]), parseFloat(ev.parts[48]), parseFloat(ev.parts[49]), parseFloat(ev.parts[50]), parseFloat(ev.parts[51]), parseFloat(ev.parts[51]));
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
        console.log("ON START");
        simulation.nodes = [];
        simulation.slotUsageAP = [];
        simulation.slotUsageSTA = [];
        simulation.totalSlotUsageAP = [];
        simulation.totalSlotUsageSTA = [];
        simulation.totalTraffic = 0;
        simulation.totalPacketLoss = [];
        var config = simulation.config;
        /*config.nGroupsPerRps = [];
        config.rawSlotFormat = [];
        config.rawSlotDurationCount = [];
        config.rawSlotDuration = [];
        config.nRawSlots = [];
        config.rawSlotBoundary = [];
        config.rawGroupAidStart = [];
        config.rawGroupAidEnd = [];
        config.rawGroupDurations = [];*/
        config.AIDRAWRange = aidRAWRange;
        config.numberOfRAWGroups = numberOfRAWGroups;
        config.RAWSlotFormat = RAWSlotFormat;
        config.numberOfRAWSlots = numberOfRAWSlots;
        config.RAWSlotCount = RAWSlotCount;
        config.RAWSlotDuration = 500 + 120 * RAWSlotCount;
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
        console.log("ON RAW CONF");
        /*//if make
        if (!config.nGroupsPerRps) {
            console.log("UNDEFINED+++");
            config.nGroupsPerRps = [];
            config.rawGroupDurations = [];
            config.rawSlotFormat = [];
            config.rawSlotDurationCount = [];
            config.rawSlotDuration = [];
            config.nRawSlots = [];
            config.rawSlotBoundary = [];
            config.rawGroupAidStart = [];
            config.rawGroupAidEnd = [];
        }*/
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
        /*            console.log("config.rawSlotFormat " + config.rawSlotFormat);
                    console.log("config.rawSlotDurationCount " + config.rawSlotDurationCount);
                    console.log("config.rawSlotDuration " + config.rawSlotDuration);
                    console.log("config.nRawSlots " + config.nRawSlots);
                    console.log("config.rawSlotBoundary " + config.rawSlotBoundary);
                    console.log("config.rawGroupAidStart " + config.rawGroupAidStart);
                    console.log("config.rawGroupAidEnd " + config.rawGroupAidEnd);
                    console.log("config.rawGroupDurations " + config.rawGroupDurations);
                    console.log("rawSlotFormat " + rawSlotFormat);*/
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
//# sourceMappingURL=eventmanager.js.map