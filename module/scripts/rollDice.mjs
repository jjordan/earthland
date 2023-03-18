import { objectReduce } from '../../lib/helpers.js'
import { localizer } from './foundryHelpers.mjs'
import { getLength, objectFilter, objectMapValues, objectReindexFilter } from '../../lib/helpers.js'

const getAppendDiceContent = (data) => renderTemplate('systems/earthland/templates/partials/die-display.html', data)

const getRollFormula = (pool) => {
  return objectReduce(pool, (formula, traitGroup) => {
    const innerFormula = objectReduce(traitGroup || {}, (acc, trait) => [...acc, ...Object.values(trait.value || {})], [])
      .reduce((acc, value) => `${acc}+d${value}`, '')

    return formula ? `${formula}+${innerFormula}` : innerFormula
  }, '')
}

const getRollResults = async pool => {

  const rollFormula = getRollFormula(pool)

  const r = new Roll(rollFormula)

  const roll = await r.evaluate({ async: true })

  if (game.dice3d) {
    game.dice3d.showForRoll(r, game.user, true)
  }

  const rollResults = roll.dice
    .map(die => ({ faces: die.faces, result: die.results[0].result }))
    .reduce((acc, result) => {
      if (result.result > 1) {
        return { ...acc, results: [...acc.results, result] }
      }

      return { ...acc, hitches: [...acc.hitches, result] }
    }, { hitches: [], results: [] })

  rollResults.hitches.sort((a, b) => {
    return b.faces - a.faces
  })

  rollResults.results.sort((a, b) => {
    if (a.result !== b.result) {
      return b.result - a.result
    }

    return b.faces - a.faces
  })

  return rollResults
}

const markResultTotals = results => {
  results.sort((a, b) => {
    if (a.result !== b.result) {
      return b.result - a.result
    }

    return a.faces - b.faces
  })

  return results.reduce((acc, result) => {
    if (!result.effect && acc.count < 2) return { dice: [...acc.dice, { ...result, total: true }], count: acc.count + 1 }

    return { dice: [...acc.dice, result], count: acc.count }
  }, { dice: [], count: 0 }).dice
}

const markResultEffect = results => {
  results.sort((a, b) => {
    if (a.faces !== b.faces) {
      return b.faces - a.faces
    }

    return a.result - b.result
  })

  return results.reduce((acc, result) => {
    const hasEffectDie = acc.some(item => item.effect)
    if (!result.total && !hasEffectDie) return [...acc, { ...result, effect: true }]

    return [...acc, result]
  }, [])
}

const getDiceByEffect = results => {
  const effectMarkedResults = results.length > 2 ? markResultEffect(results) : results
  const finalResults = markResultTotals(effectMarkedResults)

  finalResults.sort((a, b) => {
    if (a.result !== b.result) {
      return b.result - a.result
    }

    return b.faces - a.faces
  })

  const total = finalResults.reduce((totalValue, result) => result.total ? totalValue + result.result : totalValue, 0)
  const targetEffectDie = finalResults.find(result => result.effect)
  const effectDice = targetEffectDie?.faces ? [targetEffectDie.faces] : []

  return { dice: finalResults, total, effectDice }
}

const getAllDice = results => {
  console.log("What are results? %o", results);
  const finalResults = markResultTotals(results)
  console.log("What are final results? %o", finalResults);
  finalResults.forEach(result => {
    result.total = true;
  });
  console.log("Did I set all results to be part of the total? %o", finalResults);
  const total = finalResults.reduce((totalValue, result) => result.total ? totalValue + result.result : totalValue, 0)

  return { dice: finalResults, total: total, effectDice: [] }
}

const getDiceByTotal = results => {
  const totalMarkedResults = markResultTotals(results)
  const finalResults = markResultEffect(totalMarkedResults)

  finalResults.sort((a, b) => {
    if (a.result !== b.result) {
      return b.result - a.result
    }

    return b.faces - a.faces
  })

  const total = finalResults.reduce((totalValue, result) => result.total ? totalValue + result.result : totalValue, 0)
  const targetEffectDie = finalResults.find(result => result.effect)
  const effectDice = targetEffectDie?.faces ? [targetEffectDie.faces] : []
  const result = { dice: finalResults, total, effectDice }
  console.log("what are results? %o", result);
  return result
}

