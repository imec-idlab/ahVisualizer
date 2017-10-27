abstract class SimulationNode {

    id: number = -1;

    x: number = 0;
    y: number = 0;
    aId: number = 0;
    rpsIndex: number = 0;
    groupNumber: number = 0;
    rawSlotIndex: number = 0;

    type: string = "";

    values: NodeValue[] = [];
}

class NodeValue {

    timestamp: number;

    totalTransmitTime: number = 0;
    totalReceiveTime: number = 0;
    totalSleepTime: number = 0;
    totalIdleTime: number = 0;

    energyRxIdle: number = 0;
    energyTx: number = 0;
    totalEnergy: number = 0;

    nrOfTransmissions: number = 0;
    nrOfTransmissionsDropped: number = 0;
    nrOfReceives: number = 0;
    nrOfReceivesDropped: number = 0;

    nrOfSentPackets: number = 0;
    nrOfSuccessfulPackets: number = 0;
    nrOfDroppedPackets: number = 0;

    latency: number = 0;
    avgSentReceiveTime: number = 0;
    goodputKbit: number = 0;

    edcaQueueLength: number = 0;
    nrOfSuccessfulRoundtripPackets: number = 0;
    avgRoundtripTime: number = 0;

    tcpCongestionWindow: number = 0;
    numberOfTCPRetransmissions: number = 0;

    nrOfReceivesDroppedByDestination: number = 0;

    numberOfTCPRetransmissionsFromAP: number = 0;
    numberOfMACTxRTSFailed: number = 0;
    numberofMACTxMissedACKAndDroppedPacket: number = 0;
    numberOfMACTxMissedACK: number = 0;

    numberOfDropsByReasonUnknown: number = 0;
    numberOfDropsByReasonPhyInSleepMode: number = 0;
    numberOfDropsByReasonPhyNotEnoughSignalPower: number = 0;
    numberOfDropsByReasonPhyUnsupportedMode: number = 0;
    numberOfDropsByReasonPhyPreambleHeaderReceptionFailed: number = 0;
    numberOfDropsByReasonPhyRxDuringChannelSwitching: number = 0;
    numberOfDropsByReasonPhyAlreadyReceiving: number = 0;
    numberOfDropsByReasonPhyAlreadyTransmitting: number = 0;
    numberOfDropsByReasonPhyAlreadyPlcpReceptionFailed: number = 0;
    numberOfDropsByReasonMacNotForAP: number = 0;
    numberOfDropsByReasonMacAPToAPFrame: number = 0;
    numberOfDropsByReasonMacQueueDelayExceeded: number = 0;
    numberOfDropsByReasonMacQueueSizeExceeded: number = 0;
    numberOfDropsByReasonTCPTxBufferExceeded: number = 0;

    numberOfDropsFromAPByReasonUnknown: number = 0;
    numberOfDropsFromAPByReasonPhyInSleepMode: number = 0;
    numberOfDropsFromAPByReasonPhyNotEnoughSignalPower: number = 0;
    numberOfDropsFromAPByReasonPhyUnsupportedMode: number = 0;
    numberOfDropsFromAPByReasonPhyPreambleHeaderReceptionFailed: number = 0;
    numberOfDropsFromAPByReasonPhyRxDuringChannelSwitching: number = 0;
    numberOfDropsFromAPByReasonPhyAlreadyReceiving: number = 0;
    numberOfDropsFromAPByReasonPhyAlreadyTransmitting: number = 0;
    numberOfDropsFromAPByReasonPhyAlreadyPlcpReceptionFailed: number = 0;
    numberOfDropsFromAPByReasonMacNotForAP: number = 0;
    numberOfDropsFromAPByReasonMacAPToAPFrame: number = 0;
    numberOfDropsFromAPByReasonMacQueueDelayExceeded: number = 0;
    numberOfDropsFromAPByReasonMacQueueSizeExceeded: number = 0;
    numberOfDropsFromAPByReasonTCPTxBufferExceeded: number = 0;

    tcpRTO: number = 0;

    numberOfAPScheduledPacketForNodeInNextSlot: number = 0;
    numberOfAPSentPacketForNodeImmediately: number = 0;
    avgRemainingSlotTimeWhenAPSendingInSameSlot: number = 0;

    numberOfCollisions: number = 0;

    tcpConnected: number = 0;

    tcpSlowStartThreshold: number = 0;
    tcpEstimatedBandwidth: number = 0;
    tcpRTT: number = 0;

    numberOfBeaconsMissed: number = 0;

    numberOfTransmissionsDuringRAWSlot: number = 0;
    totalNumberOfDrops: number = 0;

    firmwareTransferTime: number = 0;
    ipCameraSendingRate: number = 0;
    ipCameraReceivingRate: number = 0;
    numberOfTransmissionsCancelledDueToCrossingRAWBoundary: number = 0;

    jitter: number;
    reliability: number = 0;
    interPacketDelayAtServer: number;
    interPacketDelayAtClient: number;
    interPacketDelayDeviationPercentageAtServer: number;
    interPacketDelayDeviationPercentageAtClient: number;
}

class APNode extends SimulationNode {
    type: string = "AP";
}

class STANode extends SimulationNode {
    type: string = "STA";

    isAssociated: boolean = false;
}


class SimulationConfiguration {

    AIDRAWRange: number;
    numberOfRAWGroups: number;

    RAWSlotFormat: string;
    numberOfRAWSlots: number;
    RAWSlotCount: number;
    RAWSlotDuration: number;

    dataMode: string;
    dataRate: number;
    bandwidth: number;

    trafficInterval: number;
    payloadSize: number;

    beaconInterval: number;

    name: string = "";


    propagationLossExponent: number;
    propagationLossReferenceLoss: number;
    apAlwaysSchedulesForNextSlot: string;
    minRTO: number;
    simulationTime: number;

    trafficType: string;
    trafficIntervalDeviation: number;

    tcpSegmentSize: number;
    tcpInitialSlowStartThreshold: number;
    tcpInitialCWnd: number;
    maxTimeOfPacketsInQueue: number;
    ipCameraMotionPercentage: number;
    ipCameraMotionDuration: number;
    ipCameraDataRate: number;
    nrSta: number;
    cooldownPeriod: number;

    firmwareSize: number;
    firmwareBlockSize: number;
    firmwareCorruptionProbability: number;
    firmwareNewUpdateProbability: number;
    sensorMeasurementSize: number;
    contentionPerRAWSlot: number;
    contentionPerRAWSlotOnlyInFirstGroup: number;

    numRpsElements: number;

    nGroupsPerRps: number[] = [];
    rawGroupDurations: number[] = [];
    rawSlotFormat: number[] = [];
    rawSlotDurationCount: number[] = [];
    rawSlotDuration: number[] = [];
    nRawSlots: number[] = [];
    rawSlotBoundary: number[] = [];
    rawGroupAidStart: number[] = [];
    rawGroupAidEnd: number[] = [];
}

class Simulation {

    nodes: SimulationNode[] = [];
    apNode: APNode;

    slotUsageSTA: number[][] = [];
    slotUsageAP: number[][] = [];

    totalSlotUsageAP: number[] = [];
    totalSlotUsageSTA: number[] = [];
    totalSlotUsageTimestamps: number[] = [];

    totalTraffic: number = 0;
    currentTime: number = 0;

    //totalPacketLoss: number = 0;
    totalPacketLoss: number[] = [];
    config: SimulationConfiguration = new SimulationConfiguration();
}
