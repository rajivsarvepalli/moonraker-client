
import { MoonrakerClientConfig } from '../model/config/clientConfig';
import { MoonrakerHttpClient } from './httpClient';
import { AxiosRequestConfig, CreateAxiosDefaults } from 'axios';
import { PrinterData } from '../model/octoprintPrinterData';
import { ExponentialBackoff } from '../websocket/backoff/exponentialBackoff';
import { WebsocketEventListener, WebsocketEvent, WebsocketEventListenerOptions } from '../websocket/websocketEvent';
import { WebsocketBuilder } from '../websocket/websocketClientBuilder';
import { Websocket } from '../websocket/websocketClient';
import { MessageEvent } from 'ws';
import { PrinterObjectNotification } from '../model/printerObjectNotification';
import { RingQueue } from '../websocket/queue/ringQueue';


export class MoonrakerClient {
  config: MoonrakerClientConfig;
  httpClient: MoonrakerHttpClient;
  websocketClient: Websocket;

  constructor(configValue: MoonrakerClientConfig, httpClientConfig?: CreateAxiosDefaults) {
    this.config = configValue;
    this.config.moonrakerUrl = configValue.moonrakerUrl.endsWith('/') ? configValue.moonrakerUrl.slice(0, -1) : configValue.moonrakerUrl;
    this.httpClient = new MoonrakerHttpClient(this.config, httpClientConfig);
    this.websocketClient = new WebsocketBuilder(this.config.moonrakerUrl + '/websocket')
      .withBuffer(new RingQueue(this.config.websocketMessageQueueSize ?? 10000))
      .withBackoff(new ExponentialBackoff(1000, 3))
      .build();
  }

  /**
   * Executes a gcode string on the connected printer.
   *
   * @param gcode The gcode to run in a string format.
   * @returns A boolean which represents the success of the operation.
   */
  async sendGcode(gcode: string): Promise<boolean> {
    return this.httpRequest({
      method: 'post',
      url: '/printer/gcode/script',
      params: {
        script: gcode,
      },
    }).then(
      (response) => {
        return response?.status === 200;
      },
    ).catch(()=> false);
  }

  async excludeObject(objectName: string): Promise<boolean> {
    return this.httpRequest({
      method: 'post',
      url: '/printer/gcode/script',
      params: {
        script: `EXCLUDE_OBJECT NAME=${objectName}`,
      },
    }).then(
      (response) => {
        return response?.status === 200;
      },
    ).catch(()=> false);
  }

  async getPrintProgress(): Promise<number | undefined> {
    return this.httpRequest({
      method: 'post',
      url: '/printer/objects/query',
      params: {
        display_status: 'progress',
      },
    }).then(
      (response) => {
        if(response?.data?.result?.status?.display_status?.progress !== undefined) {
          return response?.data?.result?.status?.display_status?.progress;
        }

        return undefined;
      },
    ).catch(()=> undefined);
  }

  async getTemperatureForSensor(sensorName: string): Promise<number | undefined> {
    const sensor = 'temperature_sensor ' + sensorName;
    return this.httpRequest({
      method: 'post',
      url: '/printer/objects/query',
      params: {
        [sensor] : '',
      },
    }).then(
      (response) => {
        if(response?.data?.result?.status?.[sensor]?.temperature !== undefined) {
          return response?.data?.result?.status?.[sensor]?.temperature;
        }

        return undefined;
      },
    ).catch(()=> undefined);
  }

  async setBedTemperature(temperature: number): Promise<boolean> {
    return this.httpRequest({
      method: 'post',
      url: '/printer/gcode/script',
      params: {
        script: `SET_HEATER_TEMPERATURE HEATER=heater_bed TARGET=${temperature}`,
      },
    }).then(
      (response) => {
        return response?.status === 200;
      },
    ).catch(()=> false);
  }

