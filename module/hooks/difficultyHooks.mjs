import { Difficulty } from '../applications/Difficulty.mjs'

export default () => {
  Hooks.on('ready', async () => {
    game.earthland.Difficulty = new Difficulty()
  })
}
