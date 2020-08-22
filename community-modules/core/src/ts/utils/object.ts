import { missing, exists, values } from './generic';
import { forEach } from './array';

export function iterateObject<T>(
  object: { [p: string]: T } | T[] | undefined,
  callback: (key: string, value: T) => void,
) {
  if (object == null) {
    return;
  }

  if (Array.isArray(object)) {
    forEach(object, (value, index) => callback(`${index}`, value));
  } else {
    forEach(Object.keys(object), (key) => callback(key, object[key]));
  }
}

export function cloneObject<T>(object: T): T {
  const copy = {} as T;
  const keys = Object.keys(object);

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const value = (object as any)[key];
    (copy as any)[key] = value;
  }

  return copy;
}

export function deepCloneObject<T>(object: T): T {
  return JSON.parse(JSON.stringify(object));
}

export function getProperty<T, K extends keyof T>(object: T, key: K): any {
  return object[key];
}

export function setProperty<T, K extends keyof T>(
  object: T,
  key: K,
  value: any,
): void {
  object[key] = value;
}

/**
 * Will copy the specified properties from `source` into the equivalent properties on `target`, ignoring properties with
 * a value of `undefined`.
 */
export function copyPropertiesIfPresent<S, T extends S, K extends keyof S>(
  source: S,
  target: T,
  ...properties: K[]
) {
  forEach(properties, (p) => copyPropertyIfPresent(source, target, p));
}

/**
 * Will copy the specified property from `source` into the equivalent property on `target`, unless the property has a
 * value of `undefined`. If a transformation is provided, it will be applied to the value before being set on `target`.
 */
export function copyPropertyIfPresent<S, T extends S, K extends keyof S>(
  source: S,
  target: T,
  property: K,
  transform?: (value: S[K]) => any,
) {
  const value = getProperty(source, property);

  if (value !== undefined) {
    setProperty(target, property, transform ? transform(value) : value);
  }
}

export function getAllKeysInObjects(objects: any[]): string[] {
  const allValues: any = {};

  objects
    .filter((obj) => obj != null)
    .forEach((obj) => {
      forEach(Object.keys(obj), (key) => (allValues[key] = null));
    });

  return Object.keys(allValues);
}

export function mergeDeep(dest: any, source: any, copyUndefined = true): void {
  if (!exists(source)) {
    return;
  }

  iterateObject(source, (key: string, newValue: any) => {
    const oldValue: any = dest[key];

    if (oldValue === newValue) {
      return;
    }

    if (
      typeof oldValue === 'object' &&
      typeof newValue === 'object' &&
      !Array.isArray(oldValue)
    ) {
      mergeDeep(oldValue, newValue);
    } else if (copyUndefined || newValue !== undefined) {
      dest[key] = newValue;
    }
  });
}

export function assign<T, U>(target: T, source: U): T & U;
export function assign<T, U, V>(target: T, source1: U, source2: V): T & U & V;
export function assign<T, U, V, W>(
  target: T,
  source1: U,
  source2: V,
  source3: W,
): T & U & V & W;
export function assign(object: any, ...sources: any[]): any {
  forEach(sources, (source) =>
    iterateObject(source, (key: string, value: any) => (object[key] = value)),
  );

  return object;
}

export function missingOrEmptyObject(value: any): boolean {
  return missing(value) || Object.keys(value).length === 0;
}

export function get(source: any, expression: string, defaultValue: any): any {
  if (source == null) {
    return defaultValue;
  }

  const keys = expression.split('.');
  let objectToRead = source;

  while (keys.length > 1) {
    objectToRead = objectToRead[keys.shift()];

    if (objectToRead == null) {
      return defaultValue;
    }
  }

  const value = objectToRead[keys[0]];

  return value != null ? value : defaultValue;
}

export function set(target: any, expression: string, value: any) {
  if (target == null) {
    return;
  }

  const keys = expression.split('.');
  let objectToUpdate = target;

  while (keys.length > 1) {
    objectToUpdate = objectToUpdate[keys.shift()];

    if (objectToUpdate == null) {
      return;
    }
  }

  objectToUpdate[keys[0]] = value;
}

export function deepFreeze(object: any): any {
  Object.freeze(object);

  forEach(values(object), (v) => {
    if (v != null && (typeof v === 'object' || typeof v === 'function')) {
      deepFreeze(v);
    }
  });

  return object;
}

export function getValueUsingField(
  data: any,
  field: string,
  fieldContainsDots: boolean,
): any {
  if (!field || !data) {
    return;
  }

  // if no '.', then it's not a deep value
  if (!fieldContainsDots) {
    return data[field];
  }

  // otherwise it is a deep value, so need to dig for it
  const fields = field.split('.');
  let currentObject = data;

  for (let i = 0; i < fields.length; i++) {
    currentObject = currentObject[fields[i]];

    if (missing(currentObject)) {
      return null;
    }
  }

  return currentObject;
}
