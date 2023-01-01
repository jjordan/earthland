#!/usr/bin/env ruby
require 'json'
require 'csv'

filename = ARGV.shift
raise "Need an input file path" if filename.nil?

outfile = "#{filename}.csv"

def convert_formula_to_dice_object( formula )
  dice_obj = {}
  dice_num, sides = formula.split('d')
  1.upto(dice_num.to_i) do |n|
    index = (n - 1).to_s
    dice_obj[index] = sides
  end
  return dice_obj
end

def process_object( object )
  object["description"] = object["description"]["value"]
  object["duration"] = object["duration"]["value"].nil? ? object["duration"]["units"] : [object["duration"]["value"], object["duration"]["units"]].join(' ')
  target = object["target"]
  object["target"] = [target["value"], target["units"], target["type"]].join(' ')
  range = object["range"]
  object["range"] = range["value"].nil? ? range["units"] : [range["value"], range["units"]].join(' ')
  object["consume"] = object["consume"]["amount"]
  level = object["level"]
  description = object["description"]
  if object["activation"]["cost"]
    object["energy_cost"] = object["activation"]["cost"]
  end
  if object["uses"]["value"]
    object["energy_cost"] = 1
  end
  if !object["energy_cost"].nil? && object["energy_cost"] > 0
    object["type"] = "ability"
    object["is_monster_ability"] = true
    object["is_monster_feature"] = false
  else
    object["type"] = "feature"
    object["is_monster_ability"] = false
    object["is_monster_feature"] = true
    object["energy_cost"] = 0
  end
  damage = object["damage"]
  dice_objects = []
  damage["parts"].each do |part|
    if part.size > 0
      dice_obj = convert_formula_to_dice_object( part[0] )
      dice_obj["effect_type"] = part[1]
      dice_objects << dice_obj
    end
  end
  object["dice"] = dice_objects
  return object
end

open(filename) do |f|
  objects = JSON.parse(f.read)
  headers = objects[0].keys + objects[0]["system"].keys
  headers = headers - ["system"]
  headers = headers + ["dice", "energy_cost", "is_monster_ability", "is_monster_feature"]
  headers.sort!
  CSV.open(outfile, "w") do |csv|
    $stderr.puts "about to add headers: #{headers}"
    csv << headers
    objects.each do |object|
      # need to flatten the system key
      system = object.delete("system")
      object = object.merge(system)
      object = process_object(object)
      values = []
      headers.each do |k|
        values << object[k]
      end
      row = CSV::Row.new(headers, values)
      $stderr.puts "about to output object: #{values}"
      csv << row
    end
  end
end
