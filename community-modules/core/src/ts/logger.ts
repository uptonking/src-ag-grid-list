import { GridOptionsWrapper } from './gridOptionsWrapper';
import { Bean } from './context/context';
import { Qualifier } from './context/context';
import { BeanStub } from './context/beanStub';

/**
 * 创建Logger对象的工厂类
 */
@Bean('loggerFactory')
export class LoggerFactory extends BeanStub {
  private logging: boolean;

  private setBeans(
    @Qualifier('gridOptionsWrapper') gridOptionsWrapper: GridOptionsWrapper,
  ): void {
    this.logging = gridOptionsWrapper.isDebug();
  }

  public create(name: string) {
    return new Logger(name, this.isLogging.bind(this));
  }

  public isLogging(): boolean {
    return this.logging;
  }
}

/**
 * Logger日志类，基于console.log实现
 */
export class Logger {
  private isLoggingFunc: () => boolean;
  private name: string;

  constructor(name: string, isLoggingFunc: () => boolean) {
    this.name = name;
    this.isLoggingFunc = isLoggingFunc;
  }

  public isLogging(): boolean {
    return this.isLoggingFunc();
  }

  public log(message: string) {
    if (this.isLoggingFunc()) {
      // tslint:disable-next-line
      console.log('ag-Grid.' + this.name + ': ' + message);
    }
  }
}
