import { AgEvent } from '../events';
import { Autowired, PostConstruct, PreConstruct } from '../context/context';
import { AgStackComponentsRegistry } from '../components/agStackComponentsRegistry';
import { BeanStub } from '../context/beanStub';
import { _, NumberSequence, logObjSer, jsonFnStringify } from '../utils';

const compIdSequence = new NumberSequence();

export interface VisibleChangedEvent extends AgEvent {
  visible: boolean;
}

/**
 * 可以渲染到dom元素的组件，可以对渲染的ui的样式、属性进行crud，还可以创建子组件的DOM元素
 */
export class Component extends BeanStub {
  public static EVENT_DISPLAYED_CHANGED = 'displayedChanged';
  /** 本组件渲染到页面时对应的dom元素对象 */
  private eGui: HTMLElement;
  /** 存放注册到本dom元素上的事件监听器列表，实际上注册到了dom元素上 */
  private annotatedGuiListeners: any[] = [];

  @Autowired('agStackComponentsRegistry')
  protected agStackComponentsRegistry: AgStackComponentsRegistry;

  // if false, then CSS class "ag-hidden" is applied, which sets "display: none"
  private displayed = true;

  // if false, then CSS class "ag-invisible" is applied, which sets "visibility: hidden"
  private visible = true;

  protected parentComponent: Component | undefined;

  // unique id for this row component. this is used for getting a reference to the HTML dom.
  // we cannot use the RowNode id as this is not unique (due to animation, old rows can be lying
  // around as we create a new rowComp instance for the same row node).
  private compId = compIdSequence.next();

  constructor(template?: string) {
    // 基类BeanStub的构造函数是自动生成的默认为空的构造函数，这里啥事没干
    super();

    if (template) {
      this.setTemplate(template);
    }
  }

  @PreConstruct
  private createChildComponentsPreConstruct(): void {
    // ui exists if user sets template in constructor.
    // when this happens, we have to wait for the context
    // to be autoWired first before we can create child components.
    if (!!this.getGui()) {
      this.createChildComponentsFromTags(this.getGui());
    }
  }

  @PostConstruct
  private addAnnotatedGridEventListeners(): void {
    const listenerMetas = this.getAgComponentMetaData('gridListenerMethods');

    if (!listenerMetas) {
      return;
    }

    listenerMetas.forEach((meta) => {
      const listener = (this as any)[meta.methodName].bind(this);
      this.addManagedListener(this.eventService, meta.eventName, listener);
    });
  }

  public getCompId(): number {
    return this.compId;
  }

  /** 递归地查找parentNode元素及其子元素，对各级元素创建ag-grid中对应的组件。
   * 这里会创建自定义html元素如grid-header-body-pagination对应的组件实例。
   * for registered components only, eg creates AgCheckbox instance
   * from ag-checkbox HTML tag */
  private createChildComponentsFromTags(
    parentNode: Element,
    paramsMap?: any,
  ): void {
    // we MUST take a copy of the list first, as 'swapComponentForNode' adds
    // comments into the DOM, which messes up traversal order of the children.
    const childNodeList: Node[] = _.copyNodeList(parentNode.childNodes);

    _.forEach(childNodeList, (childNode) => {
      if (!(childNode instanceof HTMLElement)) {
        return;
      }
      logObjSer('childNode, ', childNode);

      // 若childNode是HTMLElement类型，则读取ref属性，计算对应的Component组件并创建对象
      const childComp = this.createComponentFromElement(
        childNode,
        (childComp) => {
          // copy over all attributes, including css classes,
          // so any attributes user put on the tag wll be carried across
          this.copyAttributesFromNode(childNode, childComp.getGui());
        },
        paramsMap,
      );

      // logObjSer('childComp, ', childComp);
      // 若找到了子元素对应的组件
      if (childComp) {
        // 递归地查找并创建子组件，然后将子组件添加到该组件
        if ((childComp as any).addItems && childNode.children.length) {
          this.createChildComponentsFromTags(childNode);

          // converting from HTMLCollection to Array
          const items = Array.prototype.slice.call(childNode.children);

          (childComp as any).addItems(items);
        }
        // replace the tag (eg ag-checkbox) with the proper HTMLElement (eg 'div') in the dom
        this.swapComponentForNode(childComp, parentNode, childNode);
      } else if (childNode.childNodes) {
        // 若没找到子元素对应的组件，且子元素仍存在子元素
        this.createChildComponentsFromTags(childNode);
      }
    });
  }

