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
    const themes = game.settings.get('earthland', 'themes')
    const theme = themes.current === 'custom' ? themes.custom : themes.list[themes.current]
    setCssVars(theme)
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

      const getPoolName = html => {
        return html.find('.dicepool-name').data('name')
      }

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
                    type: $die.data('type'),
                    actor_id: $die.data('actorid'),
                    item_id: $die.data('itemid'),
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
        const name = getPoolName($rollResult)
        console.log("what is pool in re-roll? %o", pool);
        console.log("what is name in reroll? %o", name);
        await rollDice(pool, 'pick', {value: name})
      })
      $rollResult.find('.send-to-pool').click(async (event) => {
        event.preventDefault()
        const pool = getPool($rollResult)
        const name = getPoolName($rollResult)
        console.log("what is pool in send-to-pool? %o", pool);
        console.log("what is name in send-to-pool? %o", name);
        await game.earthland.UserDicePool._setPool(pool, name)
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
