import { ILogger } from '../iLogger';
import { Component } from '../widgets/component';
import { _ } from '../utils';
import { logObjSer } from '../utils/logUtils';

// steps in booting up:
// 1. create all beans
// 2. autowire all attributes
// 3. wire all beans
// 4. initialise the model
// 5. initialise the view
// 6. boot??? (not sure if this is needed)
// each bean is responsible for initialising itself, taking items from the gridOptionsWrapper

export interface ContextParams {
  providedBeanInstances: any;
  beanClasses: any[];
  debug: boolean;
}

export interface ComponentMeta {
  componentClass: new () => Object;
  componentName: string;
}

/** bean封装后的对象，包括bean对象实例、bean对应的class，bean名称 */
interface BeanWrapper {
  bean: any;
  beanInstance: any;
  beanName: any;
}

/**
 * Context是创建Grid的上下文，负责创建并存放所有bean
 */
export class Context {
  private logger: ILogger;

  /** 存放所有bean对象实例的映射表容器，包含rowModel的bean */
  private beanWrappers: { [key: string]: BeanWrapper } = {};

  /** 创建Grid时传入的上下文参数，主要包含所有bean对应的class */
  private contextParams: ContextParams;

  /** 所有bean对象是否已调用过destroy()方法 */
  private destroyed = false;

  /** Context初始化时的任务，创建所有bean对象并给bean注入属性 */
  public constructor(params: ContextParams, logger: ILogger) {
    if (!params || !params.beanClasses) {
      return;
    }

    this.contextParams = params;

    this.logger = logger;
    this.logger.log('>> creating ag-Application Context');

    // 创建所有bean对象，只调用构造函数，大多数属性未初始化
    this.createBeans();
    logObjSer('==createBeans, ', this.beanWrappers);

    // 获取所有bean对象存放到到数组
    const beanInstances = this.getBeanInstances();

    // 给所有bean对象注入属性里的值或其他bean，这里实现依赖注入
    this.wireBeans(beanInstances);
    logObjSer('==wireBeans, ', this.beanWrappers);

    this.logger.log('>> ag-Application Context ready - component is alive');
  }

  /** 从beanWrappers容器中取出所有bean对象实例构成的数组 */
  private getBeanInstances(): any[] {
    return _.values(this.beanWrappers).map(
      (beanEntry) => beanEntry.beanInstance,
    );
  }

  /** 给输入的bean对象注入属性，bean对象实际不在这里创建 */
  public createBean<T extends any>(
    bean: T,
    afterPreCreateCallback?: (comp: Component) => void,
  ): T {
    if (!bean) {
      throw Error(`Can't wire to bean since it is null`);
    }
    this.wireBeans([bean], afterPreCreateCallback);
    return bean;
  }

  /**
   * 给所有beanInstances对象注入属性，并调用生命周期方法pre/postConstructMethods
   */
  private wireBeans(
    beanInstances: any[],
    afterPreCreateCallback?: (comp: Component) => void,
  ): void {
    //
    this.autoWireBeans(beanInstances);

    //
    this.methodWireBeans(beanInstances);

    // 调用 preConstructMethods
    this.callLifeCycleMethods(beanInstances, 'preConstructMethods');

    // 调用 afterPreCreateCallback，在这里可设置属性
    // the callback sets the attributes, so the component has access to attributes
    // before postConstruct methods in the component are executed
    if (_.exists(afterPreCreateCallback)) {
      beanInstances.forEach(afterPreCreateCallback);
    }

    // 调用 postConstructMethods
    this.callLifeCycleMethods(beanInstances, 'postConstructMethods');
  }

