import { jsonFnStringify, jsonFnParse, jsonDecycle } from './jsonUtils';

describe('JSON stringify object tests', () => {
  test('stringify simple object without circular reference and function prop', () => {
    const obj = {
      p1: 11,
      p2: 'pp22',
    };
    expect(jsonFnStringify(obj)).toBe('{"p1":11,"p2":"pp22"}');
  });

  test('stringify object with anonymous function prop', () => {
    const obj = {
      p1: 11,
      p2: function () {},
    };
    // console.log(jsonFnStringify(obj));
    expect(jsonFnStringify(obj)).toBe('{"p1":11,"p2":"function () { }"}');
  });

  test('stringify object with arrow function prop', () => {
    const obj = {
      p1: 11,
      p2: () => {},
    };
    // console.log(jsonFnStringify(obj));
    expect(jsonFnStringify(obj)).toBe('{"p1":11,"p2":"function () { }"}');
  });

  test('stringify object with self circular value prop at 1 level', () => {
    const obj: any = {
      p1: 11,
    };
    obj.p2 = obj;
    // console.log(jsonFnStringify(obj));
    expect(jsonFnStringify(obj)).toBe('{"p1":11,"p2":{"$ref":"$"}}');
  });

  test('stringify object with self circular value prop at 3 level', () => {
    const obj: any = {
      p1: 11,
      p3: {},
    };
    obj.p2 = {
      p21: 21,
      p22: {
        p221: obj,
        p222: obj.p3,
      },
    };
    // console.log(jsonFnStringify(obj));
    expect(jsonFnStringify(obj)).toBe(
      '{"p1":11,"p3":{},"p2":{"p21":21,"p22":{"p221":{"$ref":"$"},"p222":{"$ref":"$[\\"p3\\"]"}}}}',
    );
  });

  test('stringify Map object', () => {
    const obj: any = {
      p1: 11,
    };
    const m = new Map();
    m.set('k1', 'v1');
    obj.p2 = m;
    // console.log(jsonFnStringify(obj));
    console.log(jsonDecycle(obj));
    console.log(obj);
    // expect(jsonFnStringify(obj)).toBe('{"p1":11,"p2":{}}');
    expect(jsonFnStringify(obj)).toBe('{"p1":11, "p2":Map { "k1" => "v1" } }');
  });
});

describe('JSON parse string tests', () => {
  test('parse simple string without function prop', () => {
    const objStr = '{"p1":11,"p2":"pp22"}';
    const obj = {
      p1: 11,
      p2: 'pp22',
    };
    expect(jsonFnParse(objStr)).toEqual(obj);
  });

  // test('stringify object with anonymous function prop', () => {
  //   const obj = {
  //     p1: 11,
  //     p2: function () {},
  //   };
  //   // console.log(jsonFnStringify(obj));
  //   expect(jsonFnStringify(obj)).toBe('{"p1":11,"p2":"function () { }"}');
  // });

  // test('stringify object with arrow function prop', () => {
  //   const obj = {
  //     p1: 11,
  //     p2: () => {},
  //   };
  //   // console.log(jsonFnStringify(obj));
  //   expect(jsonFnStringify(obj)).toBe('{"p1":11,"p2":"function () { }"}');
  // });

  // test('stringify object with self circular value prop at 1 level', () => {
  //   const obj: any = {
  //     p1: 11,
  //   };
  //   obj.p2 = obj;
  //   // console.log(jsonFnStringify(obj));
  //   expect(jsonFnStringify(obj)).toBe('{"p1":11,"p2":{"$ref":"$"}}');
  // });

  // test('stringify object with self circular value prop at 3 level', () => {
  //   const obj: any = {
  //     p1: 11,
  //     p3: {},
  //   };
  //   obj.p2 = {
  //     p21: 21,
  //     p22: {
  //       p221: obj,
  //       p222: obj.p3,
  //     },
  //   };
  //   // console.log(jsonFnStringify(obj));
  //   expect(jsonFnStringify(obj)).toBe(
  //     '{"p1":11,"p3":{},"p2":{"p21":21,"p22":{"p221":{"$ref":"$"},"p222":{"$ref":"$[\\"p3\\"]"}}}}',
  //   );
  // });
});
