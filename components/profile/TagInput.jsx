import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function TagInput({ field, label, placeholder, suggestions, value = [], onChange }) {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  
  const filteredSuggestions = useMemo(() => {
    if (!suggestions || !inputValue) return suggestions || [];
    return suggestions.filter(s => 
      s.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [suggestions, inputValue]);

  const handleAddTag = (tagValue) => {
    const trimmedValue = tagValue.trim();
    if (trimmedValue && !value.includes(trimmedValue)) {
      onChange([...value, trimmedValue]);
    }
    setInputValue('');
    setIsOpen(false);
  };

  const handleRemoveTag = (index) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag(inputValue);
    }
  };

  if (suggestions) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Popover 
            open={isOpen && filteredSuggestions.length > 0} 
            onOpenChange={setIsOpen}
          >
            <PopoverTrigger asChild>
              <div className="flex-1">
                <Input
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    if (e.target.value) {
                      setIsOpen(true);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  onFocus={() => {
                    if (inputValue) {
                      setIsOpen(true);
                    }
                  }}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="p-0 w-[300px]" align="start">
              <Command>
                <CommandList>
                  <CommandEmpty>Type to add custom entry or select from list</CommandEmpty>
                  <CommandGroup>
                    {filteredSuggestions.map((suggestion, idx) => (
                      <CommandItem
                        key={idx}
                        onSelect={() => handleAddTag(suggestion)}
                      >
                        {suggestion}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <Button 
            type="button" 
            onClick={() => handleAddTag(inputValue)} 
            size="icon" 
            variant="outline"
            disabled={!inputValue}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {value.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {value.map((item, idx) => (
              <Badge key={idx} variant="secondary" className="gap-1">
                {item}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(idx)}
                  className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <Button 
          type="button" 
          onClick={() => handleAddTag(inputValue)} 
          size="icon" 
          variant="outline"
          disabled={!inputValue}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {value.map((item, idx) => (
            <Badge key={idx} variant="secondary" className="gap-1">
              {item}
              <button
                type="button"
                onClick={() => handleRemoveTag(idx)}
                className="ml-1 hover:bg-slate-200 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}