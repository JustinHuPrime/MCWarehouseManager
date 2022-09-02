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

for _, file in ipairs({
  "controller.lua",
  "create-system.lua",
  "id.lua",
  "register-processor.lua",
  "register-storage.lua",
  "set-system-name.lua",
  "set-terminal-name.lua",
  "update.lua"
}) do
  if fs.exists(file) then
    fs.delete(file)
  end

  assert(shell.execute("wget", "http://localhost:8080/world/" .. file))
end