const updateDice = async (html, dice) => {
  const $dice = html.find('.dice-box .result-die')

  $dice.each(function (index) {
    const $die = $(this)
    const targetDie = dice.dice[index]
    const $dieCpt = $die.find('.die-cpt')
    $die.removeClass('chosen result effect selected selectable')
    $dieCpt.removeClass('chosen-cpt unchosen-cpt effect-cpt selected-cpt')

    if (targetDie.total) {
      $die.addClass('chosen')
      $dieCpt.addClass('chosen-cpt')
    } else if (targetDie.effect) {
      $die.addClass('effect')
      $dieCpt.addClass('effect-cpt')
    } else {
      $die.addClass('result selectable')
      $dieCpt.addClass('unchosen-cpt')
    }
  })

  const $effectDiceContainer = html.find('.effect-dice')
  const $totalValue = html.find('.total-value')
  $totalValue.text(dice.total)

  $effectDiceContainer.find('.die-icon-wrapper')?.remove()
  const faces = dice.effectDice.length === 0 ? 4 : dice.effectDice[0]
  const index = dice.dice.findIndex(x => x.effect)

  const dieContent = await getAppendDiceContent({ default: dice.effectDice.length === 0, dieRating: faces, key: index, value: faces })
  $effectDiceContainer
    .append(dieContent)
}

