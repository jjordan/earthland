/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
 export const preloadHandlebarsTemplates = async function() {
  return loadTemplates([

    // Actor partials.
    "systems/earthland/templates/actor/parts/actor-features.html",
    "systems/earthland/templates/actor/parts/actor-items.html",
    "systems/earthland/templates/actor/parts/actor-distinctions.html",
    "systems/earthland/templates/actor/parts/actor-spells.html",
    "systems/earthland/templates/actor/parts/actor-effects.html",
  ]);
};
