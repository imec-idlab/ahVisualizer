"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var path = require("path");
var net = require("net");
var express = require("express");
var socket = require("socket.io");
var readline = require("readline");
var HTTP_PORT = 8080;
var LISTENER_PORT = 7707;
var BIND_ADDRESS = "";
var SocketManager = (function () {
    function SocketManager() {
        this.activeSockets = {};
    }
    SocketManager.prototype.addSocket = function (stream, sock) {
        console.log("Adding socket " + sock.id + " for stream " + stream);
        if (typeof this.activeSockets[stream] == "undefined")
            this.activeSockets[stream] = [];
        var sockets = this.activeSockets[stream];
        sockets.push(sock);
    };
    SocketManager.prototype.removeSocket = function (sock) {
        console.log("Removing socket " + sock.id);
        for (var key in this.activeSockets) {
            var sockets = this.activeSockets[key];
            var idx = sockets.indexOf(sock);
            if (idx >= 0)
                sockets.splice(idx, 1);
        }
    };
    SocketManager.prototype.getSocketsFor = function (stream) {
        if (typeof this.activeSockets[stream] == "undefined")
            return [];
        else {
            var sockets = this.activeSockets[stream];
            return sockets;
        }
    };
    return SocketManager;
}());
var Entry = (function () {
    function Entry(stream, line) {
        this.stream = stream;
        this.line = line;
    }
    return Entry;
}());
var Entries = (function () {
    function Entries(stream, lines) {
        this.stream = stream;
        this.lines = lines;
    }
    return Entries;
}());
var Program = (function () {
    function Program(args) {
        // a list of active connections from the website
        this.activeSocketManager = new SocketManager();
        this.liveBuffer = "";
        this.liveSimulationInitializationLines = [];
        this.liveSimulationName = "";
        LISTENER_PORT = parseInt((typeof args[0] === 'undefined') ? "7707" : args[0]);
        HTTP_PORT = parseInt((typeof args[1] === 'undefined') ? "8080" : args[1]);
        BIND_ADDRESS = (typeof args[2] === 'undefined') ? "" : args[2];
        this.initialize();
    }
    /**
     * Initializes the server
     */
    Program.prototype.initialize = function () {
        var httpServer = this.setupExpress();
        this.setupWebsocket(httpServer);
        this.setupSimulatorListener();
    };
    Program.prototype.setupSimulatorListener = function () {
        console.log("Listening for incoming simulation data on " + LISTENER_PORT);
        var self = this;
        net.createServer(function (sock) {
            sock.on("data", function (data) { return self.onDataReceived(data); });
        }).listen(LISTENER_PORT);
    };
    /**
     * Sets up the express stack, returns the http server that it creates
     */
    Program.prototype.setupExpress = function () {
        var _this = this;
        console.log("Initializing express on port " + HTTP_PORT);
        var app = express();
        app.use("/", express.static(path.join(__dirname, 'public')));
        // binding to fetch the simulation nss files directly
        app.get("/simulations/:name", function (req, res) {
            var file = req.params.name;
            var path = _this.getPathForSimulationName(file);
            res.sendFile(path, {});
        });
        var server;
        if (BIND_ADDRESS == "")
            server = app.listen(HTTP_PORT);
        else
            server = app.listen(HTTP_PORT, BIND_ADDRESS);
        return server;
    };
    /**
     * Listen for connections from websockets and update
     * the active sockets list
     */
    Program.prototype.setupWebsocket = function (server) {
        var _this = this;
        console.log("Listening for websocket requests...");
        var io = socket.listen(server);
        io.on("connection", function (sock) {
            sock.on("close", function () {
                _this.activeSocketManager.removeSocket(sock);
            });
            sock.on("subscribe", function (data) {
                console.log("subscription request " + data.simulations);
                for (var _i = 0, _a = data.simulations; _i < _a.length; _i++) {
                    var stream = _a[_i];
                    _this.activeSocketManager.addSocket(stream, sock);
                }
                _this.sendSimulations(data.simulations, sock);
            });
        });
    };
    Program.prototype.sendSimulations = function (streams, sock) {
        var _this = this;
        var i = 0;
        // send each subscription 1 by 1 in series to prevent overloading the socket
        var func = function () {
            if (i < streams.length)
                _this.sendSimulationToSocket(streams[i], sock, function () {
                    i++;
                    func();
                });
        };
        func();
    };
    Program.prototype.sendSimulationToSocket = function (stream, sock, onDone) {
        if (stream == "live") {
            for (var _i = 0, _a = this.liveSimulationInitializationLines; _i < _a.length; _i++) {
                var initLine = _a[_i];
                sock.emit("entry", new Entry("live", initLine));
            }
            onDone();
        }
        else {
            var filename = stream + ".nss";
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
    };
    /**
   * Fired when the client has received data. Append the received data to the buffer
   * and split on newlines (\n delimiter). As soon as a full line is received, process it
   */
    Program.prototype.onDataReceived = function (data) {
        this.liveBuffer += data;
        var stop = false;
        while (!stop) {
            var parts = this.liveBuffer.split('\n');
            if (parts.length > 1) {
                var line = parts[0].trim();
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
    };
    Program.prototype.getPathForSimulationName = function (simulationName) {
        return path.resolve(__dirname, "simulations", simulationName);
    };
    Program.prototype.processMessage = function (line) {
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
        for (var _i = 0, _a = this.activeSocketManager.getSocketsFor("live"); _i < _a.length; _i++) {
            var s = _a[_i];
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
    };
    return Program;
}());
exports.Program = Program;
// export the main program
var args = process.argv.slice(2);
exports.main = new Program(args);
//# sourceMappingURL=index.js.map