const dicePicker = async rollResults => {
  const themes = game.settings.get('earthland', 'themes')
  const theme = themes.current === 'custom' ? themes.custom : themes.list[themes.current]
  const content = await renderTemplate('systems/earthland/templates/dialog/dice-picker.html', {
    rollResults,
    theme
  })

  return new Promise((resolve, reject) => {
    new Dialog({
      title: "Select Your Dice",
      content,
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: localizer('Confirm'),
          callback (html) {
            const $diceBox = html
              .find('.dice-box')

            const values = { dice: [], total: null, effectDice: [] }

            $diceBox
              .find('.result-die')
              .each(function () {
                const $die = $(this)
                const faces = $die.data('faces')
                const result = parseInt($die.data('result'), 10)
                const value = { effect: false, faces, result, total: false }

                if ($die.hasClass('chosen')) {
                  values.total = values.total ? values.total + result : result
                  value.total = true
                } else if ($die.hasClass('effect')) {
                  values.effectDice.push(faces)
                  value.effect = true
                }

                values.dice.push(value)
              })

            resolve(values)
          }
        }
      },
      default: 'confirm',
      render (html) {
        const $diceBox = html.find('.dice-box')
        const $addToTotal = html.find('.add-to-total')
        const $addToEffect = html.find('.add-to-effect')
        const $resetSelection = html.find('.reset-selection')
        const $effectDiceContainer = html.find('.effect-dice')

        const setSelectionOptionsDisableTo = (value) => {
          $addToTotal.prop('disabled', value ?? !$addToTotal.prop('disabled'))
          $addToEffect.prop('disabled', value ?? !$addToEffect.prop('disabled'))
        }

        const setSelectionDisable = () => {
          const $selectedDice = $diceBox.find('.selected')
          const $usedDice = $diceBox.find('.effect, .chosen')

          setSelectionOptionsDisableTo(!($selectedDice.length > 0))
          $resetSelection.prop('disabled', !($selectedDice.length > 0 || $usedDice.length > 0))
        }

        const setEffectDice = async (values, defaultValue = false) => {
          
          const effectDiceHtml = await Promise.all(values
            .map(async value => await getAppendDiceContent({ defaultValue, dieRating: value, value, type: 'effect' })))

          $effectDiceContainer
            .html(effectDiceHtml.join())
         }

        const setTotalValue = (value) => {
          html
            .find('.total-value')
            .text(value)
        }

        html
          .closest('.window-app.dialog')
          .find('.header-button.close')
          .click((event) => {
            event.preventDefault()

            const values = { dice: [], total: null, effectDice: [] }

            $diceBox
              .find('.result-die')
              .each(function () {
                const $die = $(this)
                const faces = $die.data('faces')
                const result = parseInt($die.data('result'), 10)
                const value = { effect: false, faces, result, total: false }

                values.dice.push(value)
              })

            resolve(values)
          })

        $diceBox.on('click', '.selectable', function () {
          const $target = $(this)

          $target.toggleClass('selected result')

          $target.find('.die-cpt').toggleClass('selected-cpt unchosen-cpt')

          setSelectionDisable()
        })

        $diceBox.on('click', '.effect', async function () {
          const $selectedDie = $(this)
          $selectedDie.toggleClass('result effect selectable')
          $selectedDie.find('.die-cpt').toggleClass('unchosen-cpt effect-cpt')
          const key = $selectedDie.data('key')

          const $targetEffectDie = $effectDiceContainer.find(`[data-key="${key}"]`)
          $targetEffectDie.remove()

          const $effectDice = $effectDiceContainer.find('.die-icon-wrapper')

          if ($effectDice.length === 0) {
            const dieContent = await getAppendDiceContent({ defaultValue: true, dieRating: '4', value: '4', type: 'effect' })

            $effectDiceContainer
              .append(dieContent)
          }

          setSelectionDisable()
        })

        $diceBox.on('click', '.chosen', function () {
          const $selectedDie = $(this)
          $selectedDie.toggleClass('chosen result selectable')
          $selectedDie.find('.die-cpt').toggleClass('chosen-cpt unchosen-cpt')
          const result = parseInt($selectedDie.data('result'), 10)
          const $totalValue = html.find('.total-value')
          const currentValue = parseInt($totalValue.text(), 10)
          $totalValue.text(currentValue - result)

          setSelectionDisable()
        })

        $effectDiceContainer.on('mouseup', '.die-icon-wrapper', async function (event) {
          if (event.button === 2) {
            const $dieWrapper = $(this)

            const key = $dieWrapper.data('key')

            const $resultDie = $diceBox.find(`.result-die[data-key="${key}"]`)

            $resultDie.toggleClass('effect result selectable')
            $resultDie.find('.die-cpt').toggleClass('effect-cpt unchosen-cpt')

            $dieWrapper.remove()

            const $diceWrappers = $effectDiceContainer.find('.die-icon-wrapper')

            if ($diceWrappers.length === 0) {
              const dieContent = await getAppendDiceContent({ dieRating: '4', value: '4', type: 'effect' })

              $effectDiceContainer
                .append(dieContent)
            }

            setSelectionDisable()
          }
        })

        $addToEffect
          .click(function () {
            const $diceForTotal = html.find('.result-die.selected')

            if ($diceForTotal.length > 0) {

              $effectDiceContainer.find('.default')?.remove()

              $diceForTotal.each(async function () {
                const $die = $(this)
                const faces = $die.data('faces')
                const key = $die.data('key')
                $die.toggleClass('selected effect selectable')
                $die.find('.die-cpt').toggleClass('selected-cpt effect-cpt')

                const dieContent = await getAppendDiceContent({ key, dieRating: faces, value: faces, type: 'effect' })

                $effectDiceContainer
                  .append(dieContent)
              })

              setSelectionDisable()
            }
          })

        $addToTotal
          .click(function () {
            const $diceForTotal = html.find('.result-die.selected')

            $diceForTotal.each(function () {
              const $die = $(this)
              $die.toggleClass('chosen selected selectable')
              $die.find('.die-cpt').toggleClass('chosen-cpt selected-cpt')
              const result = parseInt($die.data('result'), 10)
              const $totalValue = html.find('.total-value')
              const currentValue = parseInt($totalValue.text(), 10)
              $totalValue.text(result + currentValue)
            })

            setSelectionDisable()
          })

        html
          .find('.select-by-effect')
          .click(function () {
            const dice = getDiceByEffect(rollResults.results)

            updateDice(html, dice)

            setSelectionDisable()
          })

        html
          .find('.select-by-total')
          .click(function () {
            const dice = getDiceByTotal(rollResults.results)

            updateDice(html, dice)

            setSelectionDisable()
          })

        $resetSelection
          .click(function () {
            $diceBox
              .find('.selected, .effect, .chosen')
              .each(function () {
                const $target = $(this)

                $target.removeClass('chosen effect selected')
                $target.addClass('result selectable')

                $target
                  .find('.die-cpt')
                  .removeClass('chosen-cpt effect-cpt selected-cpt')
                  .addClass('unchosen-cpt')
              })

            setTotalValue(0)
            setEffectDice([4], true)

            setSelectionOptionsDisableTo(true)
            $(this).prop('disabled', true)
          })
      }
    }, { jQuery: true, classes: ['dialog', 'dice-picker', 'dice-pool'] }).render(true)
  })
}

