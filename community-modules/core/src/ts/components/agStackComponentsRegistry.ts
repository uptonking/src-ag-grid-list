import { Bean, ComponentMeta } from '../context/context';
import { BeanStub } from '../context/beanStub';

/**
 * 将组件名,组件对应的class及元数据存放到 componentsMappedByName 映射表
 */
@Bean('agStackComponentsRegistry')
export class AgStackComponentsRegistry extends BeanStub {
  /** 存放component名称和定义class的映射表 */
  private componentsMappedByName: { [key: string]: any } = {};

  /** 将组件的名称和class添加到 componentsMappedByName映射表 */
  public setupComponents(components: ComponentMeta[]): void {
    if (components) {
      components.forEach((componentMeta) => this.addComponent(componentMeta));
    }
  }

  private addComponent(componentMeta: ComponentMeta): void {
    // get name of the class as a string
    // let className = _.getNameOfClass(ComponentClass);
    // insert a dash after every capital letter
    // let classEscaped = className.replace(/([A-Z])/g, "-$1").toLowerCase();
    const classEscaped = componentMeta.componentName
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    // put all to upper case
    const classUpperCase = classEscaped.toUpperCase();
    // finally store
    this.componentsMappedByName[classUpperCase] = componentMeta.componentClass;
  }

  public getComponentClass(htmlTag: string): any {
    return this.componentsMappedByName[htmlTag];
  }
}
