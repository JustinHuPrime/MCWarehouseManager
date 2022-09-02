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

id.setSystemName(arg[1])
local res, errMessage, _ = http.post("http://localhost:8080/" .. arg[1] .. "/create-system",
  "",
  {}
)
if res == nil then
  print("Error: " .. errMessage)
  return
else
  print("Success!")
end
