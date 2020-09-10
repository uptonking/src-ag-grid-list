import { Logger } from './logger';
import { LoggerFactory } from './logger';
import { Bean } from './context/context';
import { Qualifier } from './context/context';
import { IEventEmitter } from './interfaces/iEventEmitter';
import { GridOptionsWrapper } from './gridOptionsWrapper';
import { AgEvent } from './events';
import { logObjSer } from './utils/logUtils';

/**
 * 处理事件监听器的add/remove，以及通过dispatchEvent触发事件
 */
@Bean('eventService')
export class EventService implements IEventEmitter {
  private logger: Logger;

  private allSyncListeners = new Map<string, Set<Function>>();
  private allAsyncListeners = new Map<string, Set<Function>>();

  private globalSyncListeners = new Set<Function>();
  private globalAsyncListeners = new Set<Function>();

  /** 需要异步执行的事件处理函数的链表 */
  private asyncFunctionsQueue: Function[] = [];
  /** 是否计划在setTimeout中执行异步函数，默认false */
  private scheduled = false;

  // using an object performs better than a Set for the number of different events we have
  /** 触发过的events的映射表，key是event.type */
  private firedEvents: { [key: string]: boolean } = {};

  // because this class is used both inside the context and outside the context, we do not
  // use autowired attributes, as that would be confusing, as sometimes the attributes
  // would be wired, and sometimes not.
  //
  // the global event servers used by ag-Grid is autowired by the context once, and this
  // setBeans method gets called once.
  //
  // the times when this class is used outside of the context (eg RowNode has an instance of this
  // class) then it is not a bean, and this setBeans method is not called.
  // globalEventListener is used by Web Components, 默认为null
  public setBeans(
    @Qualifier('loggerFactory') loggerFactory: LoggerFactory,
    @Qualifier('gridOptionsWrapper') gridOptionsWrapper: GridOptionsWrapper,
    @Qualifier('globalEventListener') globalEventListener: Function = null,
  ) {
    this.logger = loggerFactory.create('EventService');

    if (globalEventListener) {
      const async = gridOptionsWrapper.useAsyncEvents();
      this.addGlobalListener(globalEventListener, async);
    }
  }

  /** 查找eventType类型的listeners列表 */
  private getListeners(eventType: string, async: boolean): Set<Function> {
    const listenerMap = async ? this.allAsyncListeners : this.allSyncListeners;
    let listeners = listenerMap.get(eventType);

    // 若listeners不存在，则添加进空的
    if (!listeners) {
      listeners = new Set<Function>();
      listenerMap.set(eventType, listeners);
    }

    return listeners;
  }

  public addEventListener(
    eventType: string,
    listener: Function,
    async = false,
  ): void {
    this.getListeners(eventType, async).add(listener);
  }

  public removeEventListener(
    eventType: string,
    listener: Function,
    async = false,
  ): void {
    this.getListeners(eventType, async).delete(listener);
  }

  public addGlobalListener(listener: Function, async = false): void {
    (async ? this.globalAsyncListeners : this.globalSyncListeners).add(
      listener,
    );
  }

  public removeGlobalListener(listener: Function, async = false): void {
    (async ? this.globalAsyncListeners : this.globalSyncListeners).delete(
      listener,
    );
  }

  /** 触发event，注意这里会触发2次，第1次触发所有异步事件，第2次触发所有同步事件 */
  public dispatchEvent(event: AgEvent): void {
    this.dispatchToListeners(event, true);
    this.dispatchToListeners(event, false);

    this.firedEvents[event.type] = true;
  }

  /** 只触发一次event事件，若event正在firedEvents映射表中，则不重复触发 */
  public dispatchEventOnce(event: AgEvent): void {
    if (!this.firedEvents[event.type]) {
      this.dispatchEvent(event);
    }
  }

  /**
   * 根据event.type查找监听器，并触发监听的事件处理函数
   * @param event 事件
   * @param async 是否异步
   */
  private dispatchToListeners(event: AgEvent, async: boolean) {
    const eventType = event.type;

    /** 执行事件处理函数的方法，若是异步，则使用setTimeout分批调用，若是同步，则直接调用事件处理函数 */
    const processEventListeners = (listeners: Set<Function>) =>
      listeners.forEach((listener) => {
        if (async) {
          this.dispatchAsync(() => listener(event));
        } else {
          listener(event);
        }
      });

    const listeners = this.getListeners(eventType, async);
    // if (event.type === 'gridReady') {
    //   logObjSer('gridReady, ', listeners);
    // }

    processEventListeners(listeners);

    const globalListeners = async
      ? this.globalAsyncListeners
      : this.globalSyncListeners;
    // if (event.type === 'gridReady') {
    //   logObjSer('gridReady, ', globalListeners);
    // }

    globalListeners.forEach((listener) => {
      if (async) {
        this.dispatchAsync(() => listener(eventType, event));
      } else {
        listener(eventType, event);
      }
    });
  }

  // this gets called inside the grid's thread, for each event that it
  // wants to set async.
  // the grid then batches the events into one setTimeout().
  // because setTimeout() is an expensive operation, ideally we would have
  // each event in it's own setTimeout(), but we batch for performance.
  /** 异步触发的event会在setTimeOut中批量执行 */
  private dispatchAsync(func: Function): void {
    // add to the queue for executing later in the next VM turn
    this.asyncFunctionsQueue.push(func);

    // check if timeout is already scheduled.
    // the first time the grid calls this within it's thread turn, this should
    // be false, so it will schedule the 'flush queue' method the first time
    // it comes here.
    // then the flag is set to 'true' so it will know it's already scheduled
    //  for subsequent calls.
    if (!this.scheduled) {
      // if not scheduled, schedule one
      window.setTimeout(this.flushAsyncQueue.bind(this), 0);
      // mark that it is scheduled
      this.scheduled = true;
    }
  }
  // queue as we are flushing it.

  /** this happens in the next VM turn only, and empties the queue of events */
  private flushAsyncQueue(): void {
    this.scheduled = false;

    // we take a copy, because the event listener could be using
    // the grid, which would cause more events, which would be potentially
    // added to the queue, so safe to take a copy, the new events will
    // get executed in a later VM turn rather than risk updating the
    // queue as we are flushing it.
    const queueCopy = this.asyncFunctionsQueue.slice();
    this.asyncFunctionsQueue = [];

    // execute the queue
    queueCopy.forEach((func) => func());
  }
}
