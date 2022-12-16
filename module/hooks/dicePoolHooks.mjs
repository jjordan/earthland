import { UserDicePool } from '../applications/UserDicePool.mjs'
import { localizer, setCssVars } from '../scripts/foundryHelpers.mjs'
import rollDice from '../scripts/rollDice.mjs'

export default () => {
  Hooks.once('diceSoNiceReady', dice3d => {
    dice3d.addSystem({ id: 'cp-pp', name: 'Cortex Prime Plot Point' }, false)
    const ppLabel = 'systems/earthland/assets/plot-point/plot-point.png'
    dice3d.addDicePreset({
      type: 'dp',
      labels: [ppLabel, ppLabel],
      system: 'standard',
      colorset: 'bronze'
    }, 'd2')
  })

  Hooks.on('ready', async () => {
    game.earthland.UserDicePool = new UserDicePool()
    await game.earthland.UserDicePool.initPool()
  })

  Hooks.on('renderChatMessage', async (message, html, data) => {
    const $rollResult = html.find('.roll-result').first()

    if ($rollResult) {
      const $chatMessage = $rollResult.closest('.chat-message')

      $chatMessage
        .addClass('roll-message')
        .prepend('<div class="message-background"></div><div class="message-image"></div>')

      const $messageHeader = $chatMessage.find('.message-header').first()

      $messageHeader.children().wrapAll('<div class="message-header-content"></div>')
      $messageHeader.prepend('<div class="message-header-image"></div><div class="message-header-background"></div>')

      const $dice = $rollResult.find('.die')

      for await (const die of $dice) {
        const $die = $(die)
        const data = $die.data()

        const { dieRating, type, value: number } = data

        const html = await renderTemplate(`systems/earthland/templates/partials/dice/d${dieRating}.html`, {
          type,
          number
        })
        $die.html(html)
      }

      html
        .find('.source-header')
        .click(function () {
          const $source = $(this)
          $source
            .find('.fa')
            .toggleClass('fa-chevron-down fa-chevron-up')
          $source
            .siblings('.source-content')
            .toggleClass('hide')
        })

      const getPool = html => {
        return html.find('.source').get().reduce((sources, source) => {
          const $source = $(source)
          return {
            ...sources,
            [$source.data('source')]: $source
              .find('.dice-tag')
              .get()
              .reduce((dice, die, dieIndex) => {
                const $die = $(die)
                return {
                  ...dice,
                  [dieIndex]: {
                    label: $die.data('label'),
                    value: $die.find('.die').get()
                      .reduce((diceValues, dieValue, dieValueIndex) => {
                        return {
                          ...diceValues,
                          [dieValueIndex]: $(dieValue).data('die-rating')
                        }
                      }, {})
                  }
                }
              }, {})
          }
        }, {})
      }
      $rollResult.find('.re-roll').click(async (event) => {
        event.preventDefault()
        const pool = getPool($rollResult)
        await rollDice(pool)
      })
      $rollResult.find('.send-to-pool').click(async (event) => {
        event.preventDefault()
        const pool = getPool($rollResult)
        await game.earthland.UserDicePool._setPool(pool)
      })
    }
  })

  Hooks.on('renderSceneControls', (controls, html) => {
    const $dicePoolButton = $(
      `<li class="dice-pool-control" data-control="dice-pool" title="${game.i18n.localize("DicePool")}">
          <i class="fas fa-dice"></i>
          <ol class="control-tools">
          </ol>
      </li>`
    );

    html
      .find('.main-controls')
      .append($dicePoolButton);
    html
    .find('.dice-pool-control')
    .removeClass('control-tool')
    .on('click', async () => {
      await game.earthland.UserDicePool.toggle()
    });
  })
}
