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
  duration = object["duration"]
  if duration
    object["duration"] = duration["value"].nil? ? duration["units"] : [duration["value"], duration["units"]].join(' ')
    object["duration"] = "none" if object["duration"] == 0 || object["duration"].strip == '' || object["duration"].strip == '0'
  end
  object["duration"] ||= "none"
  target = object["target"]
  $stderr.puts "target: #{target.inspect}"
  if target
    object["target"] = [target["value"], target["units"], target["type"]].join(' ').to_s
  end
  object["target"] = "self" if object["target"].nil? || object["target"].strip == ''
  range = object["range"]
  if range
    object["range"] = range["value"].nil? ? range["units"] : [range["value"], range["units"]].join(' ')
  end
  object["range"] = "self" if object["range"].nil? || object["range"] == ''
  consume = object["consume"]
  if consume
    object["consume"] = consume["amount"]
  end
  level = object["level"]
  description = object["description"]
  object["energy_cost"] = 0
  if object["activation"] && object["activation"]["cost"]
    object["energy_cost"] = object["activation"]["cost"]
  end
  if object["uses"] && object["uses"]["value"]
    object["energy_cost"] = 1
  end
  object["attunable"] = false
  if object["attunement"].to_i > 0
    object["attunable"] = true
  else
    object["attunable"] = false
  end
  return object
end

open(filename) do |f|
  objects = JSON.parse(f.read)
  headers = objects[0].keys + objects[0]["system"].keys
  headers = headers - ["system"]
  headers = headers + ["energy_cost", "attunable"]
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
