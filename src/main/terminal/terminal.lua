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

local function commandLine(endpoint)
  while true do
    io.write("> ")
    local line = io.read()

    if line == "exit" then
      return
    end

    local response, _, failingResponse = http.post(endpoint, line, { ["Content-Type"] = "text/plain" }, false)
    if response then
      print(response.readAll())
    elseif failingResponse then
      print(failingResponse.readAll())
    else
      print("Error: connection to server lost")
      return
    end
  end
end

if #arg == 1 then
  local response, _, _ = http.get("http://localhost:8080/" .. arg[1] .. "/check", {}, false)
  if response == nil then
    print("Error: couldn't connect to server using warehouse " .. arg[1])
    return
  end

  commandLine("http://localhost:8080/" .. arg[1] .. "/command")
elseif #arg == 0 then
  local response, _, _ = http.get("http://localhost:8080/check", {}, false)
  if response == nil then
    print("Error: couldn't connect to server as generic terminal")
    return
  end

  commandLine("http://localhost:8080/command")
else
  print("Usage: terminal [warehouse-name]")
  return
end