  async setExtruderTemperature(temperature: number): Promise<boolean> {
    return this.httpRequest({
      method: 'post',
      url: '/printer/gcode/script',
      params: {
        script: `SET_HEATER_TEMPERATURE HEATER=extruder TARGET=${temperature}`,
      },
    }).then(
      (response) => {
        return response?.status === 200;
      },
    ).catch(()=> false);
  }

  async printFile(filename: string): Promise<boolean> {
    return this.httpRequest({
      method: 'post',
      url: '/printer/print/start',
      params: {
        filename: filename,
      },
    }).then(
      (response) => {
        return response?.status === 200;
      },
    ).catch(()=> false);
  }


  async pausePrint(): Promise<boolean> {
    return this.httpRequest({
      method: 'post',
      url: '/printer/print/pause',
    }).then(
      (response) => {
        return response?.status === 200;
      },
    ).catch(()=> false);
  }

  async resumePrint(): Promise<boolean> {
    return this.httpRequest({
      method: 'post',
      url: '/printer/print/resume',
    }).then(
      (response) => {
        return response?.status === 200;
      },
    ).catch(()=> false);
  }

  async cancelPrint(): Promise<boolean> {
    return this.httpRequest({
      method: 'post',
      url: '/printer/print/cancel',
    }).then(
      (response) => {
        return response?.status === 200;
      },
    ).catch(()=> false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getOctoprintPrinterData(headers?: any): Promise<PrinterData | undefined> {
    return this.httpRequest({
      method: 'get',
      url: '/api/printer',
      headers: headers,
    })
      .then((response) => {
        if (response.data) {
          return response.data as PrinterData;
        }

        return undefined;
      });
  }

  async httpRequest<D>(config: AxiosRequestConfig<D>) {
    return this.httpClient.httpRequest(config);
  }

  sendWebsocketMessage(method: string, data: unknown): void {
    return this.websocketClient.send(this.constructJsonRpcRequest(method, data));
  }

  subscribeToPrinterObjectStatusWithListener(
    objects: Record<string, string[] | undefined>,
    listener: (data: PrinterObjectNotification) => void): void {

    this.subscribeToPrinterObjectStatus(objects);

    const filterListener = (_socket, event: MessageEvent) => {
      const jsonRpcMessage = JSON.parse(event.data.toString());

      if (jsonRpcMessage?.method === 'notify_status_update') {
        const updatedPrinterObject = jsonRpcMessage?.params ?? [];
        const requestedPrinterObjects = Object.keys(objects) ?? [];
        let objectsNotified: string[] = [];

        if (updatedPrinterObject.length > 1) {
          objectsNotified = Object.keys(updatedPrinterObject[0]);
        }

        if(objectsNotified.some(object => requestedPrinterObjects.includes(object))) {
          listener({
            eventTime: updatedPrinterObject[1],
            objectNotification: updatedPrinterObject[0],
          });
        }
      }
    };

    this.websocketClient.addEventListener(WebsocketEvent.message, filterListener);
  }

  subscribeToPrinterObjectStatus(objects: Record<string, string[] | undefined>): void {
    const subscribeRequest = this.constructJsonRpcRequest('printer.objects.subscribe', {
      'objects': objects,
    });
    this.websocketClient.send(subscribeRequest);
  }

  addWebsocketMessageListener(listener: WebsocketEventListener<WebsocketEvent.message>, options?: WebsocketEventListenerOptions) {
    this.websocketClient.addEventListener(WebsocketEvent.message, listener, options);
  }

  addWebsocketListener<K extends WebsocketEvent>(type: K,
    listener: WebsocketEventListener<K>,
    options?: WebsocketEventListenerOptions) {

    this.websocketClient.addEventListener(type, listener, options);
  }

  private constructJsonRpcRequest(method: string, data: unknown): string {
    return JSON.stringify({
      'jsonrpc': '2.0',
      'method': method,
      'params': data,
      'id': Math.floor(Math.random() * 100000),
    }, (k, v) => v === undefined ? null : v);
  }
}