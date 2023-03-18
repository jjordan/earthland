import { GMBank } from '../applications/GMBank.js'

export default () => {
  Hooks.on('ready', async () => {
    game.earthland.GMBank = new GMBank()
  })
}
