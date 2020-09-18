import { Bean, ComponentMeta } from '../context/context';
import { BeanStub } from '../context/beanStub';

/**
 * 将组件名,组件对应的class及元数据存放到 componentsMappedByName 映射表，
 * 这里的组件是与自定义标签相关的ui组件类
 */
@Bean('agStackComponentsRegistry')
export class AgStackComponentsRegistry extends BeanStub {
  /** 存放component名称和定义class的映射表，注意名称经过归一化处理 */
  private componentsMappedByName: { [key: string]: any } = {};

  /** 将组件的名称和class添加到 componentsMappedByName 映射表 */
  public setupComponents(components: ComponentMeta[]): void {
    if (components) {
      components.forEach((componentMeta) => this.addComponent(componentMeta));
    }
  }

  /** 将组件名和class添加到componentsMappedByName映射表，
   * 组件名会进行转换，如AgGridComp会转换成AG-GRID-COMP，目的是方便匹配自定义dom元素标签
   */
  private addComponent(componentMeta: ComponentMeta): void {
    // get name of the class as a string
    // let className = _.getNameOfClass(ComponentClass);
    // insert a dash after every capital letter
    // 注意replace方法第2个参数中$n代表的是第1个参数正则表达式中第n个括号匹配的内容，n始于1
    // let classEscaped = className.replace(/([A-Z])/g, "-$1").toLowerCase();
    const classEscaped = componentMeta.componentName
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase();
    // put all to upper case
    const classUpperCase = classEscaped.toUpperCase();
    // finally store
    this.componentsMappedByName[classUpperCase] = componentMeta.componentClass;
  }

  /** 从componentsMappedByName映射表中取出key对应的value */
  public getComponentClass(htmlTag: string): any {
    return this.componentsMappedByName[htmlTag];
  }
}
