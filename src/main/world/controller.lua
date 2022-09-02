-- Copyright 2022 Justin Hu
-- This file is part of MCWarehouseManager.
--
-- MCWarehouseManager is free software: you can redistribute it and/or modify
-- it under the terms of the GNU Affero General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or (at your
-- option) any later version.
--
-- MCWarehouseManager is distributed in the hope that it will be useful, but
-- WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
-- or FITNESS FOR A PARTICULAR PURPOSE. See the GNU Affero General Public
-- License for more details.
--
-- You should have received a copy of the GNU Affero General Public License
-- along with MCWarehouseManager. If not, see <https://www.gnu.org/licenses/>.
--
-- SPDX-License-Identifier: AGPL-3.0-or-later

local id = require("id")

local ws, errMessage = http.websocket("ws://localhost:8080")
if ws == nil then
  print("Error: " .. errMessage)
  return
end

ws.send(id.getSystemName())
local message = ws.receive()
if message == nil then
  print("Error: could not connect to server")
  return
end

print(message)

while true do
  local message = ws.receive()
  if message == nil then
    print("Error: connection lost")
    return
  end

  print("Running " .. message)
  local retval = load(message)()
  local serialized = textutils.serialize(retval, { compact = false, allow_repetitions = true })
  ws.send(serialized)
end