  /** 根据传入的HTMLElement对象，从agStackComponentsRegistry查找对应的Component组件类，
   * 然后创建并返回该组件类的对象依赖注入后的实例 */
  public createComponentFromElement(
    element: HTMLElement,
    afterPreCreateCallback?: (comp: Component) => void,
    paramsMap?: any,
  ): Component {
    // 注意，html5规范中要求，元素的nodeName总是大写字母，恰好组件映射表中组件名也是大写
    const key = element.nodeName;
    console.log('key, ', key);

    const componentParams = paramsMap
      ? paramsMap[element.getAttribute('ref')]
      : undefined;
    const ComponentClass = this.agStackComponentsRegistry.getComponentClass(
      key,
    );
    console.log('key-ComponentClass, ', ComponentClass);

    if (ComponentClass) {
      const newComponent = new ComponentClass(componentParams) as Component;
      this.createBean(newComponent, null, afterPreCreateCallback);
      return newComponent;
    }
    return null;
  }

  private copyAttributesFromNode(source: Element, dest: Element): void {
    _.iterateNamedNodeMap(source.attributes, (name, value) =>
      dest.setAttribute(name, value),
    );
  }

  private swapComponentForNode(
    newComponent: Component,
    parentNode: Element,
    childNode: Node,
  ): void {
    const eComponent = newComponent.getGui();
    parentNode.replaceChild(eComponent, childNode);
    parentNode.insertBefore(
      document.createComment(childNode.nodeName),
      eComponent,
    );
    this.addDestroyFunc(this.destroyBean.bind(this, newComponent));
    this.swapInComponentForQuerySelectors(newComponent, childNode);
  }

  private swapInComponentForQuerySelectors(
    newComponent: Component,
    childNode: Node,
  ): void {
    const thisNoType = this as any;

    this.iterateOverQuerySelectors((querySelector: any) => {
      if (thisNoType[querySelector.attributeName] === childNode) {
        thisNoType[querySelector.attributeName] = newComponent;
      }
    });
  }

  /** 遍历本对象各级原型对象的__agComponentMetaData的querySelectors属性值，并作为参数传递给action函数 */
  private iterateOverQuerySelectors(
    action: (querySelector: any) => void,
  ): void {
    let thisPrototype: any = Object.getPrototypeOf(this);

    while (thisPrototype != null) {
      const metaData = thisPrototype.__agComponentMetaData;
      const currentProtoName = thisPrototype.constructor.name;

      if (
        metaData &&
        metaData[currentProtoName] &&
        metaData[currentProtoName].querySelectors
      ) {
        _.forEach(
          metaData[currentProtoName].querySelectors,
          (querySelector: any) => action(querySelector),
        );
      }

      thisPrototype = Object.getPrototypeOf(thisPrototype);
    }
  }

  /** 将传入的dom元素字符串创建成dom元素对象，并赋值给this.eGui，
   * 再给dom对象添加通过装饰器指定的事件监听器和选择器执行结果 */
  public setTemplate(template: string, paramsMap?: any): void {
    const eGui = _.loadTemplate(template as string);
    logObjSer('==eGui, ', eGui);
    this.setTemplateFromElement(eGui, paramsMap);
  }

  public setTemplateFromElement(element: HTMLElement, paramsMap?: any): void {
    this.eGui = element;
    (this.eGui as any).__agComponent = this;

    this.addAnnotatedGuiEventListeners();
    this.wireQuerySelectors();

    // context will not be available when user sets template in constructor
    if (!!this.getContext()) {
      // 注意，若子类对象实例被依赖注入全局单例的context对象后，会执行这里
      this.createChildComponentsFromTags(this.getGui(), paramsMap);
    }
  }

  /**
   * 查找各级原型对象的__agComponentMetaData的querySelectors属性值，并执行选择器，
   * 将结果保存到本对象的属性
   */
  protected wireQuerySelectors(): void {
    if (!this.eGui) {
      return;
    }

    const thisNoType = this as any;

    this.iterateOverQuerySelectors((querySelector: any) => {
      const resultOfQuery = this.eGui.querySelector(
        querySelector.querySelector,
      );

      if (resultOfQuery) {
        // 将选择器查找结果本身或结果的__agComponent属性值，保存到this对象的属性
        thisNoType[querySelector.attributeName] =
          (resultOfQuery as any).__agComponent || resultOfQuery;
      } else {
        // put debug msg in here if query selector fails???
      }
    });
  }

  /**
   * 查找各级原型对象的_agComponentMetaData的guiListenerMethods属性值，
   * 并将事件注册到this.eGui的dom元素上
   */
  private addAnnotatedGuiEventListeners(): void {
    this.removeAnnotatedGuiEventListeners();

    if (!this.eGui) {
      return;
    }

    // 获取各级原型对象__agComponentMetaData元数据中的guiListenerMethods属性值
    const listenerMethods = this.getAgComponentMetaData('guiListenerMethods');

    if (!listenerMethods) {
      return;
    }

    if (!this.annotatedGuiListeners) {
      this.annotatedGuiListeners = [];
    }

    listenerMethods.forEach((meta) => {
      // 从装饰器获取ref元数据，然后在当前元素内查找this.eGui.querySelector([ref=?])
      const element = this.getRefElement(meta.ref);
      if (!element) {
        return;
      }
      const listener = (this as any)[meta.methodName].bind(this);
      // 给dom元素添加事件监听器
      element.addEventListener(meta.eventName, listener);
      this.annotatedGuiListeners.push({
        eventName: meta.eventName,
        listener,
        element,
      });
    });
  }