const  chat_message = (content) => {
    let game_master = game.users.find( u => u.isGM );
    console.log("sending message to gm: %o", game_master);
    let chatData = {
      user: game_master,
      speaker: game_master,
      content: content,
      type: CONST.CHAT_MESSAGE_TYPES.OTHER
    };
    let message = ChatMessage.create(chatData);
    return message;
  }


const addMPFromHindrance = async (actor_id) => {
  let actor = await Actor.get(actor_id);
  const actor_mp = actor.system.magic.value;
  const new_mp = actor_mp + 1;
  const updated = await actor.update({
    data: {
      magic: {
        value: new_mp
      }
    }
  });
  if(!!updated) {
    chat_message( `Character ${actor.name} awarded 1 MP for Hindrance roll.` )
  } else {
    ui.notifications.error( `Couldn't update resources for actor ${actor.name} (mp: ${required_mp})` );
    return false;
  }
}

const removeCostsFromPool = async (pool) => {
  console.log("got to here in removeCostsFromPool");
  // basically we're going to return a new pool without the costs
  const new_pool = {};
  const costs_by_actor_id = {};
  const charges_by_item_id = {};
  for (const [source, value] of Object.entries(pool)) {
    new_pool[source] = {};
    for (const [index, object] of Object.entries(value)) {
      console.log("What is object? %o", object);
      if ((object.type == 'trait') || (object.type == 'difficulty') || (object.type == 'custom')) {
        new_pool[source][index] = object;
        if (object.label.match(/hindrance/i) && object.actor_id) {
          addMPFromHindrance(object.actor_id);
        }
      } else if (object.type == 'cost') {
        costs_by_actor_id[object.actor_id] = object;
      } else if (object.type == 'charge') {
        charges_by_item_id[object.item_id] = object;
      }
    }
  }
  console.log("costs by actor id: %o", costs_by_actor_id);
  // eventually collect the costs from each actor
  for (const [actor_id, object] of Object.entries(costs_by_actor_id)) {
    console.log("Actor id: %o", actor_id);
    let actor = await Actor.get(actor_id);
    if(!!actor) {
      console.log("Found actor");
      if( game.user.isGM ) { // pull the MP from the bank
        console.log("GM User");
        const actor_en = actor.system.energy.value;
        const gm_bank = game.user.getFlag('earthland', 'GMBank');
        const currentDice = gm_bank.pool;
        const actor_mp = getLength(currentDice ?? {});

        // collate all of the costs
        const required_en = Object.values(object.value).filter(n => n == 'en').length
        const required_mp = Object.values(object.value).filter(n => n == 'mp').length
        console.log("required en: %o, required mp: %o", required_en, required_mp);
        const error_messages = [];
        if (actor_en < required_en) {
          required_mp += 1; // if we don't have enough energy, use MP instead
          required_en = 0; // set to zero so we don't set negative EN
        }
        if (actor_mp < required_mp) {
          error_messages.push( `Magic (${actor_mp})` );
        }
        if (error_messages.length > 0) {
          const messages = error_messages.join(' or ');
          ui.notifications.error( `${actor.name} does not have enough ${messages} to use ${object.label}` );
          return false;
        } else {
          game.earthland.GMBank.useMP(required_mp);
          if (required_en > 0) {
            const new_energy = actor_en - required_en;
            const updated = await actor.update({
              data: {
                energy: {
                  value: new_energy
                }
              }
            });
            if(!updated) {
              ui.notifications.error( `Couldn't update resources for actor ${actor.name} (mp: ${required_mp}) (en: ${required_en})` );
              return false;
            }
          }
        }
      } else if(actor.isOwner) {
        const actor_en = actor.system.energy.value;
        const actor_mp = actor.system.magic.value;
        // collate all of the costs
        const required_en = Object.values(object.value).filter(n => n == 'en').length
        const required_mp = Object.values(object.value).filter(n => n == 'mp').length
        console.log("required en: %o, required mp: %o", required_en, required_mp);
        const error_messages = [];
        if (actor_en < required_en) {
          error_messages.push( `Energy (${actor_en})` );
        }
        if (actor_mp < required_mp) {
          error_messages.push( `Magic (${actor_mp})` );
        }
        if (error_messages.length > 0) {
          const messages = error_messages.join(' or ');
          ui.notifications.error( `${actor.name} does not have enough ${messages} to use ${object.label}` );
          return false;
        } else {
          const new_energy = actor_en - required_en;
          const new_magic = actor_mp - required_mp;
          console.log("new energy: %o, new magic: %o", new_energy, new_magic);
          const updated = await actor.update({
            data: {
              magic: {
                value: new_magic
              },
              energy: {
                value: new_energy
              }
            }
          });
          if(!updated) {
            ui.notifications.error( `Couldn't update resources for actor ${actor.name} (mp: ${required_mp}) (en: ${required_en})` );
            return false;
          }
        }
      } else {
        ui.notifications.error("Can't currently support paying costs with characters you don't own.");
        return false;
      }
    } else {
      ui.notifications.error(`Couldn't find actor for ${object.label}`);
      return false;
    }
  }
  // collect the charges from the item
  for (const [item_id, object] of Object.entries(charges_by_item_id)) {
    console.log("Actor id: %o", object.actor_id);
    let actor = await Actor.get(object.actor_id);
    if(!!actor) {
      if(actor.isOwner) {
        const item = actor.getEmbeddedDocument("Item", object.item_id);
        if (!!item) {
          const current_charges = item.system.current_charges;
          const charge_cost = item.system.charge_cost;
          if (current_charges >= charge_cost) {
            const new_charges = current_charges - charge_cost;
            let updated;
            console.log("new charges: %o", new_charges);
            if ((new_charges == 0) && (item.system.destroyed_when_empty)) {
              // remove the item from the actor if new_charges is 0
              // and the item is destroyed if no charges
              updated = await actor.deleteEmbeddedDocuments("Item", [item.id]);
            } else {
              // do not destroy the item
              updated = await item.update({
                data: {
                  current_charges: new_charges
                }
              });
            }
            if(!updated) {
              ui.notifications.error( `Couldn't update resources for item ${item.name} to new current charges (${new_charges})` );
              return false;
            }

          } else {
            return ui.notifications.error(`Item ${item.name} does not have enough charges (${current_charges}) to pay the cost (${charge_cost})`);
          }

        } else {
          // error that we couldn't get the item
          return ui.notifications.error(`Couldn't find the item with id: ${object.item_id}`);
        }
      } else {
        // error that we can't extract charges from items that other characters own
        return ui.notifications.error(`Can't extract charges from objects you don't own.`);
      }
    } else {
      // error that we couldn't get the actor
      return ui.notifications.error(`Couldn't find the actor with id: ${object.actor_id}`);
    }
  }
  return new_pool;
}

