import { useState, KeyboardEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { X, Search } from "lucide-react";

interface KeywordPickerProps {
  initialKeywords?: string[];
  onKeywordsChange?: (keywords: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
}

export function KeywordPicker({ 
  initialKeywords = [], 
  onKeywordsChange, 
  suggestions = ["Agronomy", "Cotton", "Irrigation", "Pest Control", "Soil Testing", "Basmati Rice"],
  placeholder = "Add keywords..."
}: KeywordPickerProps) {
  const [keywords, setKeywords] = useState<string[]>(initialKeywords);
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!keywords.includes(inputValue.trim())) {
        const newKeywords = [...keywords, inputValue.trim()];
        setKeywords(newKeywords);
        onKeywordsChange?.(newKeywords);
      }
      setInputValue("");
    } else if (e.key === 'Backspace' && !inputValue && keywords.length > 0) {
      const newKeywords = keywords.slice(0, -1);
      setKeywords(newKeywords);
      onKeywordsChange?.(newKeywords);
    }
  };

  const removeKeyword = (idx: number) => {
    const newKeywords = keywords.filter((_, i) => i !== idx);
    setKeywords(newKeywords);
    onKeywordsChange?.(newKeywords);
  };

  return (
    <div className="w-full">
      <div className="relative flex flex-wrap gap-2 p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        {keywords.map((kw, i) => (
          <Badge 
            key={`${kw}-${i}`} 
            variant="secondary" 
            className="flex items-center gap-1 pl-3 pr-1 py-1 bg-primary/5 text-primary border-none"
          >
            {kw}
            <button 
              onClick={() => removeKeyword(i)}
              className="hover:bg-primary/10 rounded-full p-0.5 transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={keywords.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm p-1 dark:text-white"
        />
      </div>
      
      {inputValue && (
        <div className="mt-2 p-2 border border-slate-100 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-800 shadow-lg absolute z-10 w-full max-w-sm">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest px-2 mb-1">Suggestions</p>
          {suggestions
            .filter(s => s.toLowerCase().includes(inputValue.toLowerCase()) && !keywords.includes(s))
            .map(s => (
              <button
                key={s}
                onClick={() => {
                  const newKeywords = [...keywords, s];
                  setKeywords(newKeywords);
                  onKeywordsChange?.(newKeywords);
                  setInputValue("");
                }}
                className="w-full text-left px-2 py-1.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 rounded transition-colors dark:text-white flex items-center gap-2"
              >
                <Search className="w-3 h-3 text-muted-foreground" /> {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