  /**
   * 从各级构造函数原型对象的`__agComponentMetaData`属性值中查找key属性的值的集合
   */
  private getAgComponentMetaData(key: string): any[] {
    let res: any[] = [];

    let thisProto: any = Object.getPrototypeOf(this);

    while (thisProto != null) {
      const metaData = thisProto.__agComponentMetaData;
      let currentProtoName = thisProto.constructor.name;

      // IE does not support Function.prototype.name, so we need to extract
      // the name using a RegEx
      // from: https://matt.scharley.me/2012/03/monkey-patch-name-ie.html
      if (currentProtoName === undefined) {
        const funcNameRegex = /function\s([^(]{1,})\(/;
        const results = funcNameRegex.exec(thisProto.constructor.toString());

        if (results && results.length > 1) {
          currentProtoName = results[1].trim();
        }
      }

      if (
        metaData &&
        metaData[currentProtoName] &&
        metaData[currentProtoName][key]
      ) {
        res = res.concat(metaData[currentProtoName][key]);
      }

      thisProto = Object.getPrototypeOf(thisProto);
    }

    return res;
  }

  private removeAnnotatedGuiEventListeners(): void {
    if (!this.annotatedGuiListeners) {
      return;
    }

    _.forEach(this.annotatedGuiListeners, (e) => {
      e.element.removeEventListener(e.eventName, e.listener);
    });

    this.annotatedGuiListeners = [];
  }

  /** 返回本ui组件对应的dom对象，即this.eGui */
  public getGui(): HTMLElement {
    return this.eGui;
  }

  // this method is for older code, that wants to provide the gui element,
  // it is not intended for this to be in ag-Stack
  protected setGui(eGui: HTMLElement): void {
    this.eGui = eGui;
  }

  /** 直接返回this.eGui作为当前获得焦点的元素 */
  public getFocusableElement(): HTMLElement {
    return this.eGui;
  }

  public setParentComponent(component: Component) {
    this.parentComponent = component;
  }

  public getParentComponent(): Component | undefined {
    return this.parentComponent;
  }

  /** 会对this.eGui这个dom元素对象执行选择器查找 querySelector(cssSelector) */
  protected queryForHtmlElement(cssSelector: string): HTMLElement {
    return this.eGui.querySelector(cssSelector) as HTMLElement;
  }

  protected queryForHtmlInputElement(cssSelector: string): HTMLInputElement {
    return this.eGui.querySelector(cssSelector) as HTMLInputElement;
  }

  public appendChild(
    newChild: HTMLElement | Component,
    container?: HTMLElement,
  ): void {
    if (!container) {
      container = this.eGui;
    }

    if (_.isNodeOrElement(newChild)) {
      container.appendChild(newChild as HTMLElement);
    } else {
      const childComponent = newChild as Component;
      container.appendChild(childComponent.getGui());
      this.addDestroyFunc(this.destroyBean.bind(this, childComponent));
    }
  }

  public isDisplayed(): boolean {
    return this.displayed;
  }

  public setVisible(visible: boolean): void {
    if (visible !== this.visible) {
      this.visible = visible;

      _.setVisible(this.eGui, visible);
    }
  }

  public setDisplayed(displayed: boolean): void {
    if (displayed !== this.displayed) {
      this.displayed = displayed;

      _.setDisplayed(this.eGui, displayed);

      const event: VisibleChangedEvent = {
        type: Component.EVENT_DISPLAYED_CHANGED,
        visible: this.displayed,
      };

      this.dispatchEvent(event);
    }
  }

  protected destroy(): void {
    this.removeAnnotatedGuiEventListeners();
    super.destroy();
  }

  public addGuiEventListener(
    event: string,
    listener: (event: any) => void,
  ): void {
    this.eGui.addEventListener(event, listener);
    this.addDestroyFunc(() => this.eGui.removeEventListener(event, listener));
  }

  public addCssClass(className: string): void {
    _.addCssClass(this.eGui, className);
  }

  public removeCssClass(className: string): void {
    _.removeCssClass(this.eGui, className);
  }

  public addOrRemoveCssClass(className: string, addOrRemove: boolean): void {
    _.addOrRemoveCssClass(this.eGui, className, addOrRemove);
  }

  public getAttribute(key: string): string | null {
    const { eGui } = this;
    return eGui ? eGui.getAttribute(key) : null;
  }

  /** 查找dom元素上带有ref属性且ref值为refName的第一个dom元素对象 */
  public getRefElement(refName: string): HTMLElement {
    return this.queryForHtmlElement(`[ref="${refName}"]`);
  }
}
