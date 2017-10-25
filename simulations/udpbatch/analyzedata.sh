../analyzebatch.pl \
../udpsims/ \
config=name,DataMode,payloadsize,nsta,BeaconInterval,NumOfRpsElements \
stats=edcaqueuelength,totalnumberofdrops,numberofmactxmissedack,numberoftransmissions,NumberOfDroppedPackets,AveragePacketSentReceiveTime,PacketLoss,latency,GoodputKbit \
$@

#../analyzebatch.pl \
#/proj/wall2-ilabt-iminds-be/ns3ah/sensorlarge/ \
#config=name,sensormeasurementsize,nsta,ngroup,nrawslotnum,trafficinterval,apalwaysschedulesfornextslot,contentionperrawslot \
#stats=edcaqueuelength,tcpconnected,totalnumberofdrops,numberofmactxmissedack,numberoftransmissions,NumberOfDroppedPackets,AveragePacketSentReceiveTime,DropTCPTxBufferExceeded,totaldozetime,numberoftcpretransmissions,numberoftcpretransmissionsfromap,NumberOfAPScheduledPacketForNodeInNextSlot
#
