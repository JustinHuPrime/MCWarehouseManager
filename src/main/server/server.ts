// Copyright 2022 Justin Hu
// This file is part of MCWarehouseManager.
//
// MCWarehouseManager is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// MCWarehouseManager is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
// or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public
// License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with MCWarehouseManager. If not, see <https://www.gnu.org/licenses/>.
//
// SPDX-License-Identifier: AGPL-3.0-or-later

import * as model from "./model";
import * as fs from "fs";
import * as restify from "restify";
import WebSocket from "ws";

const PORT = 8080;

class TurtleConnection {
  public readonly socket: WebSocket;

  public constructor(socket: WebSocket) {
    this.socket = socket;
  }
}

export default class Server {
  private readonly databaseFile: string;
  private readonly warehouses: Array<model.Warehouse>;
  private readonly turtles: Map<string, Array<TurtleConnection>>;
  private readonly httpServer: restify.Server;
  private readonly wsServer: WebSocket.Server;

  public constructor(databaseFile: string) {
    this.databaseFile = databaseFile;

    if (!fs.existsSync(databaseFile)) fs.writeFileSync(databaseFile, "[]");
    const parsed: unknown = JSON.parse(fs.readFileSync(databaseFile, "utf8"));

    try {
      if (!Array.isArray(parsed))
        throw new Error("Database file must be an array");
      this.warehouses = parsed.map((warehouse, _index, _array) =>
        model.Warehouse.fromJSON(warehouse),
      );
    } catch (e: unknown) {
      if (e instanceof Error)
        throw new Error(`Database file is invalid: ${e.message}`);
      else throw e;
    }

    this.turtles = new Map<string, Array<TurtleConnection>>();

    this.httpServer = restify.createServer({});
    this.httpServer.use(restify.plugins.bodyParser());

    // serve lua files
    this.httpServer.get("/robot.lua", (_req, res, _next) => {
      res.status(200);
      res.contentType = "text/plain";
      res.send(fs.readFileSync("./src/main/robot/robot.lua"));
      res.end();
    });
    this.httpServer.get("/terminal.lua", (_req, res, _next) => {
      res.status(200);
      res.contentType = "text/plain";
      res.send(fs.readFileSync("./src/main/terminal/terminal.lua"));
      res.end();
    });

    // liveness checking
    this.httpServer.get("/check", (_req, res, _next) => {
      res.status(204);
      res.end();
    });
    this.httpServer.get("/:warehouse/check", (req, res, _next) => {
      if (
        !this.warehouses.find(
          (warehouse, _index, _array) =>
            warehouse.name === req.params.warehouse,
        )
      ) {
        res.status(404);
        res.end();
        return;
      }
      res.status(204);
      res.end();
    });

    // commands
    this.httpServer.post("/command", (req, res, _next) => {
      if (req.contentType() !== "text/plain") {
        res.status(400);
        res.end();
        return;
      }

      // TODO: something with req.body

      res.status(200);
      res.contentType = "text/plain";
      res.send(req.body as string);
      res.end();
    });
    this.httpServer.post("/:warehouse/command", (req, res, _next) => {
      if (
        !this.warehouses.find(
          (warehouse, _index, _array) =>
            warehouse.name === req.params.warehouse,
        )
      ) {
        res.status(404);
        res.end();
        return;
      }

      if (req.contentType() !== "text/plain") {
        res.status(400);
        res.end();
        return;
      }

      // TODO: something with req.body

      res.status(200);
      res.contentType = "text/plain";
      res.send(`${req.params.warehouse}: ${req.body as string}`);
      res.end();
    });

    this.wsServer = new WebSocket.Server({ server: this.httpServer.server });
    this.wsServer.on("connection", (socket, _request) => {
      socket.once("message", (data, _isBinary) => {
        const warehouseName = data.toString("utf8");
        const warehouse = this.warehouses.find(
          (warehouse, _index, _array) => warehouse.name === warehouseName,
        );

        // ignore invalid warehouse names
        if (warehouse === undefined) {
          socket.close(4001, "invalid warehouse name");
          return;
        }

        // assign turtle to warehouse
        if (!this.turtles.has(warehouseName))
          this.turtles.set(warehouseName, []);
        (this.turtles.get(warehouseName) as Array<TurtleConnection>).push(
          new TurtleConnection(socket),
        );
      });
    });
  }

  public start(): Promise<void> {
    return new Promise<void>((resolve, _reject) => {
      this.httpServer.listen(PORT, () => {
        resolve();
      });
    });
  }

  public close() {
    this.wsServer.close();
    this.httpServer.close();
    fs.writeFileSync(this.databaseFile, JSON.stringify(this.warehouses));
  }
}
