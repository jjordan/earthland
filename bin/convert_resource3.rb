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
  long_rest = false
  short_rest = false
  if (description =~ /long\s+rest/)
    long_rest = true
  end
  if (description =~ /short\s+rest/)
    short_rest = true
  end
  if (description =~ /short\s+or\s+long\s+rest/)
    short_rest = true
  end
  if long_rest && !short_rest
    object["energy_cost"] = 2
  end
  if short_rest && !long_rest
    object["energy_cost"] = 1
  end
  if short_rest && long_rest
    object["energy_cost"] = 1
  end
  if object["energy_cost"]
    object["type"] = "ability"
    object["is_class_ability"] = true
    object["is_class_feature"] = false
  else
    object["type"] = "feature"
    object["is_class_ability"] = false
    object["is_class_feature"] = true
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
  headers = headers + ["dice", "energy_cost", "is_class_ability", "is_class_feature"]
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
