import { localizer } from '../scripts/foundryHelpers.mjs'
import { getLength, objectFilter, objectMapValues, objectReindexFilter } from '../../lib/helpers.js'

const blankBank = {
  magic_points: 0,
  bank_type: 'bank',
  bank_name: '',
  pool: {0: 6, 1: 6}
};

export class GMBank extends FormApplication {

  constructor() {
    super()
    this.bank_types = [
      { name: 'Bank', value: 'bank', selected: false},
      { name: 'Doom Pool', value: 'doom_pool', selected: false},
     // { name: 'Crisis Pool', value: 'crisis_pool', selected: false},
      { name: 'Challenge Pool', value: 'challenge_pool', selected: false}
    ];
    this.bank_type_name = 'Bank'; // the default
    let gm_bank = game.user.getFlag('earthland', 'GMBank');

    if (!gm_bank) {
      gm_bank = blankBank;
    }

    this.gm_bank = gm_bank;
    let promise = game.user.setFlag('earthland', 'GMBank', this.gm_bank)
    console.log("Got promise from setting the flag: %o", promise);
    // The Bank and Doom Pool simply count Plot Points
    // The Crisis Pool and Challenge Pools have specific dice in them
    // additionally those two also have multiple named sub-pools
    // So it honestly would make sense to use a kind of subclassing.
    // with maybe GMBank being the super class, since it's the simplest
    // and then the subclasses could extend the behavior.
    // so they'd probably all (save GM Bank) have an "add die to bank" kind of button
    // for the Doom Pool, it just counts the die and adds it as a PP
    // for the Crisis Pool, it adds the actual die, which can be converted into a PP
    // Maybe same for the Challenge Pool?
    // Both the Crisis and Challenge pools have a "select and roll" button
    // these allow the GM to roll some of the dice out of the pool
    // for ease of conversion to and from different pool types, maybe all of them
    // store dice and count them as PP?
  }

  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      id: 'gm-bank',
      template: 'systems/earthland/templates/other/gm-bank.html',
      title: localizer('GMBank'),
      classes: ['gm-bank', 'bank'],
      width: 650,
      height: 'auto',
      top: 450,
      left: 200,
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true,
      dragDrop: [{
          dragSelector: '.draggable',
          dropSelector: '.macro-list',
          callbacks: { dragstart: this._onDragStart, drop: this._onDragDrop }
      }]
    })
  }

  async getData () {
    return {
      bank_type: this.gm_bank.bank_type.value,
      bank_types: this.bank_types,
      magic_points: getLength(this.gm_bank.pool ?? {}),
      bank_name: this.gm_bank.bank_name.value,
      bank_type_name: this.bank_type_name,
      pool: this.gm_bank.pool
    };
  }

  activateListeners (html) {
    html.find('.input-cpt').change(this._onChangeBankType.bind(this));
    html.find('.magic-points').change(this._onChangeMagicPoints.bind(this));
    html.find('.bank-name').change(this._onChangeBankName.bind(this));
    html.find('.add-magic-point').click(this._onAddToBank.bind(this));
    html.find('.die-select').change(this._onDieChange.bind(this));
    html.find('.die-select').on('mouseup', this._onDieRemove.bind(this));
    html.find('.new-die').click(this._newDie.bind(this));
    html.find('.roll-pool').click(this._rollPool.bind(this));
    html.find('.add-npc').click(this._addNPC.bind(this));
    html.find('.create-problem').click(this._createProblem.bind(this));
    html.find('.use-ability').click(this._useAbility.bind(this));
  }


  async _onChangeBankType(event) {
    console.log("Got to here (cbt) with event: %o", event);
    event.preventDefault();
    const $target = $(event.currentTarget);
    const value = $target.val();
    const gm_bank = game.user.getFlag('earthland', 'GMBank');
    this.gm_bank = gm_bank;
    // reset all options to false
    this.bank_types.forEach(element => element['selected'] = false);
    // set the selected option to true
    let selected = this.bank_types.find( element => element.value == value );
    selected['selected'] = true;
    if (!!value) {
      setProperty(gm_bank, `bank_type`, { value });
    }
    this.bank_type_name = selected.name;
    console.log("Got to here (cbt) with gm bank: %o", gm_bank);
    await game.user.setFlag('earthland', 'GMBank', null)
    await game.user.setFlag('earthland', 'GMBank', gm_bank)

    console.log("Got to here (cbt) with gm bank2: %o", gm_bank);
    await this.render(true)
  }

  async _onChangeMagicPoints(event) {
    console.log("Got to here (cmp) with event: %o", event);
    event.preventDefault();
    const $target = $(event.currentTarget);
    const value = $target.val();
    const gm_bank = game.user.getFlag('earthland', 'GMBank');
    this.gm_bank = gm_bank;
    console.log("Got to here (gmp) with gm bank: %o and val: %o", gm_bank, value);
    if (!!value) {
      setProperty(gm_bank, `magic_points`, { value });
    }
    await game.user.setFlag('earthland', 'GMBank', null)
    await game.user.setFlag('earthland', 'GMBank', gm_bank)

    await this.render(true)
  }

  async _onChangeBankName(event) {
    console.log("Got to here (cbn) with event: %o", event);
    event.preventDefault();
    const $target = $(event.currentTarget);
    const value = $target.val();
    const gm_bank = game.user.getFlag('earthland', 'GMBank');
    this.gm_bank = gm_bank;
    console.log("Got to here (cbn2) with gm bank: %o and val: %o", gm_bank, value);
    if (!!value) {
      setProperty(gm_bank, `bank_name`, { value });
    }
    await game.user.setFlag('earthland', 'GMBank', null)
    await game.user.setFlag('earthland', 'GMBank', gm_bank)

    await this.render(true)
  }

  async addDieToBank(die) {
    if( game.user.isGM ) {
      console.log("Got to here in addDieToBank with die: %o", die);
      const gm_bank = game.user.getFlag('earthland', 'GMBank');
      console.log("What is gm bank: %o", gm_bank);
      const currentDice = gm_bank.pool;
      const newIndex = getLength(currentDice ?? {});
      const new_pool = {
        ...currentDice,
        [newIndex]: Object.values(die)[0]
      };
      gm_bank.pool = new_pool;
      this.gm_bank = gm_bank;
      console.log("Have new gm bank: %o", gm_bank);
      await game.user.setFlag('earthland', 'GMBank', null)
      await game.user.setFlag('earthland', 'GMBank', gm_bank)
      let total = getLength(currentDice ?? {});
      this._poolMessage( total, 'grown' );
      await this.render(true)
    }
  }

  _poolMessage(value, direction) {
    let bank_name = this.gm_bank.bank_name.value || 'The Bank';
    let content = `${bank_name} has ${direction}. `;
    if (value <= 2) {
      ChatMessage.create({ content: content + `It is tiny.` });
    } else if (value <= 9) {
      ChatMessage.create({ content: content + `It is very small.` });
    } else if (value <= 20) {
      ChatMessage.create({ content: content + `It is medium sized.` });
    } else if (value <= 30) {
      ChatMessage.create({ content: content + `It is Large.` });
    } else if (value > 30) {
      ChatMessage.create({ content: content + `It is OVERFLOWING.` });
    }
  }

  async _onAddToBank(event) {
    event.preventDefault();
    console.log("Got to here to add point to bank with event: %o", event);
    const die = {0: 6};
    this.addDieToBank(die);
  }

  async _updateObject (event, formData) {
    const gm_bank = game.user.getFlag('earthland', 'GMBank')
    console.log("what is gm_bank? %o", gm_bank);
    console.log("What is form data? %o", formData);
    const new_bank = mergeObject(gm_bank, expandObject(formData))

    await game.user.setFlag('earthland', 'GMBank', new_bank)
  }

  async _newDie (event) {
    console.log("in _newDie with event: %o", event);
    event.preventDefault();
    //const $targetNewDie = $(event.currentTarget);
    //const target = $targetNewDie.data('target');
    const gm_bank = game.user.getFlag('earthland', 'GMBank')

    const currentDice = gm_bank.pool;
    const newIndex = getLength(currentDice);
    const newValue = currentDice[newIndex - 1] ?? '8';

    const new_pool = {
      ...currentDice,
      [newIndex]: newValue
    };
    gm_bank.pool = new_pool;
    this.gm_bank = gm_bank;
    await game.user.setFlag('earthland', 'GMBank', null)
    await game.user.setFlag('earthland', 'GMBank', gm_bank)
    await this.render(true)
  }


  async _onDieChange (event) {
    console.log("in _onDieChange with event: %o", event);
    event.preventDefault()
    const $targetNewDie = $(event.currentTarget)
    const target = $targetNewDie.data('target')
    const targetKey = $targetNewDie.data('key');
    const targetValue = parseInt($targetNewDie.val())

    const gm_bank = game.user.getFlag('earthland', 'GMBank');
    const currentDice = gm_bank.pool;

    const newValue = objectMapValues(currentDice ?? {}, (value, index) => parseInt(index, 10) === targetKey ? targetValue : value)
    gm_bank.pool = newValue;
    this.gm_bank = gm_bank;
    await game.user.setFlag('earthland', 'GMBank', null)
    await game.user.setFlag('earthland', 'GMBank', gm_bank)
    await this.render(true)
  }


  async _onDieRemove (event) {
    console.log("in _onDieRemove with event: %o", event);
    event.preventDefault()

    if (event.button === 2) {
      const $target = $(event.currentTarget)
      const target = $target.data('target')
      const targetKey = $target.data('key')
      const gm_bank = game.user.getFlag('earthland', 'GMBank');
      const currentDice = gm_bank.pool;
      console.log("currentDice: %o", currentDice);
      const newValue = objectReindexFilter(currentDice ?? {}, (_, key) => parseInt(key, 10) !== parseInt(targetKey))
      console.log("newValue: %o", newValue);
      gm_bank.pool = newValue;
      console.log("Set new gm_bank: %o", gm_bank);
      this.gm_bank = gm_bank;
      await game.user.setFlag('earthland', 'GMBank', null)
      await game.user.setFlag('earthland', 'GMBank', gm_bank)
      await this.render(true)
    }
  }

  async _rollPool(event) {
    event.preventDefault();
    console.log("in _rollPool");
    const gm_bank = game.user.getFlag('earthland', 'GMBank');
    const pool = gm_bank.pool;
    const label = 'Difficulty';
    game.earthland.UserDicePool._addTraitToPool(this.gm_bank.bank_name.value, label, pool);
  }

  async _removeDie(targetKey, suppressLog = false) {
    // remove the first die from the pool
    console.log("in _removeDie");
    const gm_bank = game.user.getFlag('earthland', 'GMBank');
    console.log("What is the gm bank? %o", gm_bank);
    const pool = gm_bank.pool;
    const newValue = objectReindexFilter(pool ?? {}, (_, key) => parseInt(key, 10) !== parseInt(targetKey))
    console.log("newValue: %o", newValue);
    gm_bank.pool = newValue;
    let total = getLength(pool ?? {});
    if (gm_bank.bank_type.value == 'doom_pool') {
      if (total < 2) {
        gm_bank.pool = blankBank.pool;
      }
    }
    if (!suppressLog) {
      this._poolMessage(total, 'shrunk');
    }
    this.gm_bank = gm_bank;
    await game.user.setFlag('earthland', 'GMBank', null)
    await game.user.setFlag('earthland', 'GMBank', gm_bank)
    await this.render(true)
  }

  async _addNPC(event) {
    event.preventDefault()
    let content = `The opposition increases, a new enemy has entered the fray!`;
    ChatMessage.create({ content });

    const targetKey = '0';
    this._removeDie(targetKey);
  }

  async _createProblem(event) {
    event.preventDefault()
    console.log("in _createProblem");
    const gm_bank = game.user.getFlag('earthland', 'GMBank');
    const pool = gm_bank.pool;
    let content = `A problem occurs, there is a new complication!`;
    ChatMessage.create({ content });

    const targetKey = '0';
    this._removeDie(targetKey);
  }

  async _useAbility(event) {
    event.preventDefault()
    console.log("in _useAbility");
    const gm_bank = game.user.getFlag('earthland', 'GMBank');
    const pool = gm_bank.pool;
    let content = `Zam! The opposition uses a special ability.`;
    ChatMessage.create({ content });

    const targetKey = '0';
    this._removeDie(targetKey);
  }

  async useMP(actor_name, cost = 1) {
    console.log("in useMP");
    const gm_bank = game.user.getFlag('earthland', 'GMBank');
    const pool = gm_bank.pool;
    const targetKey = 0; // remove from the front
    const suppressLog = true;
    for (var i = 0; i < cost; i++) {
      this._removeDie(targetKey, suppressLog);
    }
    let content = `${actor_name} uses a special ability.`;
    ChatMessage.create({ content });
  }

  async display() {
    await this.render(true)
  }

}
