import { Promise } from '../utils';

export interface SimpleHttpRequestParams {
  url: string;
}

/**
 * 基于XMLHttpRequest实现的简单get请求
 * @param params 传到xhr.open的url请求地址
 */
export function simpleHttpRequest(
  params: SimpleHttpRequestParams,
): Promise<any> {
  return new Promise<any>((resolve) => {
    const httpRequest = new XMLHttpRequest();
    httpRequest.open('GET', params.url);
    httpRequest.send();
    httpRequest.onreadystatechange = function () {
      if (httpRequest.readyState === 4 && httpRequest.status === 200) {
        resolve(JSON.parse(httpRequest.responseText));
      }
    };
  });
}
