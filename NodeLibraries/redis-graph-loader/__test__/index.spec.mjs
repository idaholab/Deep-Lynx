import test from 'ava'
import {RedisGraphLoader} from "../index.js";

test('graph creation', async (t) => {
  let loader= new RedisGraphLoader();
  await loader.init({
    dbConnectionString: "postgresql://postgres:deeplynxcore@localhost/deep_lynx",
    redisConnectionString: "redis://localhost:6379"
  })

  try {
    // TODO: CHANGE ME TO VALID CONTAINER
    await loader.generateRedisGraph(45);
    t.assert(true);
  } catch (e) {
    return Promise.reject(e)
  }
})