// import ActorSettings from './ActorSettings.js'
// import ImportExportSettings from './ImportExportSettings.js'
// import defaultActorTypes from '../actor/defaultActorTypes.js'
import defaultInitiativeTraits from '../documents/defaultInitiativeTraits.mjs'
import defaultThemes from '../theme/defaultThemes.js'
import ThemeSettings from './ThemeSettings.js'

import { localizer } from '../scripts/foundryHelpers.mjs'

export const registerSettings = () => {
  console.log("in registerSettings");
  game.settings.register('earthland', 'rollResultSourceCollapsed', {
    name: localizer('RollResultSourceCollapsed'),
    hint: localizer('RollResultSourceCollapsedHint'),
    label: localizer('RollResultSourceCollapsed'),
    default: false,
    type: Boolean,
    config: true
  })

  game.settings.registerMenu('earthland', 'ThemeSettings', {
    hint: localizer('ThemeSettingsH'),
    icon: 'fas fa-user-cog',
    label: localizer('ThemeSettings'),
    name: localizer('ThemeSettings'),
    restricted: true,
    type: ThemeSettings
  })

  game.settings.register('earthland', 'themes', {
    name: localizer('Themes'),
    default: defaultThemes,
    scope: 'world',
    type: Object,
    config: false,
  })

  game.settings.register('earthland', 'initiativeTraits', {
    name: localizer('InitiativeTraits'),
    hint: localizer('InitiativeTraitsHint'),
    label: localizer('InitiativeTraits'),
    default: defaultInitiativeTraits,
    scope: 'world',
    type: String,
    config: true
  })

}
