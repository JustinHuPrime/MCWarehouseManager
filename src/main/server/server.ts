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
import * as asyncUtil from "./asyncUtil";

const PORT = 8080;

class CommandWebSocket {
  public socket: WebSocket;

  public constructor(socket: WebSocket) {
    this.socket = socket;
  }

  public command(command: string): Promise<string> {
    this.socket.send(command);
    return new Promise((resolve, _reject) => {
      this.socket.once("message", (data) => {
        resolve(data.toString("utf-8"));
      });
    });
  }
}

class System {
  public readonly storage: model.StorageSystem;
  public controller: CommandWebSocket | null;

  public constructor(storage: model.StorageSystem) {
    this.storage = storage;
    this.controller = null;
  }

  public async registerStorage(id: string, res: restify.Response) {
    if (this.storage.storage.find((location) => location.id === id)) {
      res.send(409);
      res.end();
      return;
    }

    const location = new model.StorageLocation(id);
    await this.indexStorage(location);
    this.storage.storage.push(location);

    res.send(204);
    res.end();
  }

  private async indexStorage(storage: model.StorageLocation) {
    const size = Number.parseInt(
      await this.controller!.command(
        `return peripheral.call("${storage.id}", "size")`,
      ),
    );
    storage.items.length = size;
    storage.items.fill(null);
    await asyncUtil.forEach(storage.items, async (_value, index, _array) => {
      const details = await this.controller!.command(
        `return peripheral.call("${storage.id}", "getItemDetail", ${
          index + 1
        })`,
      );

      if (details === "nil") return;

      const detailLines = details.split("\n");
      const displayName = detailLines
        .find((line, _index, _array) => line.match(/displayName = /))!
        .match(/displayName = "(.+)"/)![1]!;
      const id = detailLines
        .find((line, _index, _array) => line.match(/name = /))!
        .match(/name = "(.+)"/)![1]!;
      const maxCount = Number.parseInt(
        detailLines
          .find((line, _index, _array) => line.match(/maxCount = /))!
          .match(/maxCount = (\d+)/)![1]!,
      );
      const nbt =
        detailLines
          .find((line, _index, _array) => line.match(/nbt = /))
          ?.match(/nbt = "(.+)"/)?.[1] ?? null;
      const count = Number.parseInt(
        detailLines
          .find((line, _index, _array) => line.match(/count = /))!
          .match(/count = (\d+)/)![1]!,
      );
      storage.items[index] = new model.ItemStack(
        new model.Item(displayName, id, maxCount, nbt),
        count,
      );
    });
  }
}

export default class Server {
  private readonly databaseFile: string;
  private readonly storageSystems: Array<System>;

  private readonly httpServer: restify.Server;
  private readonly wsServer: WebSocket.Server;

  public constructor(databaseFile: string) {
    this.databaseFile = databaseFile;
    if (!fs.existsSync(databaseFile))
      fs.writeFileSync(databaseFile, JSON.stringify([]));
    this.storageSystems = JSON.parse(fs.readFileSync(databaseFile, "utf-8"))
      .map(model.StorageSystem.fromJSON)
      .map((storage: model.StorageSystem) => new System(storage));

    this.httpServer = restify.createServer();
    this.httpServer.use(restify.plugins.bodyParser());
    this.httpServer.use(
      restify.plugins.queryParser({
        mapParams: false,
        parseArrays: false,
      }),
    );

    // static files
    this.httpServer.get(
      "/world/*",
      restify.plugins.serveStatic({
        directory: "src/main/world",
        appendRequestPath: false,
      }),
    );

    // system management
    this.httpServer.post(
      "/:system/create-system",
      this.createSystem.bind(this),
    );
    this.httpServer.post(
      "/:system/register-storage",
      this.registerStorage.bind(this),
    );
    this.httpServer.post(
      "/:system/register-processor",
      this.registerProcessor.bind(this),
    );
    this.httpServer.post(
      "/:system/register-recipe",
      this.registerRecipe.bind(this),
    );
    this.httpServer.post(
      "/:system/register-terminal",
      this.registerTerminal.bind(this),
    );
    this.httpServer.post("/:system/reindex", this.reindex.bind(this));
    this.httpServer.post(
      "/:system/run-processors",
      this.runProcessors.bind(this),
    );

    // terminal commands
    this.httpServer.post(
      "/:system/:terminal/withdraw",
      this.withdraw.bind(this),
    );
    this.httpServer.post("/:system/:terminal/deposit", this.deposit.bind(this));

    // info
    this.httpServer.get("/:system/inventory", this.inventory.bind(this));

    this.wsServer = new WebSocket.Server({ server: this.httpServer.server });
    this.wsServer.on("connection", (socket, _request) => {
      socket.once("close", (_code, _reason) => {
        this.storageSystems.forEach((system, _index, _array) => {
          if (system.controller?.socket === socket) system.controller = null;
        });
      });
      socket.once("message", (data, _isBinary) => {
        const system = this.findSystem(data.toString("utf-8"));
        if (system === null) {
          socket.close(4001, "Invalid system name");
          return;
        } else if (system.controller !== null) {
          socket.close(4002, "System already has a controller");
          return;
        }

        system.controller = new CommandWebSocket(socket);

        socket.send("Connection established");
      });
    });
  }

