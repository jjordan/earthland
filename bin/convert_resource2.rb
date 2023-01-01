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
  return object
end

open(filename) do |f|
  objects = JSON.parse(f.read)
  headers = objects[0].keys + objects[0]["system"].keys
  headers = headers - ["system"]
  headers.compact.sort!
  CSV.open(outfile, "w") do |csv|
    $stderr.puts "about to add headers: #{headers}"
    csv << headers
    objects.each do |object|
      # need to flatten the system key
      system = object.delete("system")
      object = object.merge(system)
      object = process_object(object) if object
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
