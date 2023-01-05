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

  async resetTemporaryHitPoints() {
    await this.update({
      'data.temporary_health.value': 0,
      'data.temporary_health.max': 0
    })
  }

  async addConditionsToPool() {
    const complications = this.items.filter(i => (i.type == 'complication'));
    console.log("Found complications: %o", complications);
    complications.forEach(complication => {
      let label = `[Complication] ${complication.name}`;
      let object = complication.system.dice.value;
      game.earthland.UserDicePool._addTraitToPool(this.name, label, object, this.id);
    });
  }


  async restoreHitPoints() {
    const currentHealth = +(this.system.health.value ?? 0)
    const maxHealth = +(this.system.health.max ?? 0)
    const vitality = parseInt(this.system.attributes.vitality.value[0]);
    let newHealth = 0;
    // TODO: change the way hitpoints are regained to use vitality
    if (currentHealth < maxHealth) {
      let difference = maxHealth - currentHealth;
      console.log("What is difference? %o", difference);
      console.log("What is vitality: %o", vitality);
      if (difference > vitality) { // more HP lost than Vitality, recover half
        let half_hp = Math.ceil(difference / 2.0);
        console.log("the difference is greater than our vitality, recovering half: %o", half_hp);
        this.restoreHealth( half_hp );
      } else { // small enough amount the character can just heal it.
        console.log("difference is less than vitality, recovering all hp");
        this.restoreHealth(difference);
      }
    }
  }

  async recoverAllTemporaryComplications() {
    const temporary_complications = this.items.filter(i => (i.type == 'complication') &&
                                            ((i.system.is_permanent == false) && (i.system.is_semi_permanent == false) ));
    console.log("got temporary complications: %o", temporary_complications);
    temporary_complications.forEach(complication => {
      this.deleteEmbeddedDocuments('Item', [complication.id]);
      ChatMessage.create({ content: `${this.name} has completely recovered from ${complication.name}` });
    });
  }

  /**
   * Allow the actor to rest and regain energy.
   * The amount of energy regained depends on the length of rest.
   * 'action' = 1 Energy
   * 'short' = up to max energy, in addition temporary complications are removed
   * 'long' = up to max energy, in addition status conditions are lowered a step and hit points are regained
   */
  async rest(type) {
    const currentEnergy = +(this.system.energy.value ?? 0)
    console.log("in actor rest with current energy: %o", currentEnergy);
    const maxEnergy = this.system.energy.max;
    let newEnergy = currentEnergy;
    if (type == 'action') {
      ChatMessage.create({ content: `${this.name} has taken the rest action.` });
      newEnergy += 2;
    } else if (type == 'short') {
      ChatMessage.create({ content: `${this.name} has taken a short rest.` });
      newEnergy = maxEnergy;
      this.recoverAllTemporaryComplications();
    } else { // long rest
      ChatMessage.create({ content: `${this.name} has taken a long rest.` });
      newEnergy = maxEnergy;
      this.recoverAllTemporaryComplications();
      this.restoreHitPoints();
      this.resetTemporaryHitPoints();
    }
    if (currentEnergy !== newEnergy && newEnergy >= 0) {
      console.log("Got a reasonable change in energy");
      await this.updateEnergyValue(newEnergy);
      ChatMessage.create({ content: `${this.name} has regained energy (${newEnergy}/${maxEnergy})` });
    }
  }

  async reenergize(value) {
    console.log("in reengerize with value: %o", value);
    const currentEnergy = +(this.system.energy.value ?? 0)
    const maxEnergy = +(this.system.energy.max ?? 0)
    let newEnergy = parseInt(currentEnergy) + parseInt(value);
    console.log("have newEnergy: %o, currentEnergy: %o and maxEnergy: %o", newEnergy, currentEnergy, maxEnergy);
    if (currentEnergy !== newEnergy && newEnergy <= maxEnergy) {
      console.log("Got a reasonable change in energy");
      await this.updateEnergyValue(newEnergy);
      ChatMessage.create({ content: `${this.name} has regained ${value} energy` });
    }
  }

  async exhaust(value) {
    const currentEnergy = +(this.system.energy.value ?? 0)
    let newEnergy = currentEnergy - value;
    if (currentEnergy !== newEnergy && newEnergy >= 0) {
      console.log("Got a reasonable change in energy");
      await this.updateEnergyValue(newEnergy);
      ChatMessage.create({ content: `${this.name} has lost ${value} energy` });
    }
  }

  // Update energy value of the actor
  async updateEnergyValue (value) {
    console.log("in updateEnergyValue with value: %o", value);
    await this.update({
      'data.energy.value': value
    })
  }

  // Update health value of the actor
  async updateHealthValue (value) {
    console.log("in updateHealthValue with value: %o", value);
    await this.update({
      'data.health.value': value
    })
  }

  async changePpBy (value, directChange = false) {
    // ensure current value is an integer
    const currentValue = +(this.system.magic.value ?? 0)

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
    const condition = await Item.get(id);
    const existing_conditions = this.items.filter(c => condition.name == c.name);
    let existing_condition = existing_conditions[0];
    console.log("got condition: %o", condition);
    console.log("got existing condition: %o", existing_condition);
    // check if the actor already has a complication with the same name or id
    if (existing_condition) {
    // if they do, upgrade it by 1 level
      const die = existing_condition.system.dice.value;
      // If the upgrade would put the die beyond a D12, instead add "Incapacitated"
      if (die[0] >= 12) {
        const results = game.items.filter(i => i.name == 'Incapacitated');
        const incapacitated = results[0];
        await this.addStatusCondition(incapacitated.id);
      } else {
        let sides = parseInt(die[0]) + 2;
        die[0] = sides;
        await this.updateEmbeddedDocuments('Item', [
          {
            _id: existing_condition._id,
            system: {
              dice: {
                value: {
                  0: sides
                }
              }
            }
          }
        ]);
        ChatMessage.create({ content: `${this.name}'s Status Condition ${existing_condition.name} has worsened (d${existing_condition.system.dice.value[0]})` });
      }
    } else { // if they don't, add it as a D6 complication
      const result = await this.createEmbeddedDocuments('Item', [condition]);
      existing_condition = result[0];
      ChatMessage.create({ content: `${this.name} gained Status Condition ${existing_condition.name} (d${existing_condition.system.dice.value[0]})` });
    }
  }


  /**
   * Remove a known status condition from this actor
   */
  async removeStatusCondition(id) {
    console.log("In actor with id: %o", id);
    const condition = await Item.get(id);
    const existing_conditions = this.items.filter(c => condition.name == c.name);
    let existing_condition = existing_conditions[0];
    console.log("got condition: %o", condition);
    console.log("got existing condition: %o", existing_condition);
    // check if the actor already has a complication with the same name or id
    if (existing_condition) {
    // if they do, upgrade it by 1 level
      const die = existing_condition.system.dice.value;
      // If the upgrade would put the die beyond a D12, instead add "Incapacitated"
      if (die[0] <= 4) {
        await this.deleteEmbeddedDocuments('Item', [existing_condition.id]);
        ChatMessage.create({ content: `${this.name} has completely recovered from ${existing_condition.name}` });
      } else {
        let sides = parseInt(die[0]) - 2;
        await this.updateEmbeddedDocuments('Item', [
          {
            _id: existing_condition._id,
            system: {
              dice: {
                value: {
                  0: sides
                }
              }
            }
          }
        ]);
        ChatMessage.create({ content: `${this.name}'s Status Condition ${existing_condition.name} has improved (d${existing_condition.system.dice.value[0]})` });
      }
    }
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
    const existing_conditions = this.items.filter(c => name == c.name);
    let existing_condition = existing_conditions[0];
    console.log("got existing condition: %o", existing_condition);
    // check if the actor already has a complication with the same name or id
    if (existing_condition) {
    // if they do, upgrade it by 1 level
      const die = existing_condition.system.dice.value;
      // If the upgrade would put the die beyond a D12, instead add "Incapacitated"
      if (die[0] >= 12) {
        const results = game.items.filter(i => i.name == 'Incapacitated');
        const incapacitated = results[0];
        await this.addStatusCondition(incapacitated.id);
      } else {
        let sides = parseInt(die[0]) + 2;
        die[0] = sides;
        await this.updateEmbeddedDocuments('Item', [
          {
            _id: existing_condition._id,
            system: {
              dice: {
                value: {
                  0: sides
                }
              }
            }
          }
        ]);
        ChatMessage.create({ content: `${this.name}'s Complication ${existing_condition.name} has worsened (d${existing_condition.system.dice.value[0]})` });
      }
    } else {
      const complication = {
        name: name,
        type: 'complication',
        system: {
          dice: {
            value: {
              0: 6
            }
          }
        }
      };
      const result = await this.createEmbeddedDocuments('Item', [complication]);
      existing_condition = result[0];
      ChatMessage.create({ content: `${this.name} gained Status Condition ${existing_condition.name} (d${existing_condition.system.dice.value[0]})` });
    }
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
    const existing_conditions = this.items.filter(c => name == c.name);
    let existing_condition = existing_conditions[0];
    console.log("got existing condition: %o", existing_condition);
    // check if the actor already has a complication with the same name or id
    if (existing_condition) {
    // if they do, upgrade it by 1 level
      const die = existing_condition.system.dice.value;
      // If the upgrade would put the die beyond a D12, instead add "Incapacitated"
      if (die[0] <= 4) {
        await this.deleteEmbeddedDocuments('Item', [existing_condition.id]);
        ChatMessage.create({ content: `${this.name} has completely recovered from ${existing_condition.name}` });
      } else {
        let sides = parseInt(die[0]) - 2;
        await this.updateEmbeddedDocuments('Item', [
          {
            _id: existing_condition._id,
            system: {
              dice: {
                value: {
                  0: sides
                }
              }
            }
          }
        ]);
        ChatMessage.create({ content: `${this.name}'s Complication ${existing_condition.name} has improved (d${existing_condition.system.dice.value[0]})` });
      }
    }
  }


  async addDamage(amount, damage_type) {
    console.log("In actor with amount: %o, and damage type: %o", amount, damage_type);
    // check if the character has resistances, immunities or weaknesses
    // monsters have these fields directly
    let damage_amount = amount;
    const dt = damage_type.toLocaleLowerCase()
    const dt_re = new RegExp(dt, "i");
    if (this.type == 'monster') {
      if (this.system.immunities != '') {
        if (this.system.immunities.match(dt_re)) {
          ChatMessage.create({ content: `${this.name} is immune to ${damage_type} damage!` });
          damage_amount = 0;
        }
      }
      if (this.system.resistances != '') {
        if (this.system.resistances.match(dt_re)) {
          ChatMessage.create({ content: `${this.name} is resistant to ${damage_type} damage!` });
          damage_amount = Math.ceil(amount / 2.0);
        }
      }
      if (this.system.weaknesses != '') {
        if (this.system.weaknesses.match(dt_re)) {
          ChatMessage.create({ content: `${this.name} is weak to ${damage_type} damage!` });
          damage_amount = Math.ceil(amount * 2.0);
        }
      }
    } else if (this.type == 'character') {
      console.log("Immunity, Resistance and Weakness calculations are not yet implemented for humanoids");
      damage_amount = amount;
    } else if (this.type == 'npc') {
      console.log("Immunity, Resistance and Weakness calculations are not yet implemented for humanoids");
      damage_amount = amount;
    }
    if (damage_amount > 0) {
      ChatMessage.create({ content: `${this.name} took ${damage_amount} ${damage_type} damage!` });
    }
    await this.loseHealth(damage_amount);
    // humandoids would have ActiveEffects with a specific name
    // then check if the damage type is in one of those
    // if it's not, then just call loseHealth
    // if it is, then perform a modification on the damage
  }


  async loseHealth(amount) {
    console.log("In actor with amount: %o", amount);
    const currentHealth = +(this.system.health.value ?? 0)
    let newHealth = currentHealth - amount;
    if (currentHealth !== newHealth && newHealth >= 0) {
      console.log("Got a reasonable change in health");
      await this.updateHealthValue(newHealth);
      ChatMessage.create({ content: `${this.name} has lost ${amount} hit points` });
    }
  }


  async restoreHealth(amount) {
    console.log("In actor with amount: %o", amount);
    const currentHealth = +(this.system.health.value ?? 0)
    const maxHealth = +(this.system.health.max ?? 0)
    let newHealth = parseInt(currentHealth) + parseInt(amount);
    console.log("have newHealth: %o, currentHealth: %o and maxHealth: %o", newHealth, currentHealth, maxHealth);
    if (currentHealth !== newHealth && newHealth <= maxHealth) {
      console.log("Got a reasonable change in health");
      await this.updateHealthValue(newHealth);
      ChatMessage.create({ content: `${this.name} has gained ${amount} hit points` });
    }
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
