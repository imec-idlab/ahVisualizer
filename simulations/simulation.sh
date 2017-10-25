#!/bin/bash
#echo './waf --run "scratch/ahsimulation/ahsimulation '$@'"'

args="$@"
#args=${args//\"/\\\"}

#echo "Args: " $args

(cd /usr/local/src/802.11ah-ns3/ns-3/ && ./waf --run "scratch/ahsimulation/ahsimulation $args") > /dev/null
#sleep 10
