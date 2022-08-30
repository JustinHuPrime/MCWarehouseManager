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

if #arg ~= 1 then
  print("Usage: robot <warehouse-name>")
  return
end

local response, _, _ = http.get("http://localhost:8080/" .. arg[1] .. "/check", {}, false)
if response == nil then
  print("Error: couldn't connect to server using warehouse " .. arg[1])
  return
end

local ws = http.websocket("ws://localhost:8080")
ws.send(arg[1])

while true do
  local ok, message = pcall(ws.receive)
  if ok and message then
    print("server: " .. message) -- TODO - respond to commands
  else
    print("Error: websocket closed")
    return
  end
end
