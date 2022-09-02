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

/**
 * A storage system
 */
export class StorageSystem {
  public readonly name: string;
  public readonly storage: Array<StorageLocation>;
  public readonly processors: Array<Processor>;
  public readonly recipes: Array<Recipe>;
  public readonly terminals: Array<Terminal>;

  /**
   * @param name url name of the system
   * @param storage storage chests/barrels
   * @param processors processing machines
   * @param recipes processing recipes
   * @param terminals access terminals
   */
  public constructor(
    name: string,
    storage: Array<StorageLocation> = [],
    processors: Array<Processor> = [],
    recipes: Array<Recipe> = [],
    terminals: Array<Terminal> = [],
  ) {
    this.name = name;
    this.storage = storage;
    this.processors = processors;
    this.recipes = recipes;
    this.terminals = terminals;
  }

  public static fromJSON(json: any): StorageSystem {
    return new StorageSystem(
      json.name,
      json.storage.map(StorageLocation.fromJSON),
      json.processors.map(Processor.fromJSON),
      json.recipes.map(Recipe.fromJSON),
      json.terminals.map(Terminal.fromJSON),
    );
  }

  public static toJSON(storage: StorageSystem): any {
    return {
      name: storage.name,
      storage: storage.storage.map(StorageLocation.toJSON),
      processors: storage.processors.map(Processor.toJSON),
      recipes: storage.recipes.map(Recipe.toJSON),
      terminals: storage.terminals.map(Terminal.toJSON),
    };
  }
}

/**
 * An access terminal
 */
export class Terminal {
  public readonly name: string;
  public readonly storage: StorageLocation;

  /**
   * @param name human-readable name of the terminal
   * @param storage storage location associated with the terminal; not usable for actual storage
   */
  public constructor(name: string, storage: StorageLocation) {
    this.name = name;
    this.storage = storage;
  }

  public static fromJSON(json: any): Terminal {
    return new Terminal(json.name, StorageLocation.fromJSON(json.storage));
  }

  public static toJSON(terminal: Terminal): any {
    return {
      name: terminal.name,
      storage: StorageLocation.toJSON(terminal.storage),
    };
  }
}

/**
 * A recipe
 */
export class Recipe {
  public readonly process: string;
  public readonly inputs: Array<ItemStack>;
  public readonly outputs: Array<RecipeOutput>;

  public constructor(
    process: string,
    inputs: Array<ItemStack>,
    outputs: Array<RecipeOutput>,
  ) {
    this.process = process;
    this.inputs = inputs;
    this.outputs = outputs;
  }

  public static fromJSON(json: any): Recipe {
    return new Recipe(
      json.process,
      json.inputs.map(ItemStack.fromJSON),
      json.outputs.map(RecipeOutput.fromJSON),
    );
  }

  public static toJSON(recipe: Recipe): any {
    return {
      process: recipe.process,
      inputs: recipe.inputs.map(ItemStack.toJSON),
      outputs: recipe.outputs.map(RecipeOutput.toJSON),
    };
  }
}

/**
 * A recipe output specification
 */
export class RecipeOutput {
  public readonly outputItem: ItemStack;
  public readonly minOutputStock: number;
  public readonly maxOutputStock: number;

  /**
   * @param outputItem produced item
   * @param minOutputStock will trigger processing if it falls below this amount
   * @param maxOutputStock will make enough to bring it to this amount
   */
  public constructor(
    outputItem: ItemStack,
    minOutputStock: number,
    maxOutputStock: number,
  ) {
    this.outputItem = outputItem;
    this.minOutputStock = minOutputStock;
    this.maxOutputStock = maxOutputStock;
  }

  public static fromJSON(json: any): RecipeOutput {
    return new RecipeOutput(
      ItemStack.fromJSON(json.outputItem),
      json.minOutputStock,
      json.maxOutputStock,
    );
  }

  public static toJSON(recipeOutput: RecipeOutput): any {
    return {
      outputItem: ItemStack.toJSON(recipeOutput.outputItem),
      minOutputStock: recipeOutput.minOutputStock,
      maxOutputStock: recipeOutput.maxOutputStock,
    };
  }
}

/**
 * A processing location
 */
export class Processor {
  public readonly process: string;
  public readonly inputBuffer: StorageLocation;
  public readonly outputBuffer: StorageLocation;

  /**
   * @param process kind of process supported (e.g. smelting, macerating)
   * @param inputBuffer where to put inputs
   * @param outputBuffer where to get outputs from (counts as withdraw-only storage)
   */
  public constructor(
    process: string,
    inputBuffer: StorageLocation,
    outputBuffer: StorageLocation,
  ) {
    this.process = process;
    this.inputBuffer = inputBuffer;
    this.outputBuffer = outputBuffer;
  }

  public static fromJSON(json: any): Processor {
    return new Processor(
      json.process,
      StorageLocation.fromJSON(json.inputBuffer),
      StorageLocation.fromJSON(json.outputBuffer),
    );
  }

  public static toJSON(processor: Processor): any {
    return {
      process: processor.process,
      inputBuffer: StorageLocation.toJSON(processor.inputBuffer),
      outputBuffer: StorageLocation.toJSON(processor.outputBuffer),
    };
  }
}

/**
 * A storage bin
 */
export class StorageLocation {
  public readonly id: string;
  public readonly items: Array<ItemStack | null>;

  /**
   * @param id computercraft id of the storage location
   * @param items stored items
   */
  public constructor(id: string, items: Array<ItemStack | null> = []) {
    this.id = id;
    this.items = items;
  }

  public static fromJSON(json: any): StorageLocation {
    return new StorageLocation(
      json.id,
      (json.items as Array<any>).map((stack) =>
        stack == null ? null : ItemStack.fromJSON(stack),
      ),
    );
  }

  public static toJSON(storageLocation: StorageLocation): any {
    return {
      id: storageLocation.id,
      items: storageLocation.items.map((stack) =>
        stack == null ? null : ItemStack.toJSON(stack),
      ),
    };
  }
}

/**
 * An item stack
 */
export class ItemStack {
  public readonly item: Item;
  public count: number;

  /**
   * @param item which item this stack stores
   * @param count how many are in the stack
   */
  public constructor(item: Item, count: number) {
    this.item = item;
    this.count = count;
  }

  public static fromJSON(json: any): ItemStack {
    return new ItemStack(Item.fromJSON(json.item), json.count);
  }

  public static toJSON(itemStack: ItemStack): any {
    return {
      item: Item.toJSON(itemStack.item),
      count: itemStack.count,
    };
  }

  public toString(): string {
    return `${this.count}x ${this.item}`;
  }
}

/**
 * An item
 */
export class Item {
  public readonly displayName: string;
  public readonly id: string;
  public readonly maxCount: number;
  public readonly nbt: string | null;

  /**
   * @param displayName human-readable name of the item
   * @param id minecraft item id - use this for equality comparison
   * @param maxCount max amount that can fit into a stack
   */
  public constructor(
    displayName: string,
    id: string,
    maxCount: number,
    nbt: string | null = null,
  ) {
    this.displayName = displayName;
    this.id = id;
    this.maxCount = maxCount;
    this.nbt = nbt;
  }

  public static fromJSON(json: any): Item {
    return new Item(json.displayName, json.id, json.maxCount, json.nbt);
  }

  public static toJSON(item: Item): any {
    return {
      displayName: item.displayName,
      id: item.id,
      maxCount: item.maxCount,
      nbt: item.nbt,
    };
  }

  public toString(): string {
    return this.displayName;
  }
}
