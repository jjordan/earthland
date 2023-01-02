import rollDice from '../scripts/rollDice.mjs'
import { localizer } from '../scripts/foundryHelpers.mjs'
import { getLength, objectReindexFilter } from '../../lib/helpers.js';

export class Difficulty extends FormApplication {
  constructor() {
    super()
    this.difficulty_levels = {
      trivial:           {
          value: {
              0: 2,
              1: 2
          }
      },
      very_easy:         {
          value: {
              0: 4,
              1: 4
          }
      },
      easy:              {
          value: {
              0: 6,
              1: 6
          }
      },
      challenging:       {
          value: {
              0: 8,
              1: 8
          }
      },
      hard:              {
          value: {
              0: 10,
              1: 10
          }
      },
      very_hard:         {
          value: {
              0: 12,
              1: 12
          }
      },
      almost_impossible: {
          value: {
              0: 20,
              1: 20
          }
      }
    };
  }

  static get defaultOptions () {
    return mergeObject(super.defaultOptions, {
      id: 'difficulty',
      template: 'systems/earthland/templates/other/difficulty.html',
      title: localizer('Difficulty'),
      classes: ['difficulty', 'difficulty-table'],
      width: 450,
      height: 'auto',
      top: 0,
      left: 500,
      resizable: true,
      closeOnSubmit: false,
      submitOnClose: false,
      submitOnChange: true
    })
  }

  async getData () {
    return { difficulty_levels: this.difficulty_levels };
  }

  activateListeners (html) {
    html.find('.add-to-pool').click(this._addDifficultyToDicePool.bind(this))
    html.find('.roll-directly').click(this._rollDifficulty.bind(this))

    // Dynamic Dice Selectors
    html.find('.die-select').change(this._onDieChange.bind(this))
    html.find('.die-select').on('mouseup', this._onDieRemove.bind(this))
    html.find('.new-die').click(this._onNewDie.bind(this))
  }

  async _onDieChange (event) {
    event.preventDefault()
    const $targetDieSelect = $(event.currentTarget)
    const target = $targetDieSelect.data('target')
    const key = $targetDieSelect.data('key')
    const value = $targetDieSelect.val()

    const currentDiceData = this.difficulty_levels[target];
    const currentDice = currentDiceData.value;

    currentDice[key] = value;

    await this.render(true)
  }

  async _onDieRemove (event) {
    event.preventDefault()

    if (event.button === 2) {
      const $targetDieSelect = $(event.currentTarget)
      const target = $targetDieSelect.data('target')
      const targetKey = $targetDieSelect.data('key')
      const currentDiceData = this.difficulty_levels[target];

      const newValue = objectReindexFilter(currentDiceData.value ?? {}, (_, key) => parseInt(key, 10) !== parseInt(targetKey))

      currentDiceData.value = newValue;
      await this.render(true)
    }
  }

  async _onNewDie (event) {
    event.preventDefault()

    const $targetNewDie = $(event.currentTarget)
    const target = $targetNewDie.data('target')
    const currentDiceData = this.difficulty_levels[target];
    const currentDice = currentDiceData?.value ?? {};
    const newIndex = getLength(currentDice);
    const newValue = currentDice[newIndex - 1] ?? '8';

    currentDice[newIndex] = newValue;

    await this.render(true)
  }

  async _addDifficultyToDicePool(event) {
    event.preventDefault();
    // get dice from target
    const element = event.currentTarget;
    const dataset = element.dataset;
    const target = dataset.target;
    const level = localizer(target);
    const label = `Difficulty [${level}]`;

    const dice = this.difficulty_levels[target].value;

    // add dice to pool
    game.earthland.UserDicePool._addDifficultyToPool(game.user.name, label, dice)
  }

  async _rollDifficulty(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const target = dataset.target;
    const level = localizer(target);
    const label = `Difficulty [${level}]`;

    const dice = this.difficulty_levels[target].value;
    // TODO: conver this to pulling the constant from UserDicePool:
    const pool = {};
    pool[game.user.name] = {};
    pool[game.user.name]['0'] = {};
    pool[game.user.name]['0']['label'] = label;
    pool[game.user.name]['0']['type'] = 'difficulty';
    pool[game.user.name]['0']['value'] = dice;
    rollDice.call(this, pool, 'total');
  }

  async _clearDicePool (event) {
    // no-op for interface with rollDice.call above
  }


  async display() {
    await this.render(true)
  }
}
