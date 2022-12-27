/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class earthlandItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which is passed to any Roll formulas which are created related to this Item
   * @private
   */
   getRollData() {
    // If present, return the actor's roll data.
    if ( !this.actor ) return null;
    const rollData = this.actor.getRollData();
    // Grab the item's system data as well.
    rollData.item = foundry.utils.deepClone(this.system);

    return rollData;
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async roll() {
    const item = this;

    // Initialize chat data.
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    // If there's no roll data, send a chat message.
    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.system.description ?? ''
      });
    }
    // Otherwise, create a roll and send a chat message from it.
    else {
      // Retrieve roll data.
      const rollData = this.getRollData();

      // Invoke the roll and submit it to chat.
      const roll = new Roll(rollData.item.formula, rollData);
      // If you need to store the value first, uncomment the next line.
      // let result = await roll.roll({async: true});
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }

  async complete() {
    console.log("what is item? %o", this);
    if (this.type == 'milestone') {
      console.log("attempting to complete a milestone");
      if (this.system.completed_time != '') {
        ui.notifications.info("This milestone has already been marked as completed. Ask the GM to reset your milestones.");
        return '';
      }
      let updated = await this.update({
          data: {
              is_completed: true,
              completed_user: game.user.name,
              completed_time: new Date().toLocaleString(),
          }
      });
      if (updated) {
        let current_xp = this.parent.system.experience.value;
        console.log("Found current XP: %o", current_xp);
        current_xp += this.system.xp;
        console.log("Updated xp to: %o", current_xp);
        updated = this.parent.update({
          data: {
            experience: {
              value: current_xp
            }
          }
        });
      }
      console.log("updated: %o", updated);
    }
  }

  async reconstitute() {
    let poolObj = this;
    console.log("Got pool: %o", poolObj);
    let pool = JSON.parse(poolObj.system.pool);
    console.log("What is parsed pool? %o", pool);
    game.earthland.UserDicePool._setPool(pool, poolObj.name, poolObj.id);
  }

  async reset() {
    if( game.user.isGM ) {
      if (this.type == 'milestone') {
        if (this.system.is_repeatable) {
          console.log("attempting to complete a milestone");
          let updated = await this.update({
              data: {
                  is_completed: false,
                  completed_user: '',
                  completed_time: '',
              }
          });
          console.log("updated: %o", updated);
        }
      }
    }
  }
}
