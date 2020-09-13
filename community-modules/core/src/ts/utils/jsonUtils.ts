// this file is copied and modified from
// https://github.com/vkiryukhin/jsonfn/blob/master/jsonfn.js (MIT)
// and https://github.com/douglascrockford/JSON-js/blob/master/cycle.js ()
// todo 嵌套深层的循环引用已处理，但嵌套深层的Map和Set结构没有处理

/**
 * 基于JSON.stringify和JSON.parse深克隆对象obj，
 * 函数属性值会stringify成源码文本，部分源码文本无法通过parse恢复成函数，
 * 若属性值存在循环引用的对象，则属性值stringify后变成字符串路径标记，parse后恢复原对象
 * @param obj 待克隆的对象
 * @param date2obj 日期格式regexp
 */
export function jsonFnClone(obj: any, date2obj?: RegExp): any {
  const str = jsonFnStringify(obj);
  // console.log('==jsonFnClone-str, ', str);

  return jsonFnParse(str, date2obj);
}

/**
 * 基于JSON.stringify序列化对象obj，返回string，
 * 支持obj属性值类型为Function、RegExp，这些特殊值序列化后部分会有8位前缀标识类型，
 * 还支持序列化属性值存在循环引用的对象
 * @param obj 要序列化的对象
 */
export function jsonFnStringify(obj: any): string {
  /** 序列化值类型为function和正则表达式的属性值，输出成源码文本 */
  const funcValueReplacer = function (key: any, value: any) {
    // seen集合用来存放不重复的属性值对象，用来判断属性值是否是循环引用的对象
    // const seen = new WeakSet();
    // 若属性值是对象，且存在循环引用，则打印标记字符串，这里的问题是只处理了第1层的，深层未处理
    // if (typeof value === 'object' && value !== null) {
    //   if (seen.has(value)) {
    //     // return;
    //     return '##CirCularObj##';
    //   }
    //   seen.add(value);
    // }

    // 若当前key的属性值类型是Map
    // const originalObject = this[key];
    if (value instanceof Map) {
      return {
        dataType: 'Map',
        value: Array.from(value), // or with spread: value: [...originalObject]
      };
    }

    if (value instanceof Set) {
      // console.log('==fns, ', value);
      return {
        dataType: 'Set',
        value: Array.from(value),
      };
    }

    let fnBody;
    // 若属性值是函数，则以字符串形式打印打印函数体源码，注意内置函数和bind过的函数会打印成[native code]
    if (value instanceof Function || typeof value == 'function') {
      fnBody = value.toString();

      // 若函数体字符串长度小于8，则添加箭头函数标记
      if (fnBody.length < 8 || fnBody.substring(0, 8) !== 'function') {
        //this is ES6 Arrow Function
        return '_NuFrRa_' + fnBody;
      }
      return fnBody;
    }

    // 若属性值是正则表达式，则打印出来
    if (value instanceof RegExp) {
      return '_PxEgEr_' + value;
    }

    // 默认会调用toJSON()方法
    return value;
  };
  let decycledObj = jsonDecycle(obj);
  // if (obj.constructor.name === 'Map' || obj.constructor.name === 'Set') {
  //   decycledObj = obj;
  // }
  // console.log(decycledObj);
  return JSON.stringify(decycledObj, funcValueReplacer);
}
/**
 * 将对象中循环引用的属性值对象输出为路径字符串，
 * 实际会裁剪dom node内容和跳过iframe对象，所以不能完全恢复原对象，也未在retrocycle方法实现恢复
 */