export default async function (pool, rollType, name) {
  // remove costs from the pool, so we can extract them from the appropriate actors,
  // and add the cost counters back to the template after the roll
  console.log("What is pool name? %o", name);
  const new_pool = await removeCostsFromPool(pool);
  console.log("What is the pool? %o", new_pool);
  const rollResults = await getRollResults(new_pool)
  console.log("What are rollResults? %o", rollResults);
  const themes = game.settings.get('earthland', 'themes')
  const theme = themes.current === 'custom' ? themes.custom : themes.list[themes.current]
  const sourceDefaultCollapsed = game.settings.get('earthland', 'rollResultSourceCollapsed')

  await this?._clearDicePool()

  // const selectedDice = rollType === 'total'
  //   ? getDiceByTotal(rollResults.results)
  //   : rollType === 'effect'
  //     ? getDiceByEffect(rollResults.results)
  //     : await dicePicker(rollResults)

  let selectedDice;

  if (rollType === 'total') {
    selectedDice = getDiceByTotal(rollResults.results)
  } else if (rollType === 'effect') {
    selectedDice = getDiceByEffect(rollResults.results)
  } else if (rollType === 'all') {
    selectedDice = getAllDice(rollResults.results)
  } else {
    selectedDice = await dicePicker(rollResults);
  }

  const content = await renderTemplate('systems/earthland/templates/chat/roll-result.html', {
    name: name,
    dicePool: pool,
    effectDice: selectedDice.effectDice,
    rollResults: { hitches: rollResults.hitches, results: selectedDice.dice },
    speaker: game.user,
    sourceDefaultCollapsed,
    theme,
    total: selectedDice.total
  })

  await ChatMessage.create({ content })
}
