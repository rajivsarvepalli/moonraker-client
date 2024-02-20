import axios, {AxiosInstance, AxiosRequestConfig, CreateAxiosDefaults } from 'axios';
import { MoonrakerClientConfig } from '../model/config/clientConfig';
import axiosRetry from 'axios-retry';

export class MoonrakerHttpClient {
  config: MoonrakerClientConfig;
  client: AxiosInstance;
  constructor(configValue: MoonrakerClientConfig, axiosConfig?: CreateAxiosDefaults) {
    this.config = configValue;
    this.client = axios.create({
      baseURL: this.config.moonrakerUrl,
      ...axiosConfig,
    });

    if (!this.config.disableRetries) {
      axiosRetry(this.client, {
        retryDelay: axiosRetry.exponentialDelay,
        retries: 3,
      });
    }
  }

  async httpRequest<D>(config: AxiosRequestConfig<D>) {
    return this.client.request(config);
  }
}