function jsonDecycle(object: any, replacer?: Function) {
  // Make a deep copy of an object or array, assuring that there is at most
  // one instance of each object or array in the resulting structure. The
  // duplicate references (which might be forming cycles) are replaced with
  // an object of the form
  //      {"$ref": PATH}
  // where the PATH is a JSONPath string that locates the first occurrence.

  // So,

  //      var a = [];
  //      a[0] = a;
  //      return JSON.stringify(JSON.decycle(a));

  // produces the string '[{"$ref":"$"}]'.

  // If a replacer function is provided, then it will be called for each value.
  // A replacer function receives a value and returns a replacement value.

  // JSONPath is used to locate the unique object. $ indicates the top level of
  // the object or array. [NUMBER] or [STRING] indicates a child element or
  // property.

  /**
   * Allows stringifing DOM elements.
   * This is done in hope to identify the node when dumping.
   *
   * @param {Element} node DOM Node (works best for DOM Elements).
   * @returns {String}
   */
  let stringifyNode: any = function (node: any) {
    var text = '';
    switch (node.nodeType) {
      case node.ELEMENT_NODE:
        text = node.nodeName.toLowerCase();
        if (node.id.length) {
          text += '#' + node.id;
        } else {
          if (node.className.length) {
            text += '.' + node.className.replace(/ /, '.');
          }
          if ('textContent' in node) {
            text +=
              '{textContent:' +
              (node.textContent.length < 20
                ? node.textContent
                : node.textContent.substr(0, 20) + '...') +
              '}';
          }
        }
        break;
      // info on values: http://www.w3.org/TR/DOM-Level-2-Core/core.html#ID-1841493061
      default:
        text = node.nodeName;
        if (node.nodeValue !== null) {
          text +=
            '{value:' +
            (node.nodeValue.length < 20
              ? node.nodeValue
              : node.nodeValue.substr(0, 20) + '...') +
            '}';
        }
        break;
    }
    return text;
  };

  /** object to path mappings，存放属性值对象到路径的映射，用来判定循环引用 */
  const objects = new WeakMap();

  stringifyNode = typeof stringifyNode === 'undefined' ? false : stringifyNode;

  return (function derez(value, path) {
    // console.log('path-value, ', path, value);
    // console.log('path-value, ', path);

    // The derez function recurses through the object, producing the deep copy.

    let old_path: string; // The path of an earlier occurrence of value
    let nu: any; // The new object or array

    // If a replacer function was provided, then call it to get a replacement value.
    if (replacer !== undefined && typeof replacer === 'function') {
      value = replacer(value);
    }

    // 若属性值对象是dom node类型，则简化输出
    if (
      stringifyNode &&
      typeof value === 'object' &&
      value !== null &&
      'nodeType' in value
    ) {
      // console.log('==nodeType, ', value);

      return stringifyNode(value);
    }

    // 若属性值是非空对象，且不是原始类型的包装类型
    // typeof null === "object", so go on if this value is really an object but not
    // one of the weird builtin objects.
    if (
      typeof value === 'object' &&
      value !== null &&
      !(value instanceof Boolean) &&
      !(value instanceof Number) &&
      !(value instanceof String) &&
      !(value instanceof Date) &&
      !(value instanceof RegExp) &&
      !(value instanceof Map) &&
      !(value instanceof Set)
    ) {
      old_path = objects.get(value);
      // If the value is an object or array, look to see if we have already
      // encountered it. If so, return a {"$ref":PATH} object. This uses an
      // ES6 WeakMap.
      // 若属性值是循环引用的对象，则使用路径标识
      if (old_path !== undefined) {
        return { $ref: old_path };
      }

      // Otherwise, accumulate the unique value and its path.
      objects.set(value, path);

      // If it is an array, replicate the array. 递归处理属性值数组的元素
      if (Array.isArray(value)) {
        nu = [];
        value.forEach(function (element, i) {
          nu[i] = derez(element, path + '[' + i + ']');
        });
      } else {
        // If it is an object, replicate the object. 递归处理属性值对象的属性

        nu = {};
        Object.keys(value).forEach(function (name) {
          // console.log(name);

          // 若属性值代表iframe或子窗口，需要特殊处理，这里简单忽略值，否则访问属性时会出现跨域异常
          // DOMException: Blocked a frame with origin 'url' from accessing a cross-origin frame
          if (
            value !== window &&
            value.frames &&
            value.parent.frames.length > 0
          ) {
            return;
          }

          nu[name] = derez(
            value[name],
            path + '[' + JSON.stringify(name) + ']',
          );
        });
      }
      return nu;
    }
    return value;
  })(object, '$');
}

/**
 * 基于JSON.parse反序列化string为json形式的js对象
 * @param str 待反序列化的字符串
 * @param date2obj 日期格式regexp
 */
