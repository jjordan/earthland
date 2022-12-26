import { localizer } from '../scripts/foundryHelpers.mjs'
import { getLength, objectFilter, objectMapValues, objectReindexFilter } from '../../lib/helpers.js'
import rollDice from '../scripts/rollDice.mjs'

const blankPool = {
  name: '',
  customAdd: {
    label: '',
    value: { 0: '8' }
  },
  pool: {}
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
  }

  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      id: 'user-dice-pool',
      template: 'systems/earthland/templates/other/dice-pool.html',
      title: localizer('DicePool'),
      classes: ['dice-pool', 'user-dice-pool'],
      width: 600,
      height: 'auto',
      top: 500,
      left: 20,
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: true,
      submitOnChange: true
    })
  }

  async getData () {
    const dice = game.user.getFlag('earthland', 'dicePool')
    const themes = game.settings.get('earthland', 'themes')
    const theme = themes.current === 'custom' ? themes.custom : themes.list[themes.current]
    return { ...dice, theme }
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
  }

  async _changeName (event) {
    event.preventDefault();
    const $target = $(event.currentTarget);
    const value = $target.val();
    console.log("got target: %o, and value: %o", $target, value);
    const currentDice = game.user.getFlag('earthland', 'dicePool')
    if (!!value) {
      setProperty(currentDice, `name`, { value })
    }
    await game.user.setFlag('earthland', 'dicePool', null)
    await game.user.setFlag('earthland', 'dicePool', currentDice)

    await this.render(true)
  }

  async initPool () {
    await game.user.setFlag('earthland', 'dicePool', null)
    await game.user.setFlag('earthland', 'dicePool', this.dicePool)
  }

  // value { energy: 0, mp: 0 }
  async _addCostToPool (source, label, value, actor_id) {
    console.log("in _addCostFromPool with source (%o) label (%o) value (%o)", source, label, value);
    const currentPool = game.user.getFlag('earthland', 'dicePool')
    const currentPoolLength = getLength(currentPool.pool[source] || {})
    const type = 'cost';
    setProperty(currentPool, `pool.${source}.${currentPoolLength}`, { label, value, type, actor_id })

    console.log("Have currentPool: %o", currentPool);

    await game.user.setFlag('earthland', 'dicePool', null)

    await game.user.setFlag('earthland', 'dicePool', currentPool)

    await this.render(true)
  }

  async _removeCostFromPool (event) {
    console.log("in _removeCostFromPool");
    event.preventDefault()
    const $target = $(event.currentTarget)
    const source = $target.data('source')
    let currentDicePool = game.user.getFlag('earthland', 'dicePool')

    delete currentDicePool.pool[source][$target.data('key')];

    await game.user.setFlag('earthland', 'dicePool', null)
    await game.user.setFlag('earthland', 'dicePool', currentDicePool)

    this.render(true);
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

    console.log("Have currentPool: %o", currentDice);

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

    await game.user.setFlag('earthland', 'dicePool', null)

    await game.user.setFlag('earthland', 'dicePool', currentDice)

    await this.render(true)
  }

  async _setPool (pool, value) {
    console.log("in _setPool with pool: %o and value: %o", pool, value);
    const currentDice = game.user.getFlag('earthland', 'dicePool')

    setProperty(currentDice, 'pool', pool)

    if (!!value) {
      setProperty(currentDice, `name`, { value })
    }
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

    const rollType = $target.hasClass('roll-for-total')
      ? 'total'
      : $target.hasClass('roll-for-effect')
        ? 'effect'
        : 'select'

    await rollDice.call(this, dicePool, rollType, name)
  }

  async toggle () {
    if (!this.rendered) {
      await this.render(true)
    } else {
      this.close()
    }
  }
}
