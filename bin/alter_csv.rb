#!/usr/bin/env ruby
require 'json'
require 'csv'

filename = ARGV.shift
raise "Need an input file path" if filename.nil?

outfile = "#{filename}.out"

table = CSV.parse(File.read(filename), headers: true)

CSV.open(outfile, "w") do |csv|
  headers = table.headers.compact.to_a
  headers += ["mp_cost"]
  headers.sort!
  $stderr.puts "about to add headers: #{headers}"
  csv << headers
  table.each do |row|
    object = row.to_h.compact
    object["mp_cost"] = (object["level"].to_i / 2.0).round
    object["name"] = object["name"].strip
    object["details"] = object["details"] + object[nil].to_s if object[nil]
    object["details"] = object["details"].tr(',', ';')
    headers.each do |h|
      object[h] = nil unless object[h]
    end
    object.delete(nil)
    $stderr.puts "about to output object: #{object.keys.sort}"
    values = []
    object.keys.sort.each do |k|
      values << object[k]
    end
    row = CSV::Row.new(object.keys.sort, values)
    csv << row
  end
end
