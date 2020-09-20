import { IEventEmitter } from '../interfaces/iEventEmitter';
import { EventService } from '../eventService';
import { GridOptionsWrapper } from '../gridOptionsWrapper';
import { AgEvent } from '../events';
import { Autowired, Context, PreDestroy } from './context';
import { IFrameworkOverrides } from '../interfaces/iFrameworkOverrides';
import { Component } from '../widgets/component';
import { _ } from '../utils';

/**
 * bean的基类，无父类且只实现了IEventEmitter一个接口，
 * 可以加减事件监听器、触发事件、触发bean的destroyed事件及PreDestroy钩子方法，
 * 通过依赖注入只初始化context、eventService、frameworkOverrides3个bean，
 * 每个bean对象都持有自己的localEventService，非共享。
 */
export class BeanStub implements IEventEmitter {
  public static EVENT_DESTROYED = 'destroyed';

  @Autowired('frameworkOverrides')
  private frameworkOverrides: IFrameworkOverrides;
  @Autowired('context') protected context: Context;
  /** ioc容器中全局单例的事件管理中心 */
  @Autowired('eventService') protected eventService: EventService;

  /** 每个Bean对象都有自己的localEventService，非共享，不通过依赖注入初始化 */
  protected localEventService: EventService;

  private destroyFunctions: (() => void)[] = [];
  private destroyed = false;

  // this was a test constructor niall built, when active, it prints after 5 seconds all beans/components that are
  // not destroyed. to use, create a new grid, then api.destroy() before 5 seconds. then anything that gets printed
  // points to a bean or component that was not properly disposed of.
  // constructor() {
  //     setTimeout(()=> {
  //         if (this.isAlive()) {
  //             let prototype: any = Object.getPrototypeOf(this);
  //             const constructor: any = prototype.constructor;
  //             const constructorString = constructor.toString();
  //             const beanName = constructorString.substring(9, constructorString.indexOf("("));
  //             console.log('is alive ' + beanName);
  //         }
  //     }, 5000);
  // }

  // CellComp and GridComp and override this because they get the FrameworkOverrides from the Beans bean
  protected getFrameworkOverrides(): IFrameworkOverrides {
    return this.frameworkOverrides;
  }

  /** 获取对象的context属性 */
  public getContext = (): Context => this.context;

  @PreDestroy
  protected destroy(): void {
    // let prototype: any = Object.getPrototypeOf(this);
    // const constructor: any = prototype.constructor;
    // const constructorString = constructor.toString();
    // const beanName = constructorString.substring(9, constructorString.indexOf("("));

    this.destroyFunctions.forEach((func) => func());
    this.destroyFunctions.length = 0;
    this.destroyed = true;

    this.dispatchEvent({ type: BeanStub.EVENT_DESTROYED });
  }

  /** 添加事件监听器到 this.localEventService */
  public addEventListener(eventType: string, listener: Function): void {
    if (!this.localEventService) {
      this.localEventService = new EventService();
    }

    this.localEventService.addEventListener(eventType, listener);
  }

  /** 从 this.localEventService 移除事件监听器 */
  public removeEventListener(eventType: string, listener: Function): void {
    if (this.localEventService) {
      this.localEventService.removeEventListener(eventType, listener);
    }
  }

  public dispatchEventAsync(event: AgEvent): void {
    window.setTimeout(() => this.dispatchEvent(event), 0);
  }

  /** 调用localEventService的dispatchEvent方法 */
  public dispatchEvent<T extends AgEvent>(event: T): void {
    if (this.localEventService) {
      this.localEventService.dispatchEvent(event);
    }
  }

  /**
   * 给object对象添加event类型的事件处理函数listener，再将object的清理函数加入destroyFunctions列表
   * @param object 要添加listener的目标对象
   * @param event 事件类型
   * @param listener 事件处理函数
   */
  public addManagedListener(
    object: Window | HTMLElement | GridOptionsWrapper | IEventEmitter,
    event: string,
    listener: (event?: any) => void,
  ): (() => null) | undefined {
    if (this.destroyed) {
      return;
    }

    if (object instanceof HTMLElement) {
      _.addSafePassiveEventListener(
        this.getFrameworkOverrides(),
        object as HTMLElement,
        event,
        listener,
      );
    } else {
      object.addEventListener(event, listener);
    }

    const destroyFunc: () => null = () => {
      object.removeEventListener(event, listener);

      this.destroyFunctions = this.destroyFunctions.filter(
        (fn) => fn !== destroyFunc,
      );

      return null;
    };

    this.destroyFunctions.push(destroyFunc);

    return destroyFunc;
  }

  /** 若bean未destroyed，则isAlive为true */
  public isAlive = (): boolean => !this.destroyed;

  public addDestroyFunc(func: () => void): void {
    if (this.isAlive()) {
      this.destroyFunctions.push(func);
    } else {
      // if we are already destroyed, we execute the func now
      func();
    }
  }

  /** 给传入的参数bean对象注入其依赖的其他bean，再给参数bean的destroyFunctions属性加入销毁时需要调用的方法 */
  public createManagedBean<T>(bean: T, context?: Context): T {
    const res = this.createBean(bean, context);
    this.addDestroyFunc(this.destroyBean.bind(this, bean, context));
    return res;
  }

  /** 给传入的bean参数对象注入其属性值中依赖的其他bean，并调用该对象的钩子方法
   * pre/postConstructMethods，bean对象实际不在这里创建 */
  protected createBean<T>(
    bean: T,
    context?: Context,
    afterPreCreateCallback?: (comp: Component) => void,
  ): T {
    return (context || this.getContext()).createBean(
      bean,
      afterPreCreateCallback,
    );
  }

  protected destroyBean<T>(bean: T, context?: Context): T {
    return (context || this.getContext()).destroyBean(bean);
  }

  protected destroyBeans<T>(beans: T[], context?: Context): T[] {
    if (beans) {
      beans.forEach((bean) => this.destroyBean(bean, context));
    }
    return [];
  }
}
