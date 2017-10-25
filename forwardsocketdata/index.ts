// import the necessary modules 
import * as http from "http";
import * as url from "url";
import * as fs from "fs";
import * as path from "path";
import * as net from "net";

import * as qs from "querystring";
import * as express from "express";
import * as socket from "socket.io"

import * as readline from "readline";

import events = require('events');

let HTTP_PORT: number = 8080;
let LISTENER_PORT: number = 7707;
let BIND_ADDRESS: string = "";

class SocketManager {

    private activeSockets = {};

    addSocket(stream: string, sock: SocketIO.Socket): void {
        console.log("Adding socket " + sock.id + " for stream " + stream);
        if (typeof this.activeSockets[stream] == "undefined")
            this.activeSockets[stream] = [];

        let sockets = (<SocketIO.Socket[]>this.activeSockets[stream]);
        sockets.push(sock);
    }

    removeSocket(sock: SocketIO.Socket) {
        console.log("Removing socket " + sock.id);
        for (let key in this.activeSockets) {
            let sockets = (<SocketIO.Socket[]>this.activeSockets[key]);
            let idx = sockets.indexOf(sock);
            if (idx >= 0)
                sockets.splice(idx, 1);
        }
    }

    getSocketsFor(stream: string): SocketIO.Socket[] {
        if (typeof this.activeSockets[stream] == "undefined")
            return [];
        else {
            let sockets = (<SocketIO.Socket[]>this.activeSockets[stream]);
            return sockets;
        }
    }
}

interface ISubscriptionRequest {
    simulations: string[];
}

class Entry {
    public constructor(public stream: string, public line: string) { }
}

class Entries {
    public constructor(public stream: string, public lines: string[]) { }
}

export class Program {

    // a list of active connections from the website
    private activeSocketManager: SocketManager = new SocketManager();

    constructor(args: string[]) {

        LISTENER_PORT = parseInt((typeof args[0] === 'undefined') ? "7707" : args[0]);
        HTTP_PORT = parseInt((typeof args[1] === 'undefined') ? "8080" : args[1]);
        BIND_ADDRESS = (typeof args[2] === 'undefined') ? "" : args[2];
        this.initialize();
    }

    /**
     * Initializes the server
     */
    private initialize() {
        let httpServer = this.setupExpress();
        this.setupWebsocket(httpServer);
        this.setupSimulatorListener();
    }

    setupSimulatorListener() {
        console.log("Listening for incoming simulation data on " + LISTENER_PORT);
        let self = this;
        net.createServer(sock => {
            sock.on("data", (data) => self.onDataReceived(data));
        }).listen(LISTENER_PORT);
    }
    /**
     * Sets up the express stack, returns the http server that it creates
     */
    setupExpress(): http.Server {

        console.log("Initializing express on port " + HTTP_PORT);
        var app = express();
        app.use("/", express.static(path.join(__dirname, 'public')));

        // binding to fetch the simulation nss files directly
        app.get("/simulations/:name", (req, res) => {
            var file = req.params.name;
            let path = this.getPathForSimulationName(file);
            res.sendFile(path, {

            });
        });

        let server;
        if (BIND_ADDRESS == "")
            server = app.listen(HTTP_PORT);
        else
            server = app.listen(HTTP_PORT, BIND_ADDRESS);
        return server;
    }

    /**
     * Listen for connections from websockets and update
     * the active sockets list
     */
    setupWebsocket(server: http.Server) {

        console.log("Listening for websocket requests...");
        let io = socket.listen(server);

        io.on("connection", sock => {

            sock.on("close", () => {
                this.activeSocketManager.removeSocket(sock);
            });

            sock.on("subscribe", (data: ISubscriptionRequest) => {

                console.log("subscription request " + data.simulations);
                for (let stream of data.simulations)
                    this.activeSocketManager.addSocket(stream, sock);

                this.sendSimulations(data.simulations, sock);
            });
        });
    }

    sendSimulations(streams: string[], sock: SocketIO.Socket) {
        let i = 0;
        // send each subscription 1 by 1 in series to prevent overloading the socket
        var func = () => {
            if (i < streams.length)
                this.sendSimulationToSocket(streams[i], sock, () => {
                    i++;
                    func();
                });
        };
        func();
    }

    sendSimulationToSocket(stream: string, sock: SocketIO.Socket, onDone: Function) {
        if (stream == "live") {
            for (let initLine of this.liveSimulationInitializationLines)
                sock.emit("entry", new Entry("live", initLine));
            onDone();
        }
        else {
            let filename = stream + ".nss";
            if (!fs.existsSync(this.getPathForSimulationName(filename))) {
                sock.emit("fileerror", "Simulation file " + stream + " not found");
                return;
            }

            var instream = fs.createReadStream(this.getPathForSimulationName(filename));
            var outstream = new (require('stream'))();
            var rl = readline.createInterface(instream, outstream);

            var lines = [];
            rl.on('line', function (line) {
                //console.log("Writing entry for " + stream + ": " + line);

                rl.pause();
                try {
                    lines.push(line);
                    if (lines.length > 1000) {
                        sock.compress(true).emit("bulkentry", new Entries(stream, lines));
                        lines = [];
                    }
                }
                finally {
                    setTimeout(function () {
                        rl.resume();
                    }, 50); // wait a bit to not overload the client
                }
                //sock.emit("entry",new Entry(stream, line));
            });

            rl.on('close', function () {
                // send remainder
                sock.emit("bulkentry", new Entries(stream, lines));
                lines = [];

                onDone();
            });
        }
    }


    private liveBuffer: string = "";
    /**
   * Fired when the client has received data. Append the received data to the buffer
   * and split on newlines (\n delimiter). As soon as a full line is received, process it
   */
    private onDataReceived(data: string) {
        this.liveBuffer += data;

        let stop = false;
        while (!stop) {
            let parts: string[] = this.liveBuffer.split('\n');
            if (parts.length > 1) {
                let line = parts[0].trim();
                this.liveBuffer = this.liveBuffer.substr(parts[0].length + 1);
                try {
                    this.processMessage(line);
                }
                catch (e) {
                    console.log("ERROR: " + e);
                }
            }
            else
                stop = true;
        }
    }

    private getPathForSimulationName(simulationName: string): string {
        return path.resolve(__dirname, "simulations", simulationName);
    }

    liveSimulationInitializationLines: string[] = [];
    liveSimulationName: string = "";
    private processMessage(line: string) {


        // retain config & base data to allow users to jump in simulation when it's already busy
        var parts = line.split(';');
        if (parts[1] == "start") {
            this.liveSimulationInitializationLines = [];
            this.liveSimulationName = parts[13] + ".nss";

            try {
                if (this.liveSimulationName != "") {
                    fs.unlinkSync(this.getPathForSimulationName(this.liveSimulationName));
                }
            }
            catch (e) {
            }

            this.liveSimulationInitializationLines.push(line);
        }
        else if (parts[1] == "stanodeadd" || parts[1] == "apnodeadd" || parts[1] == "stanodeassoc" || parts[1] == "rawconfig")
            this.liveSimulationInitializationLines.push(line);

        for (let s of this.activeSocketManager.getSocketsFor("live")) {
            s.emit("entry", new Entry("live", line));
        }

        try {
            if (this.liveSimulationName != "") {
                //console.log("Writing to file " + path.resolve(__dirname, "simulations", this.simulationName));        
                fs.appendFileSync(this.getPathForSimulationName(this.liveSimulationName), line + "\n");
            }
        }
        catch (e) {

        }
    }
}

// export the main program
let args = process.argv.slice(2);
export var main: Program = new Program(args);
