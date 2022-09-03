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

import * as chai from "chai";
import * as model from "../../main/server/model";

describe("fromJSON reversibility", () => {
  const redstoneDust = new model.Item(
    "Redstone Dust",
    "minecraft:redstone_dust",
    64,
  );
  const ironSword = new model.Item(
    "Iron Sword",
    "minecraft:iron_sword",
    1,
    "somenbtstringhere",
  );
  const redstoneDustStack = new model.ItemStack(redstoneDust, 10);
  const storageChest = new model.StorageLocation("minecraft:chest_21", [
    ...Array(1).fill(null),
    redstoneDustStack,
    ...Array(10).fill(null),
    redstoneDustStack,
    ...Array(14).fill(null),
  ]);
  const inputChest = new model.StorageLocation(
    "minecraft:chest_11",
    Array(27).fill(null),
  );
  const outputChest = new model.StorageLocation(
    "minecraft:chest_12",
    Array(27).fill(null),
  );
  const smelter = new model.Processor("smelting", inputChest, outputChest);
  const ironIngotSpec = new model.RecipeItemSpecification(
    "minecraft:iron_ingot",
    1,
  );
  const ironIngotOutput = new model.RecipeOutputSpecification(
    ironIngotSpec,
    64,
    128,
  );
  const ironIngotSmelting = new model.Recipe(
    "smelting",
    [new model.RecipeItemSpecification("minecraft:raw_iron", 1)],
    [ironIngotOutput],
  );
  const terminal = new model.Terminal(
    "main",
    new model.StorageLocation("minecraft:chest_24", Array(27).fill(null)),
  );
  const storageSystem = new model.StorageSystem(
    "main",
    [storageChest],
    [smelter],
    [ironIngotSmelting],
    [terminal],
  );

  it("should be reversible for items", () => {
    chai
      .expect(redstoneDust)
      .to.deep.equal(
        model.Item.fromJSON(
          JSON.parse(JSON.stringify(model.Item.toJSON(redstoneDust))),
        ),
      );
  });

  it("should be reversible for items with NBT", () => {
    chai
      .expect(ironSword)
      .to.deep.equal(
        model.Item.fromJSON(
          JSON.parse(JSON.stringify(model.Item.toJSON(ironSword))),
        ),
      );
  });

  it("should be reversible for item stacks", () => {
    chai
      .expect(redstoneDustStack)
      .to.deep.equal(
        model.ItemStack.fromJSON(
          JSON.parse(JSON.stringify(model.ItemStack.toJSON(redstoneDustStack))),
        ),
      );
  });

  it("should be reversible for storage locations", () => {
    chai
      .expect(storageChest)
      .to.deep.equal(
        model.StorageLocation.fromJSON(
          JSON.parse(
            JSON.stringify(model.StorageLocation.toJSON(storageChest)),
          ),
        ),
      );
  });

  it("should be reversible for processors", () => {
    chai
      .expect(smelter)
      .to.deep.equal(
        model.Processor.fromJSON(
          JSON.parse(JSON.stringify(model.Processor.toJSON(smelter))),
        ),
      );
  });

  it("should be reversible for recipe item specs", () => {
    chai
      .expect(ironIngotSpec)
      .to.deep.equal(
        model.RecipeItemSpecification.fromJSON(
          JSON.parse(
            JSON.stringify(model.RecipeItemSpecification.toJSON(ironIngotSpec)),
          ),
        ),
      );
  });

  it("should be reversible for recipe outputs", () => {
    chai
      .expect(ironIngotOutput)
      .to.deep.equal(
        model.RecipeOutputSpecification.fromJSON(
          JSON.parse(
            JSON.stringify(
              model.RecipeOutputSpecification.toJSON(ironIngotOutput),
            ),
          ),
        ),
      );
  });

  it("should be reversible for recipies", () => {
    chai
      .expect(ironIngotSmelting)
      .to.deep.equal(
        model.Recipe.fromJSON(
          JSON.parse(JSON.stringify(model.Recipe.toJSON(ironIngotSmelting))),
        ),
      );
  });

  it("should be reversible for terminals", () => {
    chai
      .expect(terminal)
      .to.deep.equal(
        model.Terminal.fromJSON(
          JSON.parse(JSON.stringify(model.Terminal.toJSON(terminal))),
        ),
      );
  });

  it("should be reversible for storage systems", () => {
    chai
      .expect(storageSystem)
      .to.deep.equal(
        model.StorageSystem.fromJSON(
          JSON.parse(JSON.stringify(model.StorageSystem.toJSON(storageSystem))),
        ),
      );
  });
});
