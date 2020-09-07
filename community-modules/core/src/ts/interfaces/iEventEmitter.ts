/** 加减事件监听器的接口，仅2个方法，add/removeEventListener */
export interface IEventEmitter {
  addEventListener(
    eventType: string,
    listener: EventListener,
    async?: boolean,
    options?: AddEventListenerOptions,
  ): void;
  removeEventListener(
    eventType: string,
    listener: EventListener,
    async?: boolean,
    options?: AddEventListenerOptions,
  ): void;
}
