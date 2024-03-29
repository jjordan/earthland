import {onManageActiveEffect, prepareActiveEffectCategories} from "../helpers/effects.mjs";
import { times, getLength, objectMapValues, objectReindexFilter, objectFindValue, objectSome } from '../../lib/helpers.js'
import { localizer } from '../scripts/foundryHelpers.mjs'

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
    context.monster_kind_options = [
      {
        name: 'Boss',
        value: 'boss',
        selected: false
      },
      {
        name: 'Elite',
        value: 'elite',
        selected: false
      },
      {
        name: 'Pet',
        value: 'pet',
        selected: false
      },
      {
        name: 'Minion',
        value: 'minion',
        selected: false
      },
      {
        name: 'Mob',
        value: 'mob',
        selected: false
      }
    ];

    context.npc_kind_options = [
      {
        name: 'Boss',
        value: 'boss',
        selected: false
      },
      {
        name: 'Elite',
        value: 'elite',
        selected: false
      },
      {
        name: 'Minion',
        value: 'minion',
        selected: false
      },
      {
        name: 'Mob',
        value: 'mob',
        selected: false
      }
    ];

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);
    console.log("actor data: %o", actorData);
    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    let kind_name = context.system.kind;
    let kind = '';
    if (actorData.type == 'npc') {
      context.npc_kind_options[0].selected = false; // reset zero option
      kind = context.npc_kind_options.find( element => element.value === kind_name);
    }
    if (actorData.type == 'monster') {
      context.monster_kind_options[0].selected = false; // reset zero option
      kind = context.monster_kind_options.find( element => element.value === kind_name);
    }
    console.log("What is kind? %o", kind);
    context.is_mob    = false;
    context.is_minion = false;
    context.is_pet    = false;
    context.is_elite  = false;
    context.is_boss   = false;
    if (!!kind) {
      kind.selected = true;
      if (kind.value == 'mob') {
        context.is_mob = true;
      } else if (kind.value == 'minion') {
        context.is_minion = true;
      } else if (kind.value == 'elite') {
        context.is_elite = true;
      } else if (kind.value == 'boss') {
        context.is_boss = true;
      } else if (kind.value == 'pet') {
        context.is_pet = true;
      } else {
        context.is_minion = true;
      }
    }

    // Prepare character data and items.
    if (actorData.type == 'character') {
      this._prepareItems(context);
      this._prepareCharacterData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'npc') {
      this._prepareCharacterData(context);
      this._prepareNPCData(context);
      this._prepareItems(context);
    }

    if (actorData.type == 'monster') {
      this._prepareItems(context);
      this._prepareMonsterData(context);
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
    for (let [k, v] of Object.entries(context.system.packages)) {
      v.label = game.i18n.localize(CONFIG.earthland.packages[k]) ?? k;
    }
  }

  _prepareNPCData(context) {
    // handle npc only data
    for (let [k, v] of Object.entries(context.system.morality.virtues)) {
      v.label = game.i18n.localize(CONFIG.earthland.virtues[k]) ?? k;
    }
    for (let [k, v] of Object.entries(context.system.morality.vices)) {
      v.label = game.i18n.localize(CONFIG.earthland.vices[k]) ?? k;
    }
  }

  _prepareMonsterData(context) {
    // handle monster only data
    for (let [k, v] of Object.entries(context.system.attributes)) {
      v.label = game.i18n.localize(CONFIG.earthland.attributes[k]) ?? k;
    }
    for (let [k, v] of Object.entries(context.system.roles)) {
      v.label = game.i18n.localize(CONFIG.earthland.roles[k]) ?? k;
    }
    for (let [k, v] of Object.entries(context.system.behaviors)) {
      v.label = game.i18n.localize(CONFIG.earthland.behaviors[k]) ?? k;
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
    const abilities = [];
    const ammunition = [];
    const armor = [];
    const class_abilities = [];
    const class_features = [];
    const classes = [];
    const complications = [];
    const containers = [];
    const distinctions = [];
    const equipment = [];
    const feats = [];
    const gear = [];
    const lacrima = [];
    const milestones = [];
    const potions = [];
    const recipes = [];
    const relationships = [];
    const resources = [];
    const specialties = [];
    const species_abilities = [];
    const species_features = [];
    const subclasses = [];
    const treasures = [];
    const trinkets = [];
    const weapons = [];
    const spells = {
      0: [] // all the rest are auto-added
    };
    const dicepools = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || DEFAULT_TOKEN;
      // Append to distinctions.
      if (i.type === 'distinction') {
        distinctions.push(i);
      }
      // append to gear for NPCs or PC "big list of items"
      if (i.system.is_physical_item) {
        gear.push(i);
      }
      // append to dicepools
      if (i.type === 'dicepool') {
        dicepools.push(i);
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
      // Append to ammunition
      else if (i.type === 'ammunition') {
        ammunition.push(i);
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
      // Append to containers to equipment
      else if (i.type === 'container') {
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
        abilities.push(i);
        if (i.type == "class") {
          classes.push(i);
        }
        else if (i.type == "subclass") {
          subclasses.push(i);
        }
        else if (i.system.is_class_feature){
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
        else {
          feats.push(i);
        }
      }
      // Append to spells.
      else if (i.type === 'spell') {
        if (i.system.level != undefined) {
          if (spells.hasOwnProperty(i.system.level)) {
            spells[i.system.level].push(i);
          } else {
            spells[i.system.level] = [];
            spells[i.system.level].push(i);
          }
        }
      }
    }
    context.is_not_gm = true;
    context.is_gm = false
    if ( game.user.isGM ) {
       context.is_not_gm = false;
       context.is_gm = true;
    }
    // Assign and return
    context.abilities         = abilities;
    context.ammunition        = ammunition;
    context.armors            = armor; // pseudo plural
    context.class_abilities   = class_abilities;
    context.class_features    = class_features;
    context.classes           = classes;
    context.complications     = complications;
    context.containers        = containers;
    context.dicepools         = dicepools;
    context.distinctions      = distinctions;
    context.equipment         = equipment;
    context.feats             = feats;
    context.gear              = gear;
    context.lacrimas          = lacrima; // pseudo plural
    context.milestones        = milestones;
    context.potions           = potions;
    context.recipes           = recipes;
    context.relationships     = relationships;
    context.resources         = resources;
    context.specialties       = specialties;
    context.species_abilities = species_abilities;
    context.species_features  = species_features;
    context.spells            = spells;
    context.subclasses        = subclasses;
    context.treasures         = treasures;
    context.trinkets          = trinkets;
    context.weapons           = weapons;
    console.log("What are dicepools? %o", dicepools);
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Render the item sheet for viewing/editing prior to the editable check.
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getEmbeddedDocument("Item", li.data("itemId"));
      //const item = this.actor.items.get(li.data("itemId"));
      item.sheet.render(true);
    });

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Dynamic Dice Selectors
    html.find('.die-select').change(this._onDieChange.bind(this))
    html.find('.die-select').on('mouseup', this._onDieRemove.bind(this))
    html.find('.new-die').click(this._newDie.bind(this))

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.items.get(li.data("itemId"));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    html.find('.milestone-checkbox').change(this._onMilestoneCheck.bind(this));
    //html.find('.milestone-checkbox').click(this._onMilestoneCheck.bind(this));
    //html.find('.milestone-checkbox').on('mousedown',this._onMilestoneCheck.bind(this));

    // Active Effect management
    html.find(".effect-control").click(ev => onManageActiveEffect(ev, this.actor));

    // Rollable attributes.
    html.find('.rollable').click(this._onRoll.bind(this));
    html.find('.usable').click(this._onUse.bind(this));
    html.find('.poolable').click(this._onPool.bind(this));
    html.find('.consumable').click(this._onConsume.bind(this));

    html.find('input.checkbox').each( (i, val) => {
      const isTrueSet = ($(val).val() === 'true');
      $(val).prop("checked", isTrueSet);
    });
    html.find('input.checkbox').change(event => {
      if ($(this).is(':checked')) {
        $(this).prop("checked", event.target.value);
      }
    });
    html.find('.add-pp').click(() => { this.actor.changePpBy(1) })
    html.find('.pp-number-field').change(this._ppNumberChange.bind(this))
    html.find('.spend-pp').click(() => {
      this.actor
        .changePpBy(-1)
        .then(() => {
          if (game.dice3d) {
            game.dice3d.show({ throws: [{ dice: [{ result: 1, resultLabel: 1, type: 'dp', vectors: [], options: {} }] }] }, game.user, true)
          }
        })
    })
    html.find('.short-rest').click(this._onShortRest.bind(this));
    html.find('.long-rest').click(this._onLongRest.bind(this));
    html.find('.rest-action').click(this._onRestAction.bind(this));
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

  async _onShortRest() {
    this.actor.rest('short');
  }

  async _onLongRest() {
    this.actor.rest('long');
  }

  async _onRestAction() {
    this.actor.rest('action');
  }

  async _ppNumberChange (event) {
    event.preventDefault()
    const $field = $(event.currentTarget)
    const parsedValue = parseInt($field.val(), 10)
    const currentValue = parseInt(this.actor.data.data.magic.value, 10)
    const newValue = parsedValue < 0 ? 0 : parsedValue
    const changeAmount = newValue - currentValue

    this.actor.changePpBy(changeAmount, true)
  }

  async _onMilestoneCheck(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const $targetNewDie = $(event.currentTarget);
    const target = $targetNewDie.data('target');

    const li = $(event.currentTarget).parents(".item");
    //const item = this.actor.items.get(li.data("itemId"));
    const item = this.actor.getEmbeddedDocument("Item", dataset.id);
    //let item = Item.get(dataset.id);
    if (!!item) {
      if (item.system.is_completed == false) { // complete the item
        await item.complete();
        element.checked = true;
      } else { // cannot uncheck it, but first just see if we can toggle it
        await item.reset();
        element.checked = false;
        await item.update({
          is_complete: false
        });
      }
    }
  }

  async _newDie (event) {
    event.preventDefault();
    const $targetNewDie = $(event.currentTarget);
    const target = $targetNewDie.data('target');
    const currentDiceData = getProperty(this.actor, target);
    const currentDice = currentDiceData?.value ?? {};
    const newIndex = getLength(currentDice);
    const newValue = currentDice[newIndex - 1] ?? '8';

    await this.actor.update({
      [target]: {
        value: {
          ...currentDice,
          [newIndex]: newValue
        }
      }
    })
  }


  async _onDieChange (event) {
    event.preventDefault()
    const $targetNewDie = $(event.currentTarget)
    const target = $targetNewDie.data('target')
    const targetKey = $targetNewDie.data('key');
    const targetValue = parseInt($targetNewDie.val())
    const currentDiceData = getProperty(this.actor, target)

    const newValue = objectMapValues(currentDiceData.value ?? {}, (value, index) => parseInt(index, 10) === targetKey ? targetValue : value)

    await this._resetDataPoint(target, 'value', newValue);
  }


  async _onDieRemove (event) {
    event.preventDefault()

    if (event.button === 2) {
      const $target = $(event.currentTarget)
      const target = $target.data('target')
      const targetKey = $target.data('key')
      const currentDiceData = getProperty(this.actor.data, target)

      const newValue = objectReindexFilter(currentDiceData.value ?? {}, (_, key) => parseInt(key, 10) !== parseInt(targetKey))

      await this._resetDataPoint(target, 'value', newValue)
    }
  }


  async _resetDataPoint(path, target, value) {
    await this.actor.update({
      [`${path}.-=${target}`]: null
    })

    await this.actor.update({
      [`${path}.${target}`]: value
    })
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
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const $targetNewDie = $(event.currentTarget);
    const target = $targetNewDie.data('target');
    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        console.log("in roll-type item");
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) return item.roll();
      }
    }

    let object;
    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[${dataset.kind}] ${dataset.label}` : '';
      let trait = dataset.roll;
      let rollData = this.actor.getRollData();
      let value = this.replaceFormulaData(trait, rollData);
      console.log("Got value in actor sheet 1: %o", value);
      if (dataset.consumable) {
        if (typeof value === 'string') {
          object = this.formulaToDiceObject(value);
        } else if (typeof value === 'object') {
          object = value
        }
        console.log("Got object in actor sheet 1: %o", object);
        const selectedDice = await this._getConsumableDiceSelection(object, label)
        console.log("What are the selected dice? %o", selectedDice);
        if (selectedDice.remove?.length) {
          const newValue = objectReindexFilter(object, (_, key) => !selectedDice.remove.map(x => parseInt(x, 10)).includes(parseInt(key, 10)))
          console.log("Got new value: %o", newValue);
          console.log("Resetting target: %o.value", target);
          await this._resetDataPoint(target, 'value', newValue)
        }

        value = selectedDice.value
      }
      console.log("Got value in actor sheet: %o", value);
      if (typeof value === 'string') {
        object = this.formulaToDiceObject(value);
      } else if (typeof value === 'object') {
        object = value
      }

      game.earthland.UserDicePool._addTraitToPool(this.actor.name, label, object, this.actor.id)
      return null;
    }
  }


  _onUse(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    // check if the user has the energy and/or MP
    // at this point just warn if the actor does not have enough
    const error_messages = [];
    let label = dataset.label ? `[${dataset.kind}] ${dataset.label}` : '';
    const actor_energy = this.actor.system.energy.value;
    const actor_mp = this.actor.system.magic.value;
    if (actor_energy < dataset.energycost) {
      error_messages.push( `Energy (${actor_energy})` );
    }
    if (actor_mp < dataset.mpcost && !game.user.isGM) {
      error_messages.push( `Magic Points (${actor_mp})` );
    }
    if (error_messages.length > 0) {
      const messages = error_messages.join(' or ');
      ui.notifications.error( `${this.actor.name} does not have enough ${messages} to use ${label}` );
      return null;
    } else {
      const object = this.unwrapCostObject({ en: dataset.energycost, mp: dataset.mpcost });
      // added but not yet deducted
      if ((parseInt(dataset.energycost) > 0) || (parseInt(dataset.mpcost) > 0)) {
        if (dataset.roll) {
          game.earthland.UserDicePool._addCostToPool(this.actor.name, label, object, this.actor.id);
        }
      }
    }
    if (dataset.roll) {
      let label = dataset.label ? `[${dataset.kind}] ${dataset.label}` : '';
      let trait = dataset.roll;
      let rollData = this.actor.getRollData();
      let value = this.replaceFormulaData(trait, rollData);
      let object;
      if (typeof value === 'string') {
        object = this.formulaToDiceObject(value);
      } else if (typeof value === 'object') {
        object = value
      }

      game.earthland.UserDicePool._addTraitToPool(this.actor.name, label, object, this.actor.id)
      return null;
    } else {
      // just output the spell card and deduct the energy.
      this.actor.exhaust(parseInt(dataset.energycost));
      this.actor.changePpBy( - parseInt(dataset.mpcost))
      const item = this.actor.items.get(dataset.itemid);
      console.log("Got to here with used item: %o, %o", dataset.itemid, item);
      if(!!item) {
        let label = 'Uses';
        if (item.type === "spell") {
          label = 'Casts';
        }
        item.chatCard(label);
      } else {
        // Initialize chat data.
        const speaker = ChatMessage.getSpeaker({ actor: this.actor });
        const rollMode = game.settings.get('core', 'rollMode');
        const label = `Uses [${dataset.kind}] ${dataset.label}`;
        // If there's no roll data, send a chat message.
        ChatMessage.create({
          speaker: speaker,
          rollMode: rollMode,
          flavor: label,
          content: dataset.description ?? ''
        });
      }
    }
  }

  _onPool(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    if (dataset.poolid) {
      let poolObj = this.actor.getEmbeddedDocument('Item', dataset.poolid);
      let pool = JSON.parse(poolObj.system.pool);
      console.log("Got pool: %o", pool);
      game.earthland.UserDicePool._setPool(pool, poolObj.name, poolObj.id);
    }
  }

  _onConsume(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    console.log("in _onConsume with dataset: %o", dataset);
    // in order to consume a charge on the item, we need:
    // the charge_cost, the current available charges, and the itemid.
    // Now technically with just the itemid we could load the item and check the other two datapoints...
    // We have to do that anyway in the dicepool, so maybe for now we just load those
    // datapoints directly here so that the first check is quick.
    if (dataset.id) {
      let item = this.actor.getEmbeddedDocument("Item", dataset.id);
      console.log("have item: %o", item);
      const charge_cost = parseInt(dataset.chcost);
      const current_charges = parseInt(dataset.chcurrent);
      console.log("charge_cost: %o, current_charges: %o", charge_cost, current_charges);
      if (charge_cost >= 1) {
        if (current_charges >= 1) {
          if (current_charges >= charge_cost) {
            console.log("we can pay the cost");
            // the item has more charges than it consumes, it's safe to use it
            let label = dataset.label ? `[${dataset.kind}] ${dataset.label}` : '';
            const object = this.unwrapCostObject({ ch: dataset.chcost });
            console.log("about to add a charge to the pool");
            game.earthland.UserDicePool._addChargeToPool(this.actor.name, label, object, this.actor.id, item.id);
          } else {
            // send error message to user and don't add to the pool
            return ui.notifications.error( `${item.name} does not have enough charges ${dataset.chcurrent} to pay the cost ${dataset.chcost}` );
          }
        } else {
          return ui.notifications.error( `${item.name} does not have enough charges ${dataset.chcurrent} to pay the cost ${dataset.chcost}` );
        }
      }
    }
    if (dataset.roll) {
      let label = dataset.label ? `[${dataset.kind}] ${dataset.label}` : '';
      let trait = dataset.roll;
      let rollData = this.actor.getRollData();
      let value = this.replaceFormulaData(trait, rollData);
      let object;
      if (typeof value === 'string') {
        object = this.formulaToDiceObject(value);
      } else if (typeof value === 'object') {
        object = value
      }

      game.earthland.UserDicePool._addTraitToPool(this.actor.name, label, object, this.actor.id)
      return null;
    }
  }

  async _getConsumableDiceSelection (options, label) {
    const content = await renderTemplate('systems/earthland/templates/dialog/consumable-dice.html', {
      options,
      isOwner: game.user.isOwner
    })

    return new Promise((resolve, reject) => {
      new Dialog({
        title: label,
        content,
        buttons: {
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: localizer('Cancel'),
            callback () {
              resolve({ remove: [], value: {} })
            }
          },
          done: {
            icon: '<i class="fas fa-check"></i>',
            label: localizer('AddToPool'),
            callback (html) {
              const remove = html.find('.remove-check').prop('checked')
              const selectedDice = html.find('.die-select.selected').get()

              if (!selectedDice?.length) {
                resolve({ remove: [], value: {} })
              }

              resolve(
                selectedDice
                  .reduce((selectedValues, selectedDie, index) => {
                    const $selectedDie = $(selectedDie)

                    if (remove) {
                      selectedValues.remove = [...selectedValues.remove, $selectedDie.data('key')]
                    }

                    selectedValues.value = { ...selectedValues.value, [getLength(selectedValues.value)]: $selectedDie.data('value') }

                    return selectedValues
                  }, { remove: [], value: {} })
              )
            }
          }
        },
        default: 'cancel',
        render(html) {
          html.find('.die-select').click(function () {
            const $dieContainer = $(this)
            const $dieCpt = $dieContainer.find('.die-cpt')
            $dieContainer.toggleClass('result selected')
            $dieCpt.toggleClass('unchosen-cpt chosen-cpt')
          })
        }
      }, { jQuery: true, classes: ['dialog', 'consumable-dice', 'earthland'] }).render(true)
    })
  }


  unwrapCostObject( object ) {
    const invertedObject = {};
    let j = 0;
    for (const [trait, number] of Object.entries(object)) {
      for (let i = 0; i < number; i++) {
        invertedObject[j] = trait;
        j++;
      }
    }
    return invertedObject;
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


  formulaToDiceObject(formulae) {
    const formulas = formulae.split(' ');
    const obj = {};
    let j = 0;
    formulas.forEach( formula => {
      let [num, sides] = formula.split('d');
      times(parseInt(num)) (i => {
        obj[j] = parseInt(sides)
        j++;
      });
    });
    return obj;
  }
}
