#!/usr/bin/env ruby
require 'json'

filename = ARGV.shift
raise "Need an input file path" if filename.nil?

objects_by_type = {}
open(filename) do |f|
  objects = JSON.parse(f.read)
  objects.each do |object|
    type = object['type']
    name = object['name']
    if (type == 'equipment' && object['system']['armor'])
      if (object['system']['armor']['value'].to_i > 10)
        type = 'armor'
      end
    end
    if (type == 'consumable')
      if ((name =~ /potion/i) || (object['system']['consumableType'] == 'potion'))
        type = 'potion'
      elsif (object['system']['consumableType'] == 'ammo')
        type = 'ammunition'
      else
        type = 'trinket'
      end
    end
    if (type == 'loot')
      type = 'treasure'
    end
    if (type == 'backpack')
      type = 'container'
    end
    if (type == 'tool')
      type = 'equipment'
    end
    object['type'] = type
    objects_by_type[type] ||= []
    objects_by_type[type].push(object)
    puts "object type: #{type} - #{object['name']}"
    # open a new JSON per new type
    #puts "object system: #{object['system'].inspect}"
    #puts "object keys: #{object.keys}"
  end
end

objects_by_type.each_pair do |type, object|
  open("#{type}.json", 'w') do |f|
    f.write(JSON.generate(object))
  end
end
