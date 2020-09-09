export function QuerySelector(selector?: string): Function {
  return querySelectorFunc.bind(this, selector);
}

/**
 * 以`RefSelector(ref)`注解形式使用的属性装饰器工厂，
 * 会给class的__agBeanMetaData静态属性加上`constructor.name.querySelectors`属性，用来存放ref对象名
 * @param ref component的ref对象名称
 */
export function RefSelector(ref?: string): Function {
  return querySelectorFunc.bind(this, '[ref=' + ref + ']');
}

function querySelectorFunc(
  selector: string,
  classPrototype: any,
  methodOrAttributeName: string,
  index: number,
) {
  if (selector === null) {
    console.error('ag-Grid: QuerySelector selector should not be null');
    return;
  }
  if (typeof index === 'number') {
    console.error('ag-Grid: QuerySelector should be on an attribute');
    return;
  }

  addToObjectProps(classPrototype, 'querySelectors', {
    attributeName: methodOrAttributeName,
    querySelector: selector,
  });
}

// think we should take this out, put property bindings on the
export function GridListener(eventName: string): Function {
  return gridListenerFunc.bind(this, eventName);
}

function gridListenerFunc(
  eventName: string,
  target: Object,
  methodName: string,
) {
  if (eventName == null) {
    console.error('ag-Grid: GridListener eventName is missing');
    return;
  }

  addToObjectProps(target, 'gridListenerMethods', {
    methodName: methodName,
    eventName: eventName,
  });
}

// think we should take this out, put property bindings on the
export function GuiListener(ref: string, eventName: string): Function {
  return guiListenerFunc.bind(this, ref, eventName);
}

function guiListenerFunc(
  ref: string,
  eventName: string,
  target: Object,
  methodName: string,
) {
  if (eventName == null) {
    console.error('ag-Grid: GuiListener eventName is missing');
    return;
  }

  addToObjectProps(target, 'guiListenerMethods', {
    methodName: methodName,
    eventName: eventName,
    ref: ref,
  });
}

// // think we should take this out, put property bindings on the
// export function Method(eventName?: string): Function {
//     return methodFunc.bind(this, eventName);
// }
//
// function methodFunc(alias: string, target: Object, methodName: string) {
//     if (alias === null) {
//         console.error("ag-Grid: EventListener eventName should not be null");
//         return;
//     }
//
//     addToObjectProps(target, 'methods', {
//         methodName: methodName,
//         alias: alias
//     });
// }

/**
 * 给target对象添加__agComponentMetaData属性，
 * 该属性值值为对象，包括target.constructor.name，target.constructor.name.key
 * */
function addToObjectProps(target: Object, key: string, value: any): void {
  // it's an attribute on the class
  const props = getOrCreateProps(target, (target.constructor as any).name);

  if (!props[key]) {
    props[key] = [];
  }
  props[key].push(value);
}

/** 会给target对象添加__agComponentMetaData属性，并给该属性添加instanceName作为新属性，值为{} */
function getOrCreateProps(target: any, instanceName: string): any {
  if (!target.__agComponentMetaData) {
    target.__agComponentMetaData = {};
  }

  if (!target.__agComponentMetaData[instanceName]) {
    target.__agComponentMetaData[instanceName] = {};
  }

  return target.__agComponentMetaData[instanceName];
}
