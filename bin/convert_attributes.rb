#!/usr/bin/env ruby

require 'csv'

def convert_health( input )
	input_health = input.to_i
	case input_health
	when 1..9
		2
	when 10..19
		4
	when 20..29
		6
	when 30..39
		8
	when 40..49
		10
	when 50..59
		12
	when 60..69
		14
	when 70..79
		16
	when 80..89
		18
	else
		20
	end
end

def convert_attribute( input )
	input_attr = input.to_i
	case input_attr
	when 1..6
		2
	when 7..9
		4
	when 10..12
		6
	when 13..15
		8
	when 16..18
		10
	when 19..21
		12
	when 22..24
		14
	when 25..27
		16
	when 28..30
		18
	else
		raise "Error, attribute: #{input_attr}"
	end
end

def convert_armor_class( input )
	input_ac = input.to_i
	case input_ac
	when 10..11
		2
	when 12..13
		4
	when 14..15
		6
	when 16..17
		8
	when 18..19
		10
	when 20..21
		12
	when 22..23
		14
	else
		raise "Error, armor class: #{input_ac}"
	end
end

filename = ARGV.shift
raise "Need an input file path" if filename.nil?

outfile = "#{filename}.out.csv"

table = CSV.parse(File.read(filename), headers: true)

headers = [
	'Name',
	'Description',
	'Type',
	'Movement',
	'Senses',
	'Armor Class',
	'Hit Points',
	'Health',
	'Energy',
	'Magic Points',
	'Size',
	'Brawn',
	'Precision',
	'Speed',
	'Vitality',
	'Knowledge',
	'Awareness',
	'Willpower',
	'Presence',
]


CSV.open(outfile, "w") do |csv|
	csv << headers
	table.each do |row|
		object = row.to_h.compact
		object['Armor Class'] = convert_armor_class(object['Armor Class'])
		['Brawn', 'Precision', 'Speed', 'Vitality',
		 'Knowledge', 'Awareness', 'Willpower', 'Presence'].each do |attribute|
			object[attribute] = convert_attribute(object[attribute])
		end
		object['Health'] = convert_health(object['Hit Points'])
		values = []
		headers.each do |k|
			values << object[k]
		end
		row = CSV::Row.new(headers, values)
		csv << row
	end
end