  /** 通过apply调用构造函数创建所有bean对象，存放到beanWrappers映射表容器 */
  private createBeans(): void {
    // register all normal beans，bind(o)方法会创建一个函数的实例，函数中的this会指向参数o
    this.contextParams.beanClasses.forEach(this.createBeanWrapper.bind(this));
    // register override beans, these will overwrite beans above of same name

    // instantiate all beans - overridden beans will be left out
    _.iterateObject(
      this.beanWrappers,
      (key: string, beanEntry: BeanWrapper) => {
        let constructorParamsMeta: any;

        // 若bean class存在autowireMethods
        if (
          beanEntry.bean.__agBeanMetaData &&
          beanEntry.bean.__agBeanMetaData.autowireMethods &&
          beanEntry.bean.__agBeanMetaData.autowireMethods.agConstructor
        ) {
          constructorParamsMeta =
            beanEntry.bean.__agBeanMetaData.autowireMethods.agConstructor;
          // console.log('若bean class存在autowireMethods, ', beanEntry);
        }

        // 获取创建bean时要传递给构造函数的参数
        const constructorParams = this.getBeansForParameters(
          constructorParamsMeta,
          beanEntry.bean.name,
        );

        // 通过工具方法创建bean对象实例
        const newInstance = applyToConstructor(
          beanEntry.bean,
          constructorParams,
        );

        beanEntry.beanInstance = newInstance;
      },
    );

    const createdBeanNames = Object.keys(this.beanWrappers).join(', ');
    this.logger.log(`created beans: ${createdBeanNames}`);
  }

  /** 向beanWrappers容器添加beanName到beanEntry的映射 */
  private createBeanWrapper(Bean: new () => Object): void {
    const metaData = (Bean as any).__agBeanMetaData;

    // 若元数据不存在，则打印error
    if (!metaData) {
      let beanName: string;
      if (Bean.prototype.constructor) {
        beanName = Bean.prototype.constructor.name;
      } else {
        beanName = '' + Bean;
      }
      console.error('context item ' + beanName + ' is not a bean');
      return;
    }

    const beanEntry = {
      bean: Bean,
      beanInstance: null as any,
      beanName: metaData.beanName,
    };

    this.beanWrappers[metaData.beanName] = beanEntry;
  }

  /** 查找beanInstance的constructor原型链上通过agClassAttributes注入的其他bean，并添加到其属性 */
  private autoWireBeans(beanInstances: any[]): void {
    beanInstances.forEach((beanInstance) => {
      this.forEachMetaDataInHierarchy(
        beanInstance,
        (metaData: any, beanName: string) => {
          const attributes = metaData.agClassAttributes;
          if (!attributes) {
            return;
          }

          attributes.forEach((attribute: any) => {
            const otherBean = this.lookupBeanInstance(
              beanName,
              attribute.beanName,
              attribute.optional,
            );
            // 在这里给bean实例对象添加其他bean作为属性
            beanInstance[attribute.attributeName] = otherBean;
          });
        },
      );
    });
  }

  /** 查找beanInstance的constructor原型链上通过autowireMethods注入的其他bean，并添加到其属性 */
  private methodWireBeans(beanInstances: any[]): void {
    beanInstances.forEach((beanInstance) => {
      this.forEachMetaDataInHierarchy(
        beanInstance,
        (metaData: any, beanName: string) => {
          _.iterateObject(
            metaData.autowireMethods,
            (methodName: string, wireParams: any[]) => {
              // skip constructor, as this is dealt with elsewhere
              if (methodName === 'agConstructor') {
                return;
              }
              const initParams = this.getBeansForParameters(
                wireParams,
                beanName,
              );
              // 调用方法
              beanInstance[methodName].apply(beanInstance, initParams);
            },
          );
        },
      );
    });
  }

  /** 遍历`beanInstance.__proto__.constructor`,会执行 `callback(metaData, beanName)`*/
  private forEachMetaDataInHierarchy(
    beanInstance: any,
    callback: (metaData: any, beanName: string) => void,
  ): void {
    let prototype: any = Object.getPrototypeOf(beanInstance);

    // 循环查找bean对象及其父对象原型的constructor，检查__agBeanMetaData属性
    while (prototype != null) {
      const constructor: any = prototype.constructor;

      if (constructor.hasOwnProperty('__agBeanMetaData')) {
        const metaData = constructor.__agBeanMetaData;
        const beanName = this.getBeanName(constructor);

        // 任务可以是调用autowireMethods指定的方法
        callback(metaData, beanName);
      }

      prototype = Object.getPrototypeOf(prototype);
    }
  }

  /** 获取constructor.__agBeanMetaData.beanName中配置的beanName */
  private getBeanName(constructor: any): string {
    if (constructor.__agBeanMetaData && constructor.__agBeanMetaData.beanName) {
      return constructor.__agBeanMetaData.beanName;
    }

    const constructorString = constructor.toString();
    const beanName = constructorString.substring(
      9,
      constructorString.indexOf('('),
    );
    return beanName;
  }

  /** 获取创建bean时要传递给构造函数的参数，返回参数中包含的其他bean */
  private getBeansForParameters(parameters: any, beanName: string): any[] {
    const beansList: any[] = [];
    if (parameters) {
      _.iterateObject(
        parameters,
        (paramIndex: string, otherBeanName: string) => {
          const otherBean = this.lookupBeanInstance(beanName, otherBeanName);
          beansList[Number(paramIndex)] = otherBean;
        },
      );
    }
    return beansList;
  }

  /**
   * 根据bean名称查找bean对象实例，会从beanWrappers容器和传入的providedBeanInstances中查找
   * @param wiringBean 作用是,在未找到bean时,打印wiringBean的错误信息
   * @param beanName 名称
   * @param optional bean实例是否可空,默认false,默认情况下,若未找到bean会在console打印error
   */
  private lookupBeanInstance(
    wiringBean: string,
    beanName: string,
    optional = false,
  ): any {
    if (beanName === 'context') {
      return this;
    } else if (
      this.contextParams.providedBeanInstances &&
      this.contextParams.providedBeanInstances.hasOwnProperty(beanName)
    ) {
      return this.contextParams.providedBeanInstances[beanName];
    } else {
      const beanEntry = this.beanWrappers[beanName];
      if (beanEntry) {
        return beanEntry.beanInstance;
      }
      if (!optional) {
        console.error(
          'ag-Grid: unable to find bean reference ' +
            beanName +
            ' while initialising ' +
            wiringBean,
        );
      }
      return null;
    }
  }

  /** 循环调用所有bean的lifeCycleMethod，入口方法 */
  private callLifeCycleMethods(
    beanInstances: any[],
    lifeCycleMethod: string,
  ): void {
    beanInstances.forEach((beanInstance: any) => {
      this.callLifeCycleMethodsOneBean(beanInstance, lifeCycleMethod);
    });
  }

  /** 调用一个bean对象的声明周期方法 */
  private callLifeCycleMethodsOneBean(
    beanInstance: any,
    lifeCycleMethod: string,
    methodToIgnore?: string,
  ): void {
    // putting all methods into a map removes duplicates
    const allMethods: { [methodName: string]: boolean } = {};

    // dump methods from each level of the metadata hierarchy
    this.forEachMetaDataInHierarchy(beanInstance, (metaData: any) => {
      const methods = metaData[lifeCycleMethod] as string[];
      if (methods) {
        methods.forEach((methodName) => {
          if (methodName != methodToIgnore) {
            allMethods[methodName] = true;
          }
        });
      }
    });

    const allMethodsList = Object.keys(allMethods);
    allMethodsList.forEach((methodName) => beanInstance[methodName]());
  }

  /** 从bean容器中根据名称,查找bean对象实例 */
  public getBean(name: string): any {
    return this.lookupBeanInstance('getBean', name, true);
  }

  /** 调用所有bean对象的destroy()方法及destroy声明周期相关方法 */
  public destroy(): void {
    // should only be able to destroy once
    if (this.destroyed) {
      return;
    }
    this.logger.log('>> Shutting down ag-Application Context');

    const beanInstances = this.getBeanInstances();
    this.destroyBeans(beanInstances);

    this.contextParams.providedBeanInstances = null;

    this.destroyed = true;
    this.logger.log('>> ag-Application Context shut down - component is dead');
  }

  public destroyBean<T extends any>(bean: T): T {
    if (!bean) {
      return undefined;
    }
    this.destroyBeans([bean]);
    return undefined;
  }