export function jsonFnParse(str: string, date2obj?: RegExp): any {
  const iso8061 = date2obj
    ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/
    : false;

  /** 对于JSON.parse后的对象，遍历其属性值，恢复其中带有特殊前缀的字符串为对象，如恢复成函数 */
  const funcStrReviver = function (key: any, value: any) {
    // 先处理value为object类型的情况
    if (typeof value === 'object' && value !== null) {
      if (value.dataType === 'Map') {
        return new Map(value.value);
      }

      let firstValidFunc = true;
      if (value.dataType === 'Set') {
        // console.log('==fnp, ', value);
        // 需要查找value数组中的重复元素，这里简单实现，实际的应用场景中函数或对象序列化后会是重复字符串
        const rmDup = value.value.map((str: any) => {
          if (typeof str === 'string' && str.endsWith('{ [native code] }')) {
            // 重复值的第一个不变
            if (firstValidFunc) {
              firstValidFunc = false;
              return str;
            }
            // 重复值从第二个开始加个随机数，使后面创建Set后仍存在
            return str + ', ' + Math.random();
          }
          return str;
        });
        return new Set(rmDup);
      }
    }

    if (typeof value != 'string') {
      return value;
    }

    if (value.length < 8) {
      return value;
    }

    if (iso8061 && value.match(iso8061 as RegExp)) {
      return new Date(value);
    }
    // console.log('key-value, ', key, value);

    const prefix = value.substring(0, 8);
    if (prefix === 'function') {
      // 对于方法体被序列化成{ [native code] }的属性值，仍将方法体保存为字符串
      if (/\{ \[native code\] \}$/.test(value)) {
        return value;
      }

      // 对于大多数普通方法，可以还原方法体字符串为函数对象
      return eval('(' + value + ')');
    }
    if (prefix === '_NuFrRa_') {
      return eval(value.slice(8));
    }
    if (prefix === '_PxEgEr_') {
      return eval(value.slice(8));
    }

    return value;
  };
  return jsonRetrocycle(JSON.parse(str, funcStrReviver));
}

/** 将(JSON.parse后得到的)对象中jsonDecycle处理过的路径字符串属性值，恢复成原来的循环引用对象，未实现恢复dom node对象 */
function jsonRetrocycle($: any) {
  // Restore an object that was reduced by decycle. Members whose values are
  // objects of the form
  //      {$ref: PATH}
  // are replaced with references to the value found by the PATH. This will
  // restore cycles. The object will be mutated.

  // The eval function is used to locate the values described by a PATH. The
  // root object is kept in a $ variable. A regular expression is used to
  // assure that the PATH is extremely well formed. The regexp contains nested
  // quantifiers. That has been known to have extremely bad performance
  // problems on some browsers for very long strings. A PATH is expected to be
  // reasonably short. A PATH is allowed to belong to a very restricted subset of
  // Goessner's JSONPath.

  // So,
  //      var s = '[{"$ref":"$"}]';
  //      return JSON.retrocycle(JSON.parse(s));
  // produces an array containing a single element which is the array itself.

  const px = /^\$(?:\[(?:\d+|"(?:[^\\"\u0000-\u001f]|\\(?:[\\"\/bfnrt]|u[0-9a-zA-Z]{4}))*")\])*$/;

  (function rez(value) {
    // The rez function walks recursively through the object looking for $ref
    // properties. When it finds one that has a value that is a path, then it
    // replaces the $ref object with a reference to the value that is found by
    // the path.

    if (value && typeof value === 'object') {
      // 还原作为数组元素的循环引用对象
      if (Array.isArray(value)) {
        value.forEach(function (element, i) {
          if (typeof element === 'object' && element !== null) {
            const path = element.$ref;
            if (typeof path === 'string' && px.test(path)) {
              value[i] = eval(path);
            } else {
              rez(element);
            }
          }
        });
      } else {
        // 还原作为对象属性的循环引用对象
        Object.keys(value).forEach(function (name) {
          const item = value[name];
          if (typeof item === 'object' && item !== null) {
            const path = item.$ref;
            if (typeof path === 'string' && px.test(path)) {
              value[name] = eval(path);
            } else {
              rez(item);
            }
          }
        });
      }
    }
  })($);
  return $;
}
