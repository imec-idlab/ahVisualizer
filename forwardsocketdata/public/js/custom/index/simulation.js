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
//# sourceMappingURL=simulation.js.map