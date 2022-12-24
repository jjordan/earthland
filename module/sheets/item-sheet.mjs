/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
import { times, getLength, objectMapValues, objectReindexFilter, objectFindValue, objectSome } from '../../lib/helpers.js'

export class earthlandItemSheet extends ItemSheet {

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["earthland", "sheet", "item"],
      width: 520,
      height: 480,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "attributes" }]
    });
  }

  /** @override */
  get template() {
    const path = "systems/earthland/templates/item";
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.html`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.html`.
    return `${path}/item-${this.item.type}-sheet.html`;
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    // Retrieve base data structure.
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = context.item;

    // Retrieve the roll data for TinyMCE editors.
    context.rollData = {};
    let actor = this.object?.parent ?? null;
    if (actor) {
      context.rollData = actor.getRollData();
    }

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.
    // Dynamic Dice Selectors
    html.find('.die-select').change(this._onDieChange.bind(this))
    html.find('.die-select').on('mouseup', this._onDieRemove.bind(this))
    html.find('.new-die').click(this._newDie.bind(this))
  }


  async _newDie (event) {
    console.log("in _newDie with event: %o", event);
    event.preventDefault();
    const $targetNewDie = $(event.currentTarget);
    const target = $targetNewDie.data('target');
    const currentDiceData = getProperty(this.item, target);
    const currentDice = currentDiceData?.value ?? {};
    const newIndex = getLength(currentDice);
    const newValue = currentDice[newIndex - 1] ?? '8';
    console.log("have target: %o", target);
    console.log("have new index: %o and new value: %o", newIndex, newValue);

    await this.item.update({
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
    const targetKey = $targetNewDie.data('key')
    const targetValue = $targetNewDie.val()
    const currentDiceData = getProperty(this.item, target)
    console.log("What is target? %o", target);

    const newValue = objectMapValues(currentDiceData.value ?? {}, (value, index) => parseInt(index, 10) === targetKey ? targetValue : value)

    await this._resetDataPoint(target, 'value', newValue)
  }


  async _onDieRemove (event) {
    event.preventDefault()

    if (event.button === 2) {
      const $target = $(event.currentTarget)
      const target = $target.data('target')
      const targetKey = $target.data('key')
      const currentDiceData = getProperty(this.item.data, target)

      const newValue = objectReindexFilter(currentDiceData.value ?? {}, (_, key) => parseInt(key, 10) !== parseInt(targetKey))

      await this._resetDataPoint(target, 'value', newValue)
    }
  }


  async _resetDataPoint(path, target, value) {
    await this.item.update({
      [`${path}.-=${target}`]: null
    })

    await this.item.update({
      [`${path}.${target}`]: value
    })
  }
}
