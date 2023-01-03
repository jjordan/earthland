/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
import { formulaFromObject } from '../../lib/helpers.js'
import { localizer } from '../scripts/foundryHelpers.mjs'

export class earthlandActor extends Actor {

  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the basic actor data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.earthland || {};

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    this._prepareCharacterData(actorData);
    this._prepareNpcData(actorData);
  }

  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    if (actorData.type !== 'character') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;

    // // Loop through ability scores, and add their modifiers to our sheet output.
    // for (let [key, ability] of Object.entries(systemData.attributes)) {
    //   // Calculate the modifier using d20 rules.
    //   ability.mod = Math.floor((ability.value - 10) / 2);
    // }
  }

  /**
   * Prepare NPC type specific data.
   */
  _prepareNpcData(actorData) {
    if (actorData.type !== 'npc') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;
    systemData.xp = (systemData.cr * systemData.cr) * 100;
  }

  /**
   * Allow the actor to rest and regain energy.
   * The amount of energy regained depends on the length of rest.
   * 'action' = 1 Energy
   * 'short' = up to max energy, in addition temporary complications are removed
   * 'long' = up to max energy, in addition status conditions are lowered a step and hit points are regained
   */
  async rest(type) {
    const currentEnergy = +(this.data.data.energy.value ?? 0)
    console.log("in actor rest with current energy: %o", currentEnergy);
    const maxEnergy = this.data.data.energy.max;
    let newEnergy = currentEnergy;
    if (type == 'action') {
      newEnergy++;
    } else if (type == 'short') {
      newEnergy = maxEnergy
    } else { // long rest
      newEnergy = maxEnergy
    }
    if (currentEnergy !== newEnergy && newEnergy >= 0) {
      console.log("Got a reasonable change in energy");
      await this.updateEnergyValue(newEnergy);
    }
  }

  async reenergize(value) {
    console.log("in reengerize with value: %o", value);
    const currentEnergy = +(this.data.data.energy.value ?? 0)
    const maxEnergy = +(this.data.data.energy.max ?? 0)
    let newEnergy = parseInt(currentEnergy) + parseInt(value);
    console.log("have newEnergy: %o, currentEnergy: %o and maxEnergy: %o", newEnergy, currentEnergy, maxEnergy);
    if (currentEnergy !== newEnergy && newEnergy <= maxEnergy) {
      console.log("Got a reasonable change in energy");
      await this.updateEnergyValue(newEnergy);
    }
  }

  async exhaust(value) {
    const currentEnergy = +(this.data.data.energy.value ?? 0)
    let newEnergy = currentEnergy - value;
    if (currentEnergy !== newEnergy && newEnergy >= 0) {
      console.log("Got a reasonable change in energy");
      await this.updateEnergyValue(newEnergy);
    }
  }

  // Update energy value of the actor
  async updateEnergyValue (value) {
    console.log("in updateEnergyValue with value: %o", value);
    await this.update({
      'data.energy.value': value
    })
  }

  async changePpBy (value, directChange = false) {
    // ensure current value is an integer
    const currentValue = +(this.data.data.magic.value ?? 0)

    const newValue = parseInt(currentValue) + parseInt(value)

    // action only taken if value will be different and won't result in negative plot points
    if (currentValue !== newValue && newValue >= 0) {
      await this.updatePpValue(newValue)
      // determin if it is spending a plot point or receiving a plot point
      const valueChangeType = currentValue > newValue
          ? directChange
            ? localizer('Removed')
            : localizer('Spent')
          : directChange
            ? localizer('Added')
            : localizer('Received')

      await this.createPpMessage(valueChangeType, Math.abs(currentValue - newValue), newValue)
    }
  }

  // Send a message to the chat on the pp change
  async createPpMessage (changeType, value, total) {
    const message = await renderTemplate(`systems/earthland/templates/chat/change-pp.html`, {
      changeType,
      speaker: game.user,
      target: this,
      total,
      value
    })

    ChatMessage.create({ content: message })
  }

  // Update plot point value of the actor
  async updatePpValue (value) {
    await this.update({
      'data.magic.value': value
    })
  }


  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    const data = super.getRollData();

    // Prepare character roll data.
    this._getCharacterRollData(data);
    this._getNpcRollData(data);

    return data;
  }


  /**
   * Add a known status condition to this actor
   */
  async addStatusCondition(id) {
    console.log("In actor with id: %o", id);
    // get the complication object by id
    // check if the actor already has a complication with the same name or id
    // if they do, upgrade it by 1 level
      // If the upgrade would put the die beyond a D12, instead add "Incapacitated"
    // if they don't, add it as a D6 complication
  }


  /**
   * Remove a known status condition from this actor
   */
  async removeStatusCondition(id) {
    console.log("In actor with id: %o", id);
    // get the complication object by id
    // check if the actor already has a complication with the same name or id
    // if they do, remove it
    // otherwise do nothing
  }


  /**
   * Add a free-form complication to this actor
   */
  async addComplication(name) {
    console.log("In actor with name: %o", name);
    // check if the actor already has a complication with the same name
    // if they do, upgrade it by 1 level
    // if they don't, add it
  }


  /**
   * Remove a free-form complication from this actor
   */
  async removeComplication(name) {
    console.log("In actor with name: %o", name);
    // check if the actor already has a complication with the same name
    // if they do, remove it
    // otherwise do nothing
  }


  async addDamage(amount, damage_type) {
    console.log("In actor with amount: %o, and damage type: %o", amount, damage_type);
  }


  async loseHealth(amount) {
    console.log("In actor with amount: %o", amount);
  }


  async restoreHealth(amount) {
    console.log("In actor with amount: %o", amount);
  }


  /**
   * Prepare character roll data.
   */
  _getCharacterRollData(data) {
    if (this.type !== 'character') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (data.attributes) {
      for (let [k, v] of Object.entries(data.attributes)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
  }

  /**
   * Prepare NPC roll data.
   */
  _getNpcRollData(data) {
    if (this.type !== 'npc') return;

    // Process additional NPC data here.
  }

  getDiceObjectForTrait(trait) {
    let diceObj = null
    // we need to search attributes
    let myTrait = this.system.attributes[trait]
    if((typeof myTrait == 'undefined')) {
      myTrait = this.system.roles[trait]
    }
    if((typeof myTrait == 'undefined') && (typeof this.system.packages != 'undefined')) {
      myTrait = this.system.packages[trait]
    }
    if((typeof myTrait == 'undefined') && (typeof this.system.behaviors != 'undefined')) {
      myTrait = this.system.behaviors[trait]
    }
    if((typeof myTrait == 'undefined')) {
      myTrait = {'value': {'0': '0'}}
    }
    console.log("found myTrait (%o) for name: %o", myTrait, trait);
    diceObj = this._countDice(myTrait.value)
    return diceObj
  }

  _countDice(diceObj){
    console.log("in _countDice with diceObj: %o", diceObj);
    let diceCounter = {}
    for (const [index, sides] of Object.entries(diceObj)) {
      if (sides > 0) {
        if (diceCounter.hasOwnProperty(sides)) {
          diceCounter[sides] += 1
        } else {
          diceCounter[sides] = 1
        }
      }
    }
    return diceCounter
  }

}
