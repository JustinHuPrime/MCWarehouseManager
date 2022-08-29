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

import Server from "./server";
import * as process from "process";
import * as readline from "readline";

function printUsage() {
  process.stdout.write("Usage:\n");
  process.stdout.write("npm start -- <filename>\n");
}

if (process.argv.length != 3) {
  printUsage();
  process.exit(1);
}

const rawReadline = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});
const rl = Object.assign(rawReadline, {
  getLine: (): Promise<string> => {
    return new Promise((resolve, _reject) => {
      rawReadline.once("line", resolve);
    });
  },
});

(async () => {
  process.stdout.write("Minecraft Warehouse Manager v0.1.0\n");
  process.stdout.write("Copyright 2022 Justin Hu\n");

  process.stdout.write("Initializing server... ");
  let server: Server;
  try {
    server = new Server(process.argv[2] as string);
  } catch (e) {
    if (e instanceof Error) process.stdout.write(`${e.message}\n`);
    process.exit(1);
  }
  await server.open();
  process.stdout.write("done\n");

  let warehouse: string | null = null;

  while (true) {
    rl.prompt();
    const command = await rl.getLine();

    if (command.trim() === "") {
      continue;
    }

    if (command === "exit" || command === "quit") {
      rl.close();
      server.close();
      process.exit(0);
    } else if (command === "use") {
      warehouse = null;
      rl.setPrompt("> ");
    } else if (command.match(/^use \w+$/)) {
      const newWarehouse = (
        command.match(/^use (\w+)$/) as RegExpMatchArray
      )[1] as string;
      if (!server.hasWarehouse(newWarehouse)) {
        process.stdout.write(`No warehouse named ${newWarehouse} exists\n`);
        continue;
      }

      warehouse = newWarehouse;
      rl.setPrompt(`${warehouse}> `);
    } else {
      const { ok: _ok, result: result } = await server.processCommand(
        warehouse,
        command,
        true,
      );
      process.stdout.write(result);
    }
  }
})();
