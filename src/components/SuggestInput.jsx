import { useState } from "react";

export default function SuggestInput({ label, name, value, options, onChange }) {
  const [inputValue, setInputValue] = useState(value || "");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredOptions = options.filter(
    (opt) =>
      opt.toLowerCase().includes(inputValue.toLowerCase()) &&
      opt.toLowerCase() !== inputValue.toLowerCase()
  );

  const handleSelect = (val) => {
    setInputValue(val);
    onChange({ target: { name, value: val } });
    setShowSuggestions(false);
  };

  const handleChange = (e) => {
    setInputValue(e.target.value);
    onChange({ target: { name, value: e.target.value } });
    setShowSuggestions(true);
  };

  return (
    <div className="relative">
      <label className="block text-gray-700 text-sm mb-1">{label}</label>
      <input
        type="text"
        name={name}
        value={inputValue}
        onChange={handleChange}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        className="w-full p-2 border rounded-md"
      />
      {showSuggestions && filteredOptions.length > 0 && (
        <ul className="absolute left-0 right-0 bg-white border rounded-md shadow-md max-h-40 overflow-y-auto z-10">
          {filteredOptions.map((opt, i) => (
            <li
              key={i}
              className="p-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
