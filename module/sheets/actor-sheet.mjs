import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";
import {times} from "../../lib/helpers.js"
/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class earthlandActorSheet extends ActorSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["earthland", "sheet", "actor"],
      template: "systems/earthland/templates/actor/actor-sheet.html",
      width: 800,
      height: 1000,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "traits" }]
    });
  }

  /** @override */
  get template() {
    return `systems/earthland/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve the data structure from the base sheet. You can inspect or log
    // the context variable to see the structure, but some key properties for
    // sheets are the actor object, the data object, whether or not it's
    // editable, the items array, and the effects array.
    const context = super.getData();
    console.log("What is context? %o", context);
    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareItems(context);
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    return context;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterData(context) {
    // Handle attribute scores.
    for (let [k, v] of Object.entries(context.system.attributes)) {
      v.label = game.i18n.localize(CONFIG.earthland.attributes[k]) ?? k;
    }
    for (let [k, v] of Object.entries(context.system.roles)) {
      v.label = game.i18n.localize(CONFIG.earthland.roles[k]) ?? k;
    }
    for (let [k, v] of Object.entries(context.system.classes)) {
      v.label = game.i18n.localize(CONFIG.earthland.classes[k]) ?? k;
    }
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareItems(context) {
    // Initialize containers.
    const distinctions = [];
    const specialties = [];
    const complications = [];
    const weapons = [];
    const armor = [];
    const potions = [];
    const lacrima = [];
    const equipment = [];
    const trinkets = [];
    const containers = [];
    const recipes = [];
    const resources = [];
    const treasures = [];
    const class_abilities = [];
    const class_features = [];
    const species_abilities = [];
    const species_features = [];
    const subclasses = [];
    const relationships = [];
    const milestones = [];
    const spells = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: []
    };

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      console.log("Got to here with context item: %o", i);
      i.img = i.img || DEFAULT_TOKEN;
      // Append to distinctions.
      if (i.type === 'distinction') {
        distinctions.push(i);
      }
      // Append to specialties.
      if (i.type === 'specialty') {
        specialties.push(i);
      }
      // Append to complications.
      else if (i.type === 'complication') {
        complications.push(i);
      }
      // Append to milestones
      else if (i.type === 'milestone') {
        milestones.push(i);
      }
      // Append to relationships
      else if (i.type === 'relationship') {
        relationships.push(i);
      }
      // Append to weapons
      else if (i.type === 'weapon') {
        weapons.push(i);
      }
      // Append to armor
      else if (i.type === 'armor') {
        armor.push(i);
      }
      // Append to potions
      else if (i.type === 'potion') {
        potions.push(i);
      }
      // Append to potions
      else if (i.type === 'lacrima') {
        lacrima.push(i);
      }
      // Append to equipment
      else if (i.type === 'equipment') {
        equipment.push(i);
      }
      // Append to trinkets
      else if (i.type === 'trinket') {
        trinkets.push(i);
      }
      // Append to containers
      else if (i.type === 'container') {
        containers.push(i);
      }
      // Append to recipes
      else if (i.type === 'recipe') {
        recipes.push(i);
      }
      // Append to resources
      else if (i.type === 'resource') {
        resources.push(i);
      }
      // Append to treasures
      else if (i.type === 'treasure') {
        treasures.push(i);
      }
      // Append to features.
      else if (i.system.is_capability) {
        if (i.type == "subclass") {
          console.log("about to add subclass");
          subclasses.push(i);
        }
        if (i.system.is_class_feature){
          class_features.push(i);
        }
        else if (i.system.is_class_ability){
          class_abilities.push(i);
        }
        else if (i.system.is_species_ability){
          species_abilities.push(i);
        }
        else if (i.system.is_species_feature){
          species_features.push(i);
        }
      }
      // Append to spells.
      else if (i.type === 'spell') {
        console.log("got to here with spell!!!!!!!");
        if (i.system.level != undefined) {
          spells[i.system.level].push(i);
        }
      }
    }

    // Assign and return
    context.distinctions      = distinctions;
    context.specialties       = specialties;
    context.complications     = complications;
    context.relationships     = relationships;
    context.milestones        = milestones;
    context.weapons           = weapons;
    context.armors            = armor; // pseudo plural
    context.potions           = potions;
    context.lacrimas          = lacrima; // pseudo plural
    context.equipment         = equipment;
    context.trinkets          = trinkets;
    context.containers        = containers;
    context.recipes           = recipes;
    context.resources         = resources;
    context.treasures         = treasures;
    context.class_features    = class_features;
    context.class_abilities   = class_abilities;
    context.species_features  = species_features;
    context.species_abilities = species_abilities;
    context.subclasses        = subclasses;
    context.spells            = spells;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable attributes.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Drag events for macros.
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Get the type of item to create.
    let type = '';
    const metatype = header.dataset.type;
    // check for subtype
    if (metatype.match(/-/)) {
      const parts = metatype.split('-');
      type = parts[0];
      let subtype = parts[1];
      data[`is_${subtype}_${type}`] = true;
    } else {
      type = metatype;
    }
    console.log("Got type: %o and data: %o", type, data);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system["type"];

    // Finally, create the item!
    return await Item.create(itemData, {parent: this.actor});
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    console.log("in onRoll with event: %o", event);
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    console.log("element: %o, dataset: %o", element, dataset);
    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        console.log("Got an item with dataset: %o", dataset);
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[${dataset.kind}] ${dataset.label}` : '';
      let trait = dataset.roll;
      let rollData = this.actor.getRollData();
      let value = this.replaceFormulaData(trait, rollData);
      let object = this.formulaToDiceObject(value);

      game.earthland.UserDicePool._addTraitToPool(this.actor.name, label, object)
      return null;
    }
  }

  replaceFormulaData(formula, data, {missing, warn=false}={}) {
    let dataRgx = new RegExp(/@([a-z.0-9_\-]+)/gi);
    return formula.replace(dataRgx, (match, term) => {
      let value = foundry.utils.getProperty(data, term);
      if ( value == null ) {
        if ( warn && ui.notifications ) ui.notifications.warn(game.i18n.format("DICE.WarnMissingData", {match}));
        return (missing !== undefined) ? String(missing) : match;
      }
      return String(value).trim();
    });
  }


  formulaToDiceObject(formula) {
    const [num, sides] = formula.split('d');
    const obj = {};
    times(parseInt(num)) (i => obj[i] = parseInt(sides));
    return obj;
  }
}
