import { WebsocketBuffer } from './websocketBuffer';
import { WebsocketConnectionRetryOptions } from './websocketRetryOptions';
import { WebsocketEventListeners } from './websocketEvent';

/**
 * Options that can be passed to the Websocket constructor.
 */
export interface WebsocketOptions {
  /**
   * The Buffer to use.
   */
  readonly buffer?: WebsocketBuffer;

  /**
   * The options for the connection-retry-strategy.
   */
  readonly retry?: WebsocketConnectionRetryOptions;

  /**
   * The initial listeners to add to the websocket.
   */
  readonly listeners?: WebsocketEventListeners;
}