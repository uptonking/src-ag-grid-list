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

/** bean对象封装后的对象，包含bean对象实例、bean对象对应的class，bean名称 */
interface BeanWrapper {
  bean: any;
  beanInstance: any;
  beanName: any;
}

/**
 * Context是创建Grid的上下文信息，也是本框架全局单例的ioc容器，负责创建并保存所有bean对象实例。
 * 使用ioc的优点是方便解耦对象的创建和使用，同时方便批量对多个bean执行某种操作。
 */
export class Context {
  private logger: ILogger;

  /** 全局单例的ioc容器，是存放所有bean对象实例的映射表，包含rowModel的bean */
  private beanWrappers: { [key: string]: BeanWrapper } = {};
  /** 调用Context构造函数时传入的参数，主要包含所有bean对应的class */
  private contextParams: ContextParams;
  /** 所有bean对象是否已调用过destroy()方法 */
  private destroyed = false;

  /** Context初始化时的任务流程，
   * 1. 创建所有bean对象实例并存放到容器
   * 2. 为各bean注入属性中依赖的其他bean对象，
   * 3. 调用各bean的钩子方法
   */
  public constructor(params: ContextParams, logger: ILogger) {
    if (!params || !params.beanClasses) {
      return;
    }

    this.contextParams = params;

    this.logger = logger;
    this.logger.log('>> creating ag-Application Context');

    // 创建所有bean对象，只调用了构造函数，会注入构造函数依赖的其他bean对象
    this.createBeans();
    logObjSer('==createBeans, ', this.beanWrappers);

    // 获取ioc容器中所有bean对象存放到数组
    const beanInstances = this.getBeanInstances();

    // 给各bean对象注入自身属性值或方法参数依赖的其他bean，再调用各bean的钩子方法
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

  /** 给传入的单个bean参数对象注入其属性值中依赖的其他bean，并调用参数对象的钩子方法
   * pre/postConstructMethods，参数bean对象实际不在这里创建 */
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
   * 给所有beanInstances注入属性值或方法参数中依赖的其他bean，
   * 并调用各bean对象的钩子方法pre/postConstructMethods
   */
  private wireBeans(
    beanInstances: any[],
    afterPreCreateCallback?: (comp: Component) => void,
  ): void {
    // 给beanInstance设置通过属性字段注入的其他bean对象
    this.autoWireBeans(beanInstances);

    // 调用参数中带有依赖其他bean的方法，一般是调用setBeans方法
    this.methodWireBeans(beanInstances);

    // 调用 preConstructMethods
    this.callLifeCycleMethods(beanInstances, 'preConstructMethods');

    // 调用 afterPreCreateCallback，在这里可设置属性，然后在postConstruct方法中访问
    // the callback sets the attributes, so the component has access to attributes
    // before postConstruct methods in the component are executed
    if (_.exists(afterPreCreateCallback)) {
      beanInstances.forEach(afterPreCreateCallback);
    }

    // 调用 postConstructMethods
    this.callLifeCycleMethods(beanInstances, 'postConstructMethods');
  }

  /** 通过apply调用构造函数创建所有bean对象，存放到beanWrappers映射表，即ioc容器 */
  private createBeans(): void {
    // register all normal beans，
    // 向beanWrappers中添加beanEntry，bind(o)会创建函数的实例，函数中的this会指向参数o
    this.contextParams.beanClasses.forEach(this.createBeanWrapper.bind(this));
    // register override beans, these will overwrite beans above of same name

    // instantiate all beans - overridden beans will be left out
    _.iterateObject(
      this.beanWrappers,
      (key: string, beanEntry: BeanWrapper) => {
        let constructorParamsMeta: any;

        // 若bean.__agBeanMetaData.autowireMethods.agConstructor存在，即构造函数参数存在注入，
        // 对于最简单的clientSideRowModel，这个分支未执行
        if (
          beanEntry.bean.__agBeanMetaData &&
          beanEntry.bean.__agBeanMetaData.autowireMethods &&
          beanEntry.bean.__agBeanMetaData.autowireMethods.agConstructor
        ) {
          constructorParamsMeta =
            beanEntry.bean.__agBeanMetaData.autowireMethods.agConstructor;
          // console.log('=autowireMethods.agConstructor,', constructorParamsMeta);
        }

        // 获取创建bean时要传递给构造函数的参数，若constructorParamsMeta不存在，则会返回空数组
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
    // this.logger.log(`created beans: ${createdBeanNames}`);
  }

  /** 向beanWrappers容器添加beanName到beanEntry的映射 */
  private createBeanWrapper(Bean: new () => Object): void {
    const metaData = (Bean as any).__agBeanMetaData;

    // 若__agBeanMetaData元数据不存在，则打印error
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

  /** 查找beanInstance的原型链上所有构造函数通过agClassAttributes注入的其他bean对象，并添加到其属性 */
  private autoWireBeans(beanInstances: any[]): void {
    beanInstances.forEach((beanInstance) => {
      this.forEachMetaDataInHierarchy(
        beanInstance,
        (metaData: any, beanName: string) => {
          const attributes = metaData.agClassAttributes;
          if (!attributes) {
            return;
          }

          // 遍历agClassAttributes上存放的依赖其他bean的信息，再查找对应的bean对象
          attributes.forEach((attribute: any) => {
            const otherBean = this.lookupBeanInstance(
              beanName,
              attribute.beanName,
              attribute.optional,
            );
            // 在这里给bean实例对象添加其他bean对象作为属性
            beanInstance[attribute.attributeName] = otherBean;
          });
        },
      );
    });
  }

  /** 查找beanInstance原型链上所有构造函数通过autowireMethods注入的其他bean对象，并调用以参数注入该bean的方法 */
  private methodWireBeans(beanInstances: any[]): void {
    beanInstances.forEach((beanInstance) => {
      this.forEachMetaDataInHierarchy(
        beanInstance,
        (metaData: any, beanName: string) => {
          _.iterateObject(
            metaData.autowireMethods,
            (methodName: string, wireParams: any[]) => {
              // skip constructor, as this is dealt with elsewhere，
              // 构造函数在本文件的createBeans()方法中处理过了
              if (methodName === 'agConstructor') {
                return;
              }

              // 计算要传递给方法的实参对象
              const initParams = this.getBeansForParameters(
                wireParams,
                beanName,
              );
              // 通过apply调用参数中有其他bean对象注入的方法，在ag-grid框架中一般是调用setBeans方法
              beanInstance[methodName].apply(beanInstance, initParams);
            },
          );
        },
      );
    });
  }

  /**
   * 遍历`beanInstance.__proto__.constructor`各级构造函数读取__agBeanMetaData属性存放的元数据，
   * 然后执行 `callback(metaData, beanName)`
   */
  private forEachMetaDataInHierarchy(
    beanInstance: any,
    callback: (metaData: any, beanName: string) => void,
  ): void {
    // class CC的实例对象beanInstance的__proto__指向 CC.prototype
    let prototype: any = Object.getPrototypeOf(beanInstance);

    // 循环查找bean对象隐式原型及原型对象的隐式原型的constructor，检查__agBeanMetaData属性
    while (prototype != null) {
      const constructor: any = prototype.constructor;

      if (constructor.hasOwnProperty('__agBeanMetaData')) {
        const metaData = constructor.__agBeanMetaData;
        const beanName = this.getBeanName(constructor);

        // 传入构造函数上的元信息作为参数，然后执行方法，可以是调用autowireMethods指定的方法
        callback(metaData, beanName);
      }

      // 获取原型的原型，沿原型链查找构造函数
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

  /** 获取要传递给方法的参数数组对象，参数中可以包含作为依赖的其他bean对象 */
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

    // 之后会作为实参数组arguments使用
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

  /** 遍历调用所有bean对象的lifeCycleMethod，入口方法 */
  private callLifeCycleMethods(
    beanInstances: any[],
    lifeCycleMethod: string,
  ): void {
    // console.log('==', lifeCycleMethod);

    beanInstances.forEach((beanInstance: any) => {
      this.callLifeCycleMethodsOneBean(beanInstance, lifeCycleMethod);
    });
  }

  /** 调用一个bean对象的lifeCycleMethod方法，主要是pre/postConstruct/DestroyMethods，
   * 要注意查找方法名会在当前类及各级父类的静态属性上找，最终会调用当前类上的同名方法
   */
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
    // console.log('allMethods, ', allMethods);

    const allMethodsList = Object.keys(allMethods);

    // console.log(beanInstance.constructor.name, allMethodsList);

    // 遍历调用元数据中查找到的所有方法，方法作为beanInstance对象的属性调用时内部this指向自身对象
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
// applyToConstructor的另一种实现
// function applyConstructor(ctor, args) {
//   return new ctor(...args);
// }

/**
 * 以`@PreConstruct`注解形式使用的class属性装饰器，
 * 会给class的__agBeanMetaData静态属性加上`preConstructMethods`属性，
 * 会在对象创建、注入属性bean、注入方法参数bean后，afterPreCreateCallback之前，执行标注的钩子函数，
 * 本装饰器很少使用，如Component组件ui基类
 */
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

/**
 * 以`@PostConstruct`注解形式使用的class属性装饰器，
 * 会给class的__agBeanMetaData静态属性加上`postConstructMethods`属性，
 * 会在对象创建和依赖注入、preConstructMethods、afterPreCreateCallback之后，执行标注的钩子函数，
 * 只记录了方法名，可能最终调用的是子类的同名方法
 */
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

/**
 * 以`@PreDestroy`注解形式使用的class属性装饰器，
 * 会给class的__agBeanMetaData静态属性加上`preDestroyMethods`属性，在destroy前执行钩子函数
 */
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

/**
 * 以`@Bean(beanName)`注解形式使用的class装饰器工厂，
 * 会给bean class加上`__agBeanMetaData`静态属性，并设置该静态属性的beanName值，
 * 目的是存放本class类所创建的bean的名称，便于依赖注入时查找beanName
 * @param beanName 设置其作为__agBeanMetaData.beanName的值
 */
export function Bean(beanName: string): Function {
  return (classConstructor: any) => {
    const props = getOrCreateProps(classConstructor);
    props.beanName = beanName;
  };
}

/**
 * 以`@Autowired(beanName)`注解形式使用的class属性装饰器工厂，
 * 会给class的__agBeanMetaData静态属性加上`agClassAttributes`属性，用来存放class属性依赖的其他bean的名称
 * @param name 该属性依赖的bean对象的名称
 */
export function Autowired(name?: string): Function {
  /**
   * target：如果装饰器挂载于静态成员上，则会返回构造函数，如果挂载于实例成员上则会返回类的原型
   * propertyKey：装饰器挂载的属性成员名称
   * descriptor：成员的描述符，也就是Object.getOwnPropertyDescriptor的返回值
   */
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    autowiredFunc(target, name, false, target, propertyKey, null);
  };
}

/** `@Optional(beanName)`和`@Autowired(beanName)`相似，不同在于该属性依赖的bean是可选的，可不存在 */
export function Optional(name?: string): Function {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    autowiredFunc(target, name, true, target, propertyKey, null);
  };
}

/**
 * 给bean class的__agBeanMetaData静态属性设置agClassAttributes数组，存放class属性依赖的其他bean的名称
 * @param target bean对象
 * @param name 属性依赖的其他bean的名称
 * @param optional 是否可选
 * @param classPrototype class的原型对象
 * @param methodOrAttributeName 使用注解的属性名
 * @param index 索引
 */
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

  // 将使用注解装饰器的属性、该属性所依赖的bean等信息添加到__agBeanMetaData.agClassAttributes
  props.agClassAttributes.push({
    attributeName: methodOrAttributeName,
    beanName: name,
    optional: optional,
  });
}

/**
 * 以`@Qualifier(beanName)`注解形式使用的参数装饰器工厂，
 * 会给class的__agBeanMetaData静态属性加`autowireMethods`属性，存放class中方法参数依赖的其他bean的名称
 * @param name 该参数依赖的bean对象的名称
 */
export function Qualifier(name: string): Function {
  /**
   * classPrototype: 类的原型或类的构造函数
   * methodOrAttributeName: 参数所在函数的名称
   * index: 参数在形参中的位置索引
   */
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
      // it's a parameter on a method，代表参数装饰器所在方法的名称
      let methodName: string;
      if (methodOrAttributeName) {
        props = getOrCreateProps(constructor);
        methodName = methodOrAttributeName;
      } else {
        // 若是构造函数，则在这里设置统一的方法名agConstructor
        props = getOrCreateProps(constructor);
        methodName = 'agConstructor';
      }

      if (!props.autowireMethods) {
        props.autowireMethods = {};
      }
      // 给__agBeanMetaData属性添加一个属性，key为带有设置@Qualifier的参数的方法名
      if (!props.autowireMethods[methodName]) {
        props.autowireMethods[methodName] = {};
      }
      // 设置methodName的第index个参数所依赖的beanName
      props.autowireMethods[methodName][index] = name;
    }
  };
}

/**
 * 获取并返回target(class)参数对象的`__agBeanMetaData`属性值，该属性会存放target的属性或方法参数依赖的其他bean，
 * 若该属性不存在，则添加该属性并设置为{}
 */
function getOrCreateProps(target: any): any {
  if (!target.hasOwnProperty('__agBeanMetaData')) {
    target.__agBeanMetaData = {};
  }

  return target.__agBeanMetaData;
}
