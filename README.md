# Visualization tool for 802.11ah module in ns3

This guide will explain the rudimentary steps how to install and use the visualizer

# Installation

1. Install nodejs

2. Run the visualizer with (in the forwardsocketdata folder)
´nodejs index.js´

3. See <Usage>
  
## ns3 simulation

1. Install ns-3

2. Start the visualizer (if used)

5. Run the ns-3 script which uses 802.11ah module to start the simulation

# Usage

The visualizer implementation is in this repository folder. This visualization tool offers 3 GUIs:

## 1. Live simulation visualization (near real-time)

Browse to http://localhost:8080 in your favorite webbrowser (Chrome seems to work best with large datasets).

In the visualizer the top table shows general configuration parameters, total channel traffic and total packet loss in the network.

Bottom table shows measured statistics either for each node or average metric values for all nodes.

Topology map in top left corner shows nodes in the network. Each node can be selected; metrics in bottom tables and charts are shown for the selected node. 

If no node is selected (click on the white part of the canvas), average values and standard deviations for all nodes are shown in tables and on charts.

The header of the bottom table is either "Node X" or "All nodes", depending on the currently (un)selected node. Each row of the bottom table can be selected and a chart showing the change of the selected metric over simulation time for selected node (or average value and std.dev. for all nodes) is shown below the table.

The bottom table showing node statistics has several dropdown headers (General, Performance, Transmission, Reception, TCP, AP Packet scheduling, Application, Drop Reasons at station and Drop Reasons at AP). Each of those headers hide non-relevant parameters for the run simulation. For example, TCP statistics are irrelevant for simulations with UDP traffic, so the TCP statistics are hidden).

Underneath the topology, real-time slot statistics are shown. Blue color represents uplink traffic while orange represents downlink. 

## 2. Comparison of saved simulations (offline)
## 3. Analysis and plotting

# Organisation overview
* ahvisualizer: Source code in Typescript for the visualizer containing both nodejs webserver (to host and forward the socket data received from simulations) and the client source.

Based on original implementation by Dwight Kerkhove. Retrieved from https://github.com/drake7707/802.11ah-ns3

