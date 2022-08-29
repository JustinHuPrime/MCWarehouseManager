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

import * as sizing from "./inventorySizing";

/**
 * A warehouse
 *
 * Consists of some number of aisles
 */
export class Warehouse {
  public readonly name: string;
  public readonly aisles: Array<Aisle>;
  public readonly homeAisle: number;

  public constructor(name: string, aisles: Array<Aisle>, homeAisle: number) {
    if (typeof name !== "string")
      throw new Error("Warehouse name must be a string");
    if (!Array.isArray(aisles))
      throw new Error("Warehouse aisles must be an array");
    if (aisles.length === 0)
      throw new Error("Warehouse aisles have at least one aisle");
    if (!Number.isSafeInteger(homeAisle))
      throw new Error("Warehouse homeAisle must be a safe integer");
    if (homeAisle < 0 || homeAisle >= aisles.length)
      throw new Error(
        "Warehouse homeAisle must be in range [0, aisles.length)",
      );

    this.name = name;
    this.aisles = aisles;
    this.homeAisle = homeAisle;
  }

  public static fromJSON(json: any): Warehouse {
    return new Warehouse(
      json.name,
      (json.aisles as Array<any>).map((aisle, _index, _array) =>
        Aisle.fromJSON(aisle),
      ),
      json.homeAisle,
    );
  }

  public static createEmpty(
    name: string,
    homeAisle: number,
    aisles: number,
    units: number,
    bins: number,
  ) {
    return new Warehouse(
      name,
      [...new Array(aisles)].map(
        (_value, _index, _array) =>
          new Aisle(
            [...new Array(units)].map(
              (_value, _index, _array) =>
                new Unit(
                  [...new Array(bins)].map(
                    (_value, _index, _array) => new EmptyBin(),
                  ),
                ),
            ),
            [...new Array(units)].map(
              (_value, _index, _array) =>
                new Unit(
                  [...new Array(bins)].map(
                    (_value, _index, _array) => new EmptyBin(),
                  ),
                ),
            ),
          ),
      ),
      homeAisle,
    );
  }
}

/**
 * An aisle
 *
 * Consists of a left half and right half, each containing the same number of units
 */
export class Aisle {
  public readonly left: Array<Unit>;
  public readonly right: Array<Unit>;

  public constructor(left: Array<Unit>, right: Array<Unit>) {
    if (!Array.isArray(left)) throw new Error("Aisle left must be an array");
    if (left.length === 0)
      throw new Error("Aisle left must have at least one unit");
    if (!Array.isArray(right)) throw new Error("Aisle right must be an array");
    if (right.length === 0)
      throw new Error("Aisle right must have at least one unit");
    if (left.length !== right.length)
      throw new Error(
        "Aisle left and right must have the same number of units",
      );

    this.left = left;
    this.right = right;
  }

  public static fromJSON(json: any): Aisle {
    return new Aisle(
      (json.left as Array<any>).map((unit, _index, _array) =>
        Unit.fromJSON(unit),
      ),
      (json.right as Array<any>).map((unit, _index, _array) =>
        Unit.fromJSON(unit),
      ),
    );
  }
}

/**
 * A unit
 *
 * Consists of a number of bins
 */
export class Unit {
  public readonly bins: Array<Bin>;

  public constructor(bins: Array<Bin>) {
    if (!Array.isArray(bins)) throw new Error("Unit bins must be an array");
    if (bins.length === 0) throw new Error("Unit bins have at least one bin");

    this.bins = bins;
  }

  public static fromJSON(json: any): Unit {
    return new Unit(
      (json.bins as Array<any>).map((bin, _index, _array) => Bin.fromJSON(bin)),
    );
  }
}

/**
 * A bin
 */
export abstract class Bin {
  public static fromJSON(json: any): Bin {
    switch (Object.getOwnPropertyNames(json).length) {
      case 0: {
        return new EmptyBin();
      }
      case 1: {
        return new MixedBin(
          (json.stacks as Array<any>).map((stack, _index, _array) =>
            ItemStack.fromJSON(stack),
          ),
        );
      }
      case 2: {
        return new BulkBin(Item.fromJSON(json.item), json.count);
      }
      default: {
        throw new Error("Invalid bin, could not deduce type");
      }
    }
  }
}

/**
 * An unallocated bin
 */
export class EmptyBin extends Bin {}

/**
 * A bulk storage bin
 *
 * Contains up to CHEST_SIZE * item.maxCount items
 */
export class BulkBin extends Bin {
  public readonly item: Item;
  public count: number;

  public get capacity(): number {
    return sizing.CHEST_SIZE * this.item.maxCount;
  }

  public constructor(item: Item, count: number) {
    super();

    if (typeof item !== "object")
      throw new Error("Bulk bin item must be an object");
    if (!Number.isSafeInteger(count))
      throw new Error("Bulk bin count must be an integer");
    if (count < 1) throw new Error("count must be at least 1");
    if (count > sizing.CHEST_SIZE * item.maxCount)
      throw new Error(
        "Bulk bin count must be less than or equal to the capacity",
      );

    this.item = item;
    this.count = count;
  }
}

/**
 * A mixed storage bin
 *
 * Contains up to ROBOT_SIZE individual stacks
 */
export class MixedBin extends Bin {
  public readonly stacks: Array<ItemStack | null>;

  public constructor(stacks: Array<ItemStack | null>) {
    super();

    if (!Array.isArray(stacks))
      throw new Error("Mixed bin stacks must be an array");
    if (stacks.length !== sizing.ROBOT_SIZE)
      throw new Error(
        `Mixed bin must have exactly ${sizing.ROBOT_SIZE} stacks`,
      );
    if (stacks.every((stack, _index, _array) => stack === null))
      throw new Error("Mixed bin must have at least one stack");

    this.stacks = stacks;
  }
}

/**
 * An item
 */
export class Item {
  public readonly displayName: string;
  public readonly name: string;
  public readonly maxCount: number;

  public constructor(displayName: string, name: string, maxCount: number) {
    if (typeof displayName !== "string")
      throw new Error("Item display name must be a string");
    if (typeof name !== "string") throw new Error("Item name must be a string");
    if (!Number.isSafeInteger(maxCount))
      throw new Error("Item maxCount must be an integer");
    if (maxCount < 1) throw new Error("Item maxCount must be at least 1");

    this.displayName = displayName;
    this.name = name;
    this.maxCount = maxCount;
  }

  public static fromJSON(json: any): Item {
    return new Item(json.displayName, json.name, json.maxCount);
  }
}

/**
 * An item stack
 */
export class ItemStack {
  public readonly item: Item;
  public count: number;

  public constructor(item: Item, count: number) {
    if (typeof item !== "object")
      throw new Error("ItemStack item must be an object");
    if (!Number.isSafeInteger(count))
      throw new Error("ItemStack count must be an integer");
    if (count < 1) throw new Error("ItemStack count must be greater than 0");
    if (count > item.maxCount)
      throw new Error("ItemStack count must be less than or equal to maxCount");

    this.item = item;
    this.count = count;
  }

  public static fromJSON(json: any): ItemStack {
    return new ItemStack(Item.fromJSON(json.item), json.count);
  }
}