  private createSystem(
    req: restify.Request,
    res: restify.Response,
    _next: restify.Next,
  ): void {
    const system = this.findSystem(req.params.system);
    if (system !== null) {
      res.status(409);
      res.end();
      return;
    }

    const storage = new model.StorageSystem(req.params.system);
    this.storageSystems.push(new System(storage));
    this.save();

    res.status(201);
    res.end();
  }

  private async registerStorage(
    req: restify.Request,
    res: restify.Response,
    _next: restify.Next,
  ) {
    const system = this.findSystem(req.params.system);
    if (system === null) {
      res.status(404);
      res.end();
      return;
    } else if (system.controller === null) {
      res.status(409);
      res.end();
      return;
    }

    if (typeof req.body !== "string") {
      res.status(400);
      res.end();
      return;
    }

    const args = req.body.split("\n");
    if (args.length !== 1) {
      res.status(400);
      res.end();
      return;
    }

    await system.registerStorage(args[0] as string, res);
    this.save();
  }

  private registerProcessor(
    req: restify.Request,
    res: restify.Response,
    _next: restify.Next,
  ) {
    const system = this.findSystem(req.params.system);
    if (system === null) {
      res.status(404);
      res.end();
      return;
    } else if (system.controller === null) {
      res.status(409);
      res.end();
      return;
    }

    if (typeof req.body !== "string") {
      res.status(400);
      res.end();
      return;
    }

    const args = req.body.split("\n");
    if (args.length !== 3) {
      res.status(400);
      res.end();
      return;
    }

    // TODO

    res.status(201);
    res.end();
  }

  private registerRecipe(
    req: restify.Request,
    res: restify.Response,
    _next: restify.Next,
  ) {
    const system = this.findSystem(req.params.system);
    if (system === null) {
      res.status(404);
      res.end();
      return;
    }

    if (typeof req.body !== "string") {
      res.status(400);
      res.end();
      return;
    }

    const args = req.body.split("\n");

    // TODO

    res.status(201);
    res.end();
  }

  private registerTerminal(
    req: restify.Request,
    res: restify.Response,
    _next: restify.Next,
  ) {
    const system = this.findSystem(req.params.system);
    if (system === null) {
      res.status(404);
      res.end();
      return;
    } else if (system.controller === null) {
      res.status(409);
      res.end();
      return;
    }

    if (typeof req.body !== "string") {
      res.status(400);
      res.end();
      return;
    }

    const args = req.body.split("\n");
    if (args.length !== 1) {
      res.status(400);
      res.end();
      return;
    }

    // TODO

    res.status(201);
    res.end();
  }

  private reindex(
    req: restify.Request,
    res: restify.Response,
    _next: restify.Next,
  ) {
    const system = this.findSystem(req.params.system);
    if (system === null) {
      res.status(404);
      res.end();
      return;
    } else if (system.controller === null) {
      res.status(409);
      res.end();
      return;
    }

    // TODO

    res.status(204);
    res.end();
  }

  private runProcessors(
    req: restify.Request,
    res: restify.Response,
    _next: restify.Next,
  ) {
    const system = this.findSystem(req.params.system);
    if (system === null) {
      res.status(404);
      res.end();
      return;
    } else if (system.controller === null) {
      res.status(409);
      res.end();
      return;
    }

    // TODO

    res.status(204);
    res.end();
  }

  private withdraw(
    req: restify.Request,
    res: restify.Response,
    _next: restify.Next,
  ) {
    const system = this.findSystem(req.params.system);
    if (system === null) {
      res.status(404);
      res.end();
      return;
    } else if (system.controller === null) {
      res.status(409);
      res.end();
      return;
    }

    // TODO

    res.status(204);
    res.end();
  }

  private deposit(
    req: restify.Request,
    res: restify.Response,
    _next: restify.Next,
  ) {
    const system = this.findSystem(req.params.system);
    if (system === null) {
      res.status(404);
      res.end();
      return;
    } else if (system.controller === null) {
      res.status(409);
      res.end();
      return;
    }

    // TODO

    res.status(204);
    res.end();
  }

  private inventory(req: restify.Request, res: restify.Response) {
    const system = this.findSystem(req.params.system);
    if (system === null) {
      res.status(404);
      res.end();
      return;
    }

    // TODO

    res.status(200);
    res.end();
  }

  private findSystem(name: string): System | null {
    return (
      this.storageSystems.find((system) => system.storage.name === name) ?? null
    );
  }

  public open(): Promise<void> {
    return new Promise<void>((resolve, _reject) => {
      this.httpServer.listen(PORT, () => {
        resolve();
      });
    });
  }

  public close() {
    this.wsServer.close();
    this.httpServer.close();
  }

  public save() {
    fs.writeFileSync(
      this.databaseFile,
      JSON.stringify(this.storageSystems.map((system) => system.storage)),
    );
  }
}