  /** 调用所有bean对象的preDestroyMethods和destroy()方法 */
  public destroyBeans<T extends any>(beans: T[]): T[] {
    if (!beans) {
      return [];
    }

    beans.forEach((bean) => {
      this.callLifeCycleMethodsOneBean(bean, 'preDestroyMethods', 'destroy');

      // call destroy() explicitly if it exists
      if ((bean as any).destroy) {
        (bean as any).destroy();
      }
    });

    return [];
  }
}

// taken from: http://stackoverflow.com/questions/3362471/how-can-i-call-a-javascript-constructor-using-call-or-apply
/** allows calling 'apply' on a constructor，根据构造函数创建对象的通用方法，使用apply调用构造函数 */
function applyToConstructor(constructor: Function, argArray: any[]) {
  const args = [null].concat(argArray);
  const factoryFunction = constructor.bind.apply(constructor, args);
  return new factoryFunction();
}
// 另一种实现
// function applyConstructor(ctor, args) {
//   return new ctor(...args);
// }
export function PreConstruct(
  target: Object,
  methodName: string,
  descriptor: TypedPropertyDescriptor<any>,
): void {
  const props = getOrCreateProps(target.constructor);
  if (!props.preConstructMethods) {
    props.preConstructMethods = [];
  }
  props.preConstructMethods.push(methodName);
}

export function PostConstruct(
  target: Object,
  methodName: string,
  descriptor: TypedPropertyDescriptor<any>,
): void {
  const props = getOrCreateProps(target.constructor);
  if (!props.postConstructMethods) {
    props.postConstructMethods = [];
  }
  props.postConstructMethods.push(methodName);
}

export function PreDestroy(
  target: Object,
  methodName: string,
  descriptor: TypedPropertyDescriptor<any>,
): void {
  const props = getOrCreateProps(target.constructor);
  if (!props.preDestroyMethods) {
    props.preDestroyMethods = [];
  }
  props.preDestroyMethods.push(methodName);
}

export function Bean(beanName: string): Function {
  return (classConstructor: any) => {
    const props = getOrCreateProps(classConstructor);
    props.beanName = beanName;
  };
}

export function Autowired(name?: string): Function {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    autowiredFunc(target, name, false, target, propertyKey, null);
  };
}

export function Optional(name?: string): Function {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    autowiredFunc(target, name, true, target, propertyKey, null);
  };
}

function autowiredFunc(
  target: any,
  name: string,
  optional: boolean,
  classPrototype: any,
  methodOrAttributeName: string,
  index: number,
) {
  if (name === null) {
    console.error('ag-Grid: Autowired name should not be null');
    return;
  }
  if (typeof index === 'number') {
    console.error('ag-Grid: Autowired should be on an attribute');
    return;
  }

  // it's an attribute on the class
  const props = getOrCreateProps(target.constructor);
  if (!props.agClassAttributes) {
    props.agClassAttributes = [];
  }
  props.agClassAttributes.push({
    attributeName: methodOrAttributeName,
    beanName: name,
    optional: optional,
  });
}

export function Qualifier(name: string): Function {
  return (
    classPrototype: any,
    methodOrAttributeName: string,
    index: number,
  ) => {
    const constructor: any =
      typeof classPrototype == 'function'
        ? classPrototype
        : classPrototype.constructor;
    let props: any;

    if (typeof index === 'number') {
      // it's a parameter on a method
      let methodName: string;
      if (methodOrAttributeName) {
        props = getOrCreateProps(constructor);
        methodName = methodOrAttributeName;
      } else {
        props = getOrCreateProps(constructor);
        methodName = 'agConstructor';
      }
      if (!props.autowireMethods) {
        props.autowireMethods = {};
      }
      if (!props.autowireMethods[methodName]) {
        props.autowireMethods[methodName] = {};
      }
      props.autowireMethods[methodName][index] = name;
    }
  };
}

function getOrCreateProps(target: any): any {
  if (!target.hasOwnProperty('__agBeanMetaData')) {
    target.__agBeanMetaData = {};
  }

  return target.__agBeanMetaData;
}
