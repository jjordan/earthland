import { localizer } from '../scripts/foundryHelpers.mjs'

const blankBank = {
  magic_points: 0,
  bank_type: 'bank',
  bank_name: '',
  pool: {}
};

export class GMBank extends FormApplication {

  constructor() {
    super()
    this.bank_types = [
      { name: 'Bank', value: 'bank', selected: false},
      { name: 'Doom Pool', value: 'doom_pool', selected: false},
      { name: 'Crisis Pool', value: 'crisis_pool', selected: false},
      { name: 'Challenge Pool', value: 'challenge_pool', selected: false}
    ];

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
      width: 450,
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
      magic_points: this.gm_bank.magic_points.value,
      bank_name: this.gm_bank.bank_name.value,
      bank_type_name: this.bank_types[this.gm_bank.bank_type.value]
    };
  }

  activateListeners (html) {
    html.find('.input-cpt').change(this._onChangeBankType.bind(this));
    html.find('.magic-points').change(this._onChangeMagicPoints.bind(this));
    html.find('.bank-name').change(this._onChangeBankName.bind(this));
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

  async _onAddToBank(event) {
  }

  async _updateObject (event, formData) {
    const gm_bank = game.user.getFlag('earthland', 'GMBank')
    console.log("what is gm_bank? %o", gm_bank);
    console.log("What is form data? %o", formData);
    const new_bank = mergeObject(gm_bank, expandObject(formData))

    await game.user.setFlag('earthland', 'GMBank', new_bank)
  }

  async display() {
    await this.render(true)
  }

}
