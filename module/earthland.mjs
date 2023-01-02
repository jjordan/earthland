// Import document classes.
import { earthlandActor } from "./documents/actor.mjs";
import { earthlandItem } from "./documents/item.mjs";
import { EarthlandCombatant } from "./documents/combatant.mjs";
// Import sheet classes.
import { earthlandActorSheet } from "./sheets/actor-sheet.mjs";
import { earthlandItemSheet } from "./sheets/item-sheet.mjs";
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";
import { earthland } from "./helpers/config.mjs";
import dicePoolHooks from './hooks/dicePoolHooks.mjs';
import difficultyHooks from './hooks/difficultyHooks.mjs';
import { registerHandlebarHelpers } from './handlebars/helpers.js'
import { registerSettings } from './settings/settings.js'

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', async function() {

  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.earthland = {
    earthlandActor,
    earthlandItem,
    rollItemMacro
  };

  // Add custom constants for configuration.
  CONFIG.earthland = earthland;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "1d20",
    decimals: 2
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = earthlandActor;
  CONFIG.Item.documentClass = earthlandItem;
  CONFIG.Combatant.documentClass = EarthlandCombatant;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("earthland", earthlandActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("earthland", earthlandItemSheet, { makeDefault: true });
  console.log("about to register game settings");
  registerSettings()
  console.log("just registered game settings");

  dicePoolHooks();
  difficultyHooks();
  registerHandlebarHelpers();
  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here are a few useful examples:
Handlebars.registerHelper('concat', function() {
  var outStr = '';
  for (var arg in arguments) {
    if (typeof arguments[arg] != 'object') {
      outStr += arguments[arg];
    }
  }
  return outStr;
});

Handlebars.registerHelper('toLowerCase', function(str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  console.log("in createItemMacros with data: %o and slot: %o", data, slot);
  // First, determine if this is a valid owned item.
  if (data.type !== "Item") return;
  console.log("Got to here 1");
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    console.log("Got to here 2");
    return ui.notifications.warn("You can only create macro buttons for owned Items");
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);
  console.log("Got to here 3 with item: %o", item);

  // Create the macro command using the uuid.
  const command = `game.earthland.rollItemMacro("${data.uuid}");`;
  console.log("Got to here 4 with command: %o", command);
  let macro = game.macros.find(m => (m.name === item.name) && (m.command === command));
  console.log("Got to here 5 with macro: %o", macro);
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "earthland.itemMacro": true }
    });
  }
  console.log("Got to here 6");
  game.user.assignHotbarMacro(macro, slot);
  console.log("Got to here 7");
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  console.log("In rollItemMacro");
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then(item => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(`Could not find item ${itemName}. You may need to delete and recreate this macro.`);
    }

    // Trigger the item roll
    console.log("Got to here in macro with item: %o", item);
    if (item.type == 'dicepool') {
      item.reconstitute();
    } else {
      ui.notifications.error("Can only use DicePool objects in Macros");
    }
  });
}
