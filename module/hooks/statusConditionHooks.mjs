import { StatusCondition } from '../applications/StatusCondition.mjs'

export default () => {
  Hooks.on('ready', async () => {
    game.earthland.StatusCondition = new StatusCondition()
  })
}
