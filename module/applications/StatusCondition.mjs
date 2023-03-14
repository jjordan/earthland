import { localizer } from '../scripts/foundryHelpers.mjs'

export class StatusCondition extends FormApplication {
  constructor() {
    super()
    this.status_conditions = {
        'Bleeding' : '',
        'Blessed' : '',
        'Blinded' : '',
        'Burned' : '',
        'Burning' : '',
        'Charmed' : '',
        'Chilled' : '',
        'Confused' : '',
        'Cursed' : '',
        'Deafened' : '',
        'Diseased' : '',
        'Frightened' : '',
        'Frozen' : '',
        'Grappled' : '',
        'Hasted' : '',
        'Invisible' : '',
        'Jinxed' : '',
        'Melting' : '',
        'Paralyzed' : '',
        'Petrified' : '',
        'Poisoned' : '',
        'Polymorphed' : '',
        'Punctured' : '',
        'Raging' : '',
        'Restrained' : '',
        'Slowed' : '',
        'Stunned' : '',
        'Transformed' : '',
        'Unconscious' : ''
    };
    const complications = game.items.filter(i => (i.type == 'complication') &&
                                            ((i.system.is_permanent == true) || (i.system.is_semi_permanent == true) )                                           )
    // look up each of these in the system by name to get the complication item id for that complication
    complications.forEach( complication => {
      if (this.status_conditions.hasOwnProperty(complication.name)) {
        this.status_conditions[complication.name] = complication.id;
      }
    });
  }

  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      id: 'status-conditions',
      template: 'systems/earthland/templates/other/status_conditions.html',
      title: localizer('StatusConditions'),
      classes: ['status', 'status-conditions', 'conditions', 'complications'],
      width: 450,
      height: 'auto',
      top: 500,
      left: 500,
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: false,
      submitOnChange: true
    })
  }

  async getData () {
    return { status_conditions: this.status_conditions };
  }

  activateListeners (html) {
    html.find('.add-complication').click(this._onAddComplication.bind(this));
    html.find('.del-complication').click(this._onRemoveComplication.bind(this));
    html.find('.add-ff-complication').click(this._onAddFreeComplication.bind(this));
    html.find('.del-ff-complication').click(this._onRemoveFreeComplication.bind(this));
    html.find('.add-energy').click(this._onAddEnergy.bind(this));
    html.find('.remove-energy').click(this._onRemoveEnergy.bind(this));
    html.find('.add-magic').click(this._onAddMagic.bind(this));
    html.find('.remove-magic').click(this._onRemoveMagic.bind(this));
    html.find('.add-health').click(this._onAddHealth.bind(this));
    html.find('.remove-health').click(this._onRemoveHealth.bind(this));
    html.find('.add-to-pool').click(this._onAddToPool.bind(this));
  }

  async _onAddToPool(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const actors = this._getActorsBySelectedTokens();
    if (actors.length == 0) {
      ui.notifications.error("No tokens selected, cannot add complications to dice pool");
    } else {
      actors.forEach(a => a.addConditionsToPool());
    }
  }

  async _onAddComplication(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const id = $(element).parent().siblings('select').val();
    console.log("have id: %o", id);
    const actors = this._getActorsBySelectedTokens();
    if (actors.length == 0) {
      ui.notifications.error("No tokens selected, cannot add a complication");
    } else {
      actors.forEach(a => a.addStatusCondition(id));
    }
  }

  async _onRemoveComplication(event) {
    const element = event.currentTarget;
    const id = $(element).parent().siblings('select').val();
    console.log("have id: %o", id);
    const actors = this._getActorsBySelectedTokens();
    if (actors.length == 0) {
      ui.notifications.error("No tokens selected, cannot remove a complication");
    } else {
      actors.forEach(a => a.removeStatusCondition(id));
    }
  }

  async _onAddFreeComplication(event) {
    const element = event.currentTarget;
    const name = $(element).parent().siblings('.input-holder').children('input.complication-freeform').val();
    console.log("have complication mame: %o", name);
    const actors = this._getActorsBySelectedTokens();
    if (actors.length == 0) {
      ui.notifications.error("No tokens selected, cannot add a complication");
    } else {
      actors.forEach(a => a.addComplication(name));
    }
  }

  async _onRemoveFreeComplication(event) {
    const element = event.currentTarget;
    const name = $(element).parent().siblings('.input-holder').children('input.complication-freeform').val();
    console.log("have complication mame: %o", name);
    const actors = this._getActorsBySelectedTokens();
    if (actors.length == 0) {
      ui.notifications.error("No tokens selected, cannot remove a complication");
    } else {
      actors.forEach(a => a.removeComplication(name));
    }
  }

  async _onAddEnergy(event) {
    const element = event.currentTarget;
    const energy = $(element).parent().siblings('.input-holder').children('input.energy-amount').val();
    console.log("have energy amount: %o", energy);
    const actors = this._getActorsBySelectedTokens();
    if (actors.length == 0) {
      ui.notifications.error("No tokens selected, cannot add energy");
    } else {
      actors.forEach(a => a.reenergize(energy));
    }
  }

  async _onRemoveEnergy(event) {
    const element = event.currentTarget;
    const energy = $(element).parent().siblings('.input-holder').children('input.energy-amount').val();
    console.log("have energy amount: %o", energy);
    const actors = this._getActorsBySelectedTokens();
    if (actors.length == 0) {
      ui.notifications.error("No tokens selected, cannot remove energy");
    } else {
      actors.forEach(a => a.exhaust(energy));
    }
  }

  async _onAddMagic(event) {
    const element = event.currentTarget;
    const magic = $(element).parent().siblings('.input-holder').children('input.magic-amount').val();
    console.log("have magic amount: %o", magic);
    const actors = this._getActorsBySelectedTokens();
    if (actors.length == 0) {
      ui.notifications.error("No tokens selected, cannot add magic");
    } else {
      actors.forEach(a => a.changePpBy(magic));
    }
  }

  async _onRemoveMagic(event) {
    const element = event.currentTarget;
    const magic = $(element).parent().siblings('.input-holder').children('input.magic-amount').val();
    console.log("have magic amount: %o", magic);
    const actors = this._getActorsBySelectedTokens();
    if (actors.length == 0) {
      ui.notifications.error("No tokens selected, cannot remove magic");
    } else {
      actors.forEach(a => a.changePpBy(0 - parseInt(magic)));
    }
  }


  async _onAddHealth(event) {
    const element = event.currentTarget;
    const health = $(element).parent().siblings('.input-holder').children('input.health-amount').val();
    console.log("have health amount: %o", health);
    const actors = this._getActorsBySelectedTokens();
    if (actors.length == 0) {
      ui.notifications.error("No tokens selected, cannot add health");
    } else {
      actors.forEach(a => a.restoreHealth(health));
    }
  }

  async _onRemoveHealth(event) {
    const element = event.currentTarget;
    const health = $(element).parent().siblings('.input-holder').children('input.health-amount').val();
    const damage_type = $(element).parent().siblings('.input-holder').children('select').val();
    console.log("have health amount: %o", health);
    const actors = this._getActorsBySelectedTokens();
    if (actors.length == 0) {
      ui.notifications.error("No tokens selected, cannot remove health");
    } else {
      if ((typeof damage_type == "string") && (damage_type != '')) {
        actors.forEach(a => a.addDamage(health, damage_type));
      } else {
        actors.forEach(a => a.loseHealth(health));
      }
    }
  }

  async display() {
    await this.render(true)
  }

  _getActorsBySelectedTokens() {
    return canvas.tokens.controlled.map( t => t.actor )
  }
}
