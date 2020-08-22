export function fuzzyCheckStrings(
  inputValues: string[],
  validValues: string[],
  allSuggestions: string[],
): { [p: string]: string[] } {
  const fuzzyMatches: { [p: string]: string[] } = {};
  const invalidInputs: string[] = inputValues.filter(
    (inputValue) =>
      !validValues.some((validValue) => validValue === inputValue),
  );

  if (invalidInputs.length > 0) {
    invalidInputs.forEach(
      (invalidInput) =>
        (fuzzyMatches[invalidInput] = fuzzySuggestions(
          invalidInput,
          allSuggestions,
        )),
    );
  }

  return fuzzyMatches;
}

/**
 *
 * @param {String} inputValue The value to be compared against a list of strings
 * @param allSuggestions The list of strings to be compared against
 * @param hideIrrelevant By default, fuzzy suggestions will just sort the allSuggestions list, set this to true
 *        to filter out the irrelevant values
 * @param weighted Set this to true, to make letters matched in the order they were typed have priority in the results.
 */
export function fuzzySuggestions(
  inputValue: string,
  allSuggestions: string[],
  hideIrrelevant?: boolean,
  weighted?: true,
): string[] {
  const search = weighted ? string_weighted_distances : string_distances;
  let thisSuggestions: {
    value: string;
    relevance: number;
  }[] = allSuggestions.map((text) => ({
    value: text,
    relevance: search(inputValue.toLowerCase(), text.toLocaleLowerCase()),
  }));

  thisSuggestions.sort((a, b) => b.relevance - a.relevance);

  if (hideIrrelevant) {
    thisSuggestions = thisSuggestions.filter(
      (suggestion) => suggestion.relevance !== 0,
    );
  }

  return thisSuggestions.map((suggestion) => suggestion.value);
}

/**
 * Algorithm to do fuzzy search
 * from https://stackoverflow.com/questions/23305000/javascript-fuzzy-search-that-makes-sense
 * @param {string} from
 * @return {[]}
 */
export function get_bigrams(from: string) {
  const s = from.toLowerCase();
  const v = new Array(s.length - 1);
  let i;
  let j;
  let ref;

  for (i = j = 0, ref = v.length; j <= ref; i = j += 1) {
    v[i] = s.slice(i, i + 2);
  }

  return v;
}

export function string_distances(str1: string, str2: string): number {
  if (str1.length === 0 && str2.length === 0) {
    return 0;
  }

  const pairs1 = get_bigrams(str1);
  const pairs2 = get_bigrams(str2);
  const union = pairs1.length + pairs2.length;
  let hit_count = 0;
  let j;
  let len;

  for (j = 0, len = pairs1.length; j < len; j++) {
    const x = pairs1[j];
    let k;
    let len1;

    for (k = 0, len1 = pairs2.length; k < len1; k++) {
      const y = pairs2[k];
      if (x === y) {
        hit_count++;
      }
    }
  }

  return hit_count > 0 ? (2 * hit_count) / union : 0;
}

export function string_weighted_distances(str1: string, str2: string): number {
  const a = str1.replace(/\s/g, '');
  const b = str2.replace(/\s/g, '');

  let weight = 0;
  let lastIndex = 0;

  for (let i = 0; i < a.length; i++) {
    const idx = b.indexOf(a[i]);
    if (idx === -1) {
      continue;
    }

    lastIndex = idx;
    weight += ((b.length - lastIndex) * 100) / b.length;
    weight *= weight;
  }

  return weight;
}
