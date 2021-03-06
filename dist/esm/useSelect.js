import { useReducer, useEffect, useMemo, useState, useRef } from 'react';
import highlightReducer from './highlightReducer';
import getDisplayValue from './lib/getDisplayValue';
import FlattenOptions from './lib/flattenOptions';
import GroupOptions from './lib/groupOptions';
import getNewValue from './lib/getNewValue';
import getOption from './lib/getOption';
import doSearch from './search';
export default function useSelectSearch({
  value: defaultValue = null,
  disabled = false,
  multiple = false,
  search: canSearch = false,
  fuse = false,
  options: defaultOptions,
  onChange = () => {},
  getOptions = null,
  allowEmpty = true,
  closeOnSelect = true
}) {
  const ref = useRef(null);
  const [flatDefaultOptions, setFlatDefaultOptions] = useState(FlattenOptions(defaultOptions));
  const [flat, setOptions] = useState([]);
  const [value, setValue] = useState(defaultValue);
  const [option, setOption] = useState(getOption(value, flatDefaultOptions));
  const [search, setSearch] = useState('');
  const [focus, setFocus] = useState(false);
  const [searching, setSearching] = useState(false);
  const [highlighted, setHighlighted] = useReducer(highlightReducer, -1);
  const options = useMemo(() => GroupOptions(flat), [flat]);
  const displayValue = useMemo(() => getDisplayValue(option), [option]);

  const onBlur = () => {
    setFocus(false);
    setHighlighted(false);

    if (ref.current) {
      ref.current.blur();
    }

    if (!multiple) {
      setSearch('');
      setOptions(flatDefaultOptions);
    }
  };

  const onFocus = () => setFocus(true);

  const onSelect = val => {
    const newOption = getOption(val, flat);
    const newValue = getNewValue(newOption, option, multiple);
    setOption(newValue);
    onChange(multiple ? newValue.map(i => i.value) : newValue.value, newValue);
  };

  const onMouseDown = e => {
    if (!closeOnSelect) {
      e.preventDefault();
    }

    onSelect(e.currentTarget.value);
  };

  const onKeyDown = e => setHighlighted({
    key: e.key,
    options: flat
  });

  const onKeyPress = ({
    key
  }) => {
    if (key === 'Enter') {
      const newOption = flat[highlighted];

      if (newOption) {
        onSelect(newOption.value);

        if (!multiple) {
          onBlur();
        }
      }
    }
  };

  const onKeyUp = ({
    key
  }) => {
    if (key === 'Escape') {
      onBlur();
    }
  };

  const onSearch = ({
    target
  }) => {
    const {
      value: inputVal
    } = target;
    setSearch(inputVal);
    let searchableOption = flatDefaultOptions;

    if (getOptions && inputVal.length) {
      setSearching(true);
      searchableOption = getOptions(inputVal);
    }

    Promise.resolve(searchableOption).then(foundOptions => {
      if (inputVal.length) {
        const newOptions = doSearch(inputVal, foundOptions, fuse);
        setOptions(newOptions === false ? foundOptions : newOptions);
      } else {
        setOptions(foundOptions);
      }
    }).catch(() => setOptions(flatDefaultOptions)).finally(() => setSearching(false));
  };

  const valueProps = {
    tabIndex: '0',
    readOnly: !canSearch,
    onChange: canSearch ? onSearch : null,
    onBlur,
    onFocus,
    onKeyPress,
    onKeyDown,
    onKeyUp,
    ref
  };
  const optionProps = {
    tabIndex: '-1',
    onMouseDown
  };
  useEffect(() => setValue(defaultValue), [defaultValue]);
  useEffect(() => {
    const flatOptions = FlattenOptions(defaultOptions);
    setOptions(flatOptions);
    setFlatDefaultOptions(flatOptions);
  }, [defaultOptions]);
  useEffect(() => {
    let newOption = getOption(value, flatDefaultOptions);

    if (!newOption && !allowEmpty) {
      [newOption] = flatDefaultOptions;
    }

    setOption(newOption);
  }, [value, flatDefaultOptions, allowEmpty]);
  return [{
    value: option,
    highlighted,
    options,
    disabled,
    displayValue,
    focus,
    search,
    searching
  }, valueProps, optionProps, setValue];
}