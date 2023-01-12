import { localizer } from '../scripts/foundryHelpers.mjs'

const SIDES_TO_ADDITION = {
    2: 1,
    4: 2,
    6: 3,
    8: 4,
    10: 5,
    12: 6,
    20: 10
}

export class EarthlandCombatant extends Combatant {
  getInitiativeRoll(formula) {
    let traits = game.settings.get('earthland', 'initiativeTraits').split(',').map( s => s.trim() )
    // get the actor
    let formulae = []
    let additive = 0
    let actor = this.actor
    // iterate over the traits
    traits.forEach((trait) => {
      let diceObj = actor.getDiceObjectForTrait(trait)
        if (diceObj != null) {
          let myFormula = ""
          for (const [sides, dice] of Object.entries(diceObj)) {
            additive += sides * dice
            myFormula = `${dice}d${sides}`
            formulae.push(myFormula)
          }
        }
    })
    // pull the trait values out of the actor and build the roll
    let myRollFormula = formulae.join(' + ')
    let myAdditivePercent = additive / 100.0
    myRollFormula = `${myRollFormula} + ${myAdditivePercent}`
    const myRoll = new Roll(myRollFormula)
    return myRoll
  }

}
