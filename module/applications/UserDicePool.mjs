import { localizer } from '../scripts/foundryHelpers.mjs'
import { getLength, objectFilter, objectMapValues, objectReindexFilter } from '../../lib/helpers.js'
import rollDice from '../scripts/rollDice.mjs'

const blankPool = {
  itemid: {},
  name: '',
  changed: { value: true },
  customAdd: {
    label: '',
    value: { 0: '8' }
  },
  pool: {},
  draggable: {}
}

export class UserDicePool extends FormApplication {
  constructor() {
    super()
    let userDicePool = game.user.getFlag('earthland', 'dicePool')

    if (!userDicePool) {
      userDicePool = blankPool
    }

    this.dicePool = userDicePool
    this.name = userDicePool.name
    this._onDragStart = this._onDragStart.bind(this);
    this._onDragDrop = this._onDragDrop.bind(this);
    this.data = {test: 1};
    this.system = {test: 2};
  }

  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      id: 'user-dice-pool',
      template: 'systems/earthland/templates/other/dice-pool.html',
      title: localizer('DicePool'),
      classes: ['dice-pool', 'user-dice-pool'],
      width: 750,
      height: 'auto',
      top: 500,
      left: 20,
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
    console.log("in UserDicePool getData");
    const dice = game.user.getFlag('earthland', 'dicePool')
    console.log("Have dicepool: %o", dice);
    let items = [];
    let draggable = {value: false};
    let changed = dice.changed;
    if (!!dice.itemid && dice.itemid.value != '') {
      const actor_ids = this._findActorIdsForPool(dice.pool);
      if (actor_ids.length == 1) {
        let actor = game.actors.get(actor_ids[0]);
        let item = await actor.getEmbeddedDocument('Item', dice.itemid.value);
        console.log("Got item: %o", item);
        if(!!item) {
          items.push( item );
          draggable.value = false; // Setting to false so confusing draggable button doesn't appear
        } else {
          let value;
          setProperty(dice, `itemid`, { value });
        }
      }
    }
    console.log("have items: %o", items);
    const themes = game.settings.get('earthland', 'themes')
    const theme = themes.current === 'custom' ? themes.custom : themes.list[themes.current]
    return { ...dice, theme, items, draggable, changed }
  }

  async _updateObject (event, formData) {
    const currentDice = game.user.getFlag('earthland', 'dicePool')
    const newDice = mergeObject(currentDice, expandObject(formData))

    await game.user.setFlag('earthland', 'dicePool', newDice)
  }

  activateListeners (html) {
    html.find('.add-trait-to-pool').click(this._addCustomTraitToPool.bind(this))
    html.find('.clear-dice-pool').click(this._clearDicePool.bind(this))
    html.find('.new-die').click(this._onNewDie.bind(this))
    html.find('.custom-dice-label').change(this.submit.bind(this))
    html.find('.die-select').change(this._onDieChange.bind(this))
    html.find('.die-select').on('mouseup', this._onDieRemove.bind(this))
    html.find('.remove-pool-trait').click(this._removePoolTrait.bind(this))
    html.find('.reset-custom-pool-trait').click(this._resetCustomPoolTrait.bind(this))
    html.find('.roll-dice-pool').click(this._rollDicePool.bind(this))
    html.find('.clear-source').click(this._clearSource.bind(this))
    html.find('.remove-pool-cost').click(this._removeCostFromPool.bind(this));
    html.find('.dice-pool-name').change(this._changeName.bind(this))
    html.find('.make-dice-pool-item').click(this._makeDicePoolItem.bind(this));
  }

  _findActorIdsForPool(pool) {
    const actor_ids = {};
    for (const [source, value] of Object.entries(pool)) {
      for (const [index, object] of Object.entries(value)) {
        actor_ids[object.actor_id] = 1
      }
    }
    return Object.keys(actor_ids);
  }

  async _makeDicePoolItem (event) {
    // look for actor IDs
    const currentDice = game.user.getFlag('earthland', 'dicePool')
    const actor_ids = this._findActorIdsForPool(currentDice.pool);
    // if we only find 1, we're good
    if (actor_ids.length == 1) {
      // create a new Dicepool item for the actor from the ID
      const actor = game.actors.get(actor_ids[0]);
      const pool = JSON.stringify(currentDice.pool)
      console.log("About to save pool: %o", pool);
      let items;
      if (currentDice.itemid.value) {
        console.log("Saving dicepool: %o, %o, %o", currentDice.name.value, currentDice.itemid.value, pool);
        items = await actor.updateEmbeddedDocuments('Item', [{
          name: currentDice.name.value,
          type: 'dicepool',
          id: currentDice.itemid.value,
          _id: currentDice.itemid.value,
          system: {
            pool: pool,
            timestamp: Date.now()
          }
        }]);
      } else {
        console.log("Creating new dicepool");
        items = await actor.createEmbeddedDocuments('Item', [{
          name: currentDice.name.value,
          type: 'dicepool',
          system: {
            pool: pool,
            timestamp: Date.now()
          }
        }]);
      }
      console.log("Got items: %o", items);
      if (items.length > 0) {
        let value = items[0].id
        setProperty(currentDice, `itemid`, { value });
        setProperty(currentDice, `changed`, { value: false });
        setProperty(currentDice, `draggable`, { value: true });
        console.log("Got currentDice: %o", currentDice);
        await this.render(true)
        return items[0].id;
      } else {
        ui.notifications.error( `Could not create or update DicePool item from dice pool.` );
      }
      // somehow add that item to the dicepool???
    } else if (Object.keys(actor_ids).length > 1) {
      // if we find more than 1, raise error
      ui.notifications.error( `There is more than one actor's data in the pool, can't make DicePool item.` );
    } else {
      // if we find less than 1, also raise error
      ui.notifications.error( `Can't find Actor ID in the pool, can't make DicePool item.` );
    }
  }

  async _changeName (event) {
    event.preventDefault();
    const $target = $(event.currentTarget);
    const value = $target.val();
    console.log("got target: %o, and value: %o", $target, value);
    const currentDice = game.user.getFlag('earthland', 'dicePool')
    if (!!value) {
      setProperty(currentDice, `name`, { value })
      setProperty(currentDice, `changed`, { value: true });
    }
    await game.user.setFlag('earthland', 'dicePool', null)
    await game.user.setFlag('earthland', 'dicePool', currentDice)

    await this.render(true)
  }

  async initPool () {
    await game.user.setFlag('earthland', 'dicePool', null)
    await game.user.setFlag('earthland', 'dicePool', this.dicePool)
  }

  // value { en: 1, mp: 2 } // 1 energy and 2 magic points required
  async _addCostToPool (source, label, value, actor_id) {
    console.log("in _addCostFromPool with source (%o) label (%o) value (%o)", source, label, value);
    const currentDice = game.user.getFlag('earthland', 'dicePool')
    const currentPoolLength = getLength(currentDice.pool[source] || {})
    const type = 'cost';
    setProperty(currentDice, `pool.${source}.${currentPoolLength}`, { label, value, type, actor_id })
    setProperty(currentDice, `changed`, { value: true });

    console.log("Have currentDice: %o", currentDice);

    await game.user.setFlag('earthland', 'dicePool', null)

    await game.user.setFlag('earthland', 'dicePool', currentDice)

    await this.render(true)
  }

  async _removeCostFromPool (event) {
    console.log("in _removeCostFromPool");
    event.preventDefault();
    const $target = $(event.currentTarget);
    const source = $target.data('source');
    let currentDice = game.user.getFlag('earthland', 'dicePool');

    delete currentDice.pool[source][$target.data('key')];
    setProperty(currentDice, `changed`, { value: true });

    await game.user.setFlag('earthland', 'dicePool', null);
    await game.user.setFlag('earthland', 'dicePool', currentDice);

    this.render(true);
  }

  // value { ch: 1 } // 1 charge consumed
  async _addChargeToPool (source, label, value, actor_id, item_id) {
    console.log("in _addChargeToPool with source (%o) label (%o) value (%o)", source, label, value);
    const currentDice = game.user.getFlag('earthland', 'dicePool')
    const currentPoolLength = getLength(currentDice.pool[source] || {})
    const type = 'charge';
    setProperty(currentDice, `pool.${source}.${currentPoolLength}`, { label, value, type, actor_id, item_id });
    setProperty(currentDice, `changed`, { value: true });

    console.log("Have currentDice: %o", currentDice);

    await game.user.setFlag('earthland', 'dicePool', null);

    await game.user.setFlag('earthland', 'dicePool', currentDice);

    await this.render(true)
  }

  async _addCustomTraitToPool (event) {
    event.preventDefault()

    const currentDice = game.user.getFlag('earthland', 'dicePool')
    const currentCustomLength = getLength(currentDice.pool.custom ?? {})

    setProperty(currentDice, `pool.custom.${currentCustomLength}`, currentDice.customAdd)

    setProperty(currentDice, `customAdd`, {
      label: '',
      value: { 0: '8' }
    })
    setProperty(currentDice, `changed`, { value: true });

    await game.user.setFlag('earthland', 'dicePool', null)

    await game.user.setFlag('earthland', 'dicePool', currentDice)

    await this.render(true)
  }

  async _addTraitToPool (source, label, value, actor_id) {
    console.log("in _addTraitToPool with source (%o) label (%o) value (%o), actorid: %o", source, label, value, actor_id);
    const currentDice = game.user.getFlag('earthland', 'dicePool')

    const currentDiceLength = getLength(currentDice.pool[source] || {})
    const type = 'trait'
    setProperty(currentDice, `pool.${source}.${currentDiceLength}`, { label, value, type, actor_id })
    setProperty(currentDice, `changed`, { value: true });

    console.log("Have currentDice: %o", currentDice);

    await game.user.setFlag('earthland', 'dicePool', null)

    await game.user.setFlag('earthland', 'dicePool', currentDice)

    await this.render(true)
  }

  async _clearDicePool (event) {
    if (event) event.preventDefault()

    await game.user.setFlag('earthland', 'dicePool', null)

    await game.user.setFlag('earthland', 'dicePool', blankPool)

    await this.render(true)
  }

  async _clearSource (event) {
    event.preventDefault()
    const { source } = event.currentTarget.dataset
    const currentDice = game.user.getFlag('earthland', 'dicePool')

    await game.user.setFlag('earthland', 'dicePool', null)

    currentDice.pool = objectFilter(currentDice.pool, (_, dieSource) => source !== dieSource)
    setProperty(currentDice, `changed`, { value: true });

    await game.user.setFlag('earthland', 'dicePool', currentDice)

    await this.render(true)
  }

  async _onDieChange (event) {
    event.preventDefault()
    const currentDice = game.user.getFlag('earthland', 'dicePool')
    const $targetDieSelect = $(event.currentTarget)
    const target = $targetDieSelect.data('target')
    const targetKey = $targetDieSelect.data('key')
    const targetValue = $targetDieSelect.val()
    const dataTargetValue = getProperty(currentDice, `${target}.value`) || {}

    await this.submit()

    await game.user.setFlag('earthland', 'dicePool', null)

    setProperty(currentDice, `${target}.value`, objectMapValues(dataTargetValue, (value, index) => parseInt(index, 10) === parseInt(targetKey, 10) ? targetValue : value))
    setProperty(currentDice, `changed`, { value: true });

    await game.user.setFlag('earthland', 'dicePool', currentDice)

    await this.render(true)
  }

  async _onDieRemove (event) {
    event.preventDefault()

    if (event.button === 2) {
      const currentDice = game.user.getFlag('earthland', 'dicePool')
      const $targetDieSelect = $(event.currentTarget)
      const target = $targetDieSelect.data('target')
      const targetKey = $targetDieSelect.data('key')
      const dataTargetValue = getProperty(currentDice, `${target}.value`) || {}

      await this.submit()

      await game.user.setFlag('earthland', 'dicePool', null)

      setProperty(currentDice, `${target}.value`, objectReindexFilter(dataTargetValue, (_, index) => parseInt(index, 10) !== parseInt(targetKey, 10)))
      setProperty(currentDice, `changed`, { value: true });

      await game.user.setFlag('earthland', 'dicePool', currentDice)

      await this.render(true)
    }
  }

  async _onNewDie (event) {
    event.preventDefault()
    const currentDice = game.user.getFlag('earthland', 'dicePool')
    const $targetNewDie = $(event.currentTarget)
    const target = $targetNewDie.data('target')
    const dataTargetValue = getProperty(currentDice, `${target}.value`) || {}
    const currentLength = getLength(dataTargetValue)
    const lastValue = dataTargetValue[currentLength - 1] || '8'

    setProperty(currentDice, `${target}.value`, { ...dataTargetValue, [currentLength]: lastValue })
    setProperty(currentDice, `changed`, { value: true });

    await game.user.setFlag('earthland', 'dicePool', null)

    await game.user.setFlag('earthland', 'dicePool', currentDice)

    await this.render(true)
  }

  async _removePoolTrait (event) {
    event.preventDefault()
    const $target = $(event.currentTarget)
    const source = $target.data('source')
    let currentDicePool = game.user.getFlag('earthland', 'dicePool')

    if (getLength(currentDicePool.pool[source] || {}) < 2) {
      delete currentDicePool.pool[source]
    } else {
      delete currentDicePool.pool[source][$target.data('key')]
      currentDicePool.pool[source] = objectReindexFilter(currentDicePool.pool[source], (_, index) => parseInt(index, 10) !== parseInt($target.data('key'), 10))
    }
    setProperty(currentDicePool, `changed`, { value: true });

    await game.user.setFlag('earthland', 'dicePool', null)
    await game.user.setFlag('earthland', 'dicePool', currentDicePool)

    this.render(true)
  }

  async _resetCustomPoolTrait (event) {
    event.preventDefault()

    const currentDice = game.user.getFlag('earthland', 'dicePool')

    setProperty(currentDice, 'customAdd', {
      label: '',
      value: { 0: '8' }
    })
    setProperty(currentDice, `changed`, { value: true });

    await game.user.setFlag('earthland', 'dicePool', null)

    await game.user.setFlag('earthland', 'dicePool', currentDice)

    await this.render(true)
  }

  async _setPool (pool, value, itemid=null) {
    console.log("in _setPool with pool: %o and value: %o and itemid: %o", pool, value, itemid);
    const currentDice = game.user.getFlag('earthland', 'dicePool')

    setProperty(currentDice, 'pool', pool)

    if (!!value) {
      setProperty(currentDice, `name`, { value })
    }
    if (!!itemid) {
      setProperty(currentDice, `itemid`, { value: itemid })
    }
    setProperty(currentDice, `changed`, { value: false });
    console.log("Got pool: %o", currentDice);
    await game.user.setFlag('earthland', 'dicePool', null)

    await game.user.setFlag('earthland', 'dicePool', currentDice)

    await this.render(true)
  }

  async _rollDicePool (event) {
    event.preventDefault()
    const $target = $(event.currentTarget)

    const currentDicePool = game.user.getFlag('earthland', 'dicePool')

    const dicePool = currentDicePool.pool
    const name = currentDicePool.name
    console.log("What is currentDicePool? %o", dicePool);

    let rollType = 'select';

    if ($target.hasClass('roll-for-total')) {
      rollType = 'total';
    } else if ($target.hasClass('roll-for-effect')) {
      rollType = 'effect';
    } else if ($target.hasClass('roll-all')) {
      rollType = 'all';
    }

    await rollDice.call(this, dicePool, rollType, name)
  }

  async toggle () {
    if (!this.rendered) {
      await this.render(true)
    } else {
      this.close()
    }
  }

  async _onDragStart(event) {
    console.log("in _onDragStart()");
    return {data: 1};
  }

  async _onDragDrop(event){
    console.log("UserDicePool _onDragDrop called");
    return {data: 2};
  }

  async _onDragOver(event) {
    console.log("UserDicePool _onDragOver called");
    return {data: 5};
  }

  async _onDrop(event){
    console.log("UserDicePool _onDrop called");
    return {data: 3};
  }

  async _handleDrop(event) {
    console.log("UserDicePool _handleDrop called");
    return {data: 4};
  }
}
