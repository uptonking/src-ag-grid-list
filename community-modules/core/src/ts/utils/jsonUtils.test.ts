import { jsonFnStringify, jsonFnParse } from './jsonUtils';

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

  test('stringify simple Map object', () => {
    const obj: any = {
      p1: 11,
    };
    const m = new Map();
    m.set('k1', 'v1');
    obj.p2 = m;
    // console.log(jsonFnStringify(obj));
    // console.log(jsonDecycle(obj));
    // console.log(obj);
    // expect(jsonFnStringify(obj)).toBe('{"p1":11,"p2":{}}');
    expect(jsonFnStringify(obj)).toBe(
      '{"p1":11,"p2":{"dataType":"Map","value":[["k1","v1"]]}}',
    );
    expect(jsonFnStringify(m)).toBe('{"dataType":"Map","value":[["k1","v1"]]}');
  });

  test('stringify simple Set object', () => {
    const obj: any = {
      p1: 11,
    };
    const s = new Set();
    s.add('v1');
    obj.p2 = s;
    expect(jsonFnStringify(obj)).toBe(
      '{"p1":11,"p2":{"dataType":"Set","value":["v1"]}}',
    );
  });

  test('stringify Map object with Set value', () => {
    const obj: any = {
      p1: 11,
    };
    const m = new Map();
    const s = new Set();
    s.add('v1');
    m.set('k1', s);
    obj.p2 = m;
    // console.log(jsonFnStringify(obj));
    // console.log(jsonDecycle(obj));
    // console.log(obj);
    // expect(jsonFnStringify(obj)).toBe('{"p1":11,"p2":{}}');
    expect(jsonFnStringify(obj)).toBe(
      '{"p1":11,"p2":{"dataType":"Map","value":[["k1",{"dataType":"Set","value":["v1"]}]]}}',
    );

    s.add(function () {});
    expect(jsonFnStringify(obj)).toBe(
      '{"p1":11,"p2":{"dataType":"Map","value":[["k1",{"dataType":"Set","value":["v1","function () { }"]}]]}}',
    );

    s.add(function () {});
    expect(jsonFnStringify(obj)).toBe(
      '{"p1":11,"p2":{"dataType":"Map","value":[["k1",{"dataType":"Set","value":["v1","function () { }","function () { }"]}]]}}',
    );
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

  test('parse string of simple Map object', () => {
    const obj: any = {
      p1: 11,
    };
    const m = new Map();
    m.set('k1', 'v1');
    obj.p2 = m;
    // console.log(jsonFnStringify(obj));
    // console.log(jsonDecycle(obj));
    // console.log(obj);
    // expect(jsonFnStringify(obj)).toBe('{"p1":11,"p2":{}}');
    expect(
      jsonFnParse('{"p1":11,"p2":{"dataType":"Map","value":[["k1","v1"]]}}'),
    ).toEqual(obj);
    expect(jsonFnParse('{"dataType":"Map","value":[["k1","v1"]]}')).toEqual(m);
  });

  test('parse string of simple Set object', () => {
    const obj: any = {
      p1: 11,
    };
    const m = new Set();
    m.add('v1');
    obj.p2 = m;
    expect(
      jsonFnParse('{"p1":11,"p2":{"dataType":"Set","value":["v1"]}}'),
    ).toEqual(obj);
  });

  test('parse string of Map object with Set value', () => {
    const obj: any = {
      p1: 11,
    };
    const m = new Map();
    const s = new Set();
    s.add('v1');
    m.set('k1', s);
    obj.p2 = m;

    expect(
      jsonFnParse(
        '{"p1":11,"p2":{"dataType":"Map","value":[["k1",{"dataType":"Set","value":["v1"]}]]}}',
      ),
    ).toEqual(obj);

    console.log(
      jsonFnParse(
        '{"p1":11,"p2":{"dataType":"Map","value":[["k1",{"dataType":"Set","value":["v1","function () { }"]}]]}}',
      ),
    );
    console.log(
      jsonFnParse(
        '{"p1":11,"p2":{"dataType":"Map","value":[["k1",{"dataType":"Set","value":["v1","function () { }","function () { }"]}]]}}',
      ),
    );

    const parsedObj = jsonFnParse(
      '{"p1":11,"p2":{"dataType":"Map","value":[["k1",{"dataType":"Set","value":["v1","function () { [native code] }","function () { [native code] }"]}]]}}',
    );
    // console.log(parsedObj);
    console.log(parsedObj.p2.get('k1'));
    expect(parsedObj.p2.get('k1').size).toBe(3);
    // s.add(function () {});
    // expect(
    //   jsonFnParse(
    //     '{"p1":11,"p2":{"dataType":"Map","value":[["k1",{"dataType":"Set","value":["v1","function () { }"]}]]}}',
    //   ),
    // ).toEqual(obj);
  });
});
