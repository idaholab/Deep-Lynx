/* tslint:disable */
/* eslint-disable */

/* auto-generated by NAPI-RS */

export interface Configuration {
  dbConnectionString: string
  redisConnectionString: string
}
export type JsRedisGraphLoader = RedisGraphLoader
export class RedisGraphLoader {
  constructor()
  /**
   * # Safety
   *
   * This function should be called before any work done on the object
   */
  init(config: Configuration): Promise<void>
  generateRedisGraph(containerId: string, timestamp?: string | undefined | null): Promise<void>
}