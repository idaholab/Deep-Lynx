import Config from './config';
import { AxiosRequestConfig, AxiosResponse, AxiosBasicCredentials } from 'axios';
import { ContainerT } from './types';
import buildURL from 'build-url';
const axios = require('axios').default;

class Client {
    config?: Config;

    constructor(config?: Config) {
        if (config) this.config = config;
    }

    listContainers(): Promise<ContainerT[]> {
        return this.get<ContainerT[]>('/containers');
    }

    private async get<T>(uri: string, queryParams?: { [key: string]: any }): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*', 'Accept': 'application/json' };
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.authMethod === 'token') {
            config.headers = { Authorization: `Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZGVudGl0eV9wcm92aWRlciI6InVzZXJuYW1lX3Bhc3N3b3JkIiwiZGlzcGxheV9uYW1lIjoiU3VwZXIgVXNlciIsImVtYWlsIjoiYWRtaW5AYWRtaW4uY29tIiwiYWRtaW4iOnRydWUsImFjdGl2ZSI6dHJ1ZSwicmVzZXRfcmVxdWlyZWQiOmZhbHNlLCJlbWFpbF92YWxpZCI6ZmFsc2UsInR5cGUiOiJ1c2VyIiwicGVybWlzc2lvbnMiOltdLCJyb2xlcyI6W10sInVzZXJfaWQiOiIxIiwia2V5IjoiWVdRM05XUTVOMk10WVRZd09TMDBZbU14TFdFelpESXRPRFJtTkRNMk9UUm1OR0U1Iiwic2VjcmV0IjoiJDJhJDEwJG5WcEZCMm5qR1IyZU5hVDFXcC5ZN2VPZy52VkZkOHVzdnlHVHU5MFdMNnd1S2lVZmhVUEkuIiwibm90ZSI6bnVsbCwiaWQiOiIxIiwiaWRlbnRpdHlfcHJvdmlkZXJfaWQiOm51bGwsImNyZWF0ZWRfYXQiOiIyMDIzLTExLTI4VDA3OjAwOjAwLjAwMFoiLCJtb2RpZmllZF9hdCI6IjIwMjMtMTEtMjhUMDc6MDA6MDAuMDAwWiIsImNyZWF0ZWRfYnkiOiJzeXN0ZW0iLCJtb2RpZmllZF9ieSI6InN5c3RlbSIsInJlc2V0X3Rva2VuX2lzc3VlZCI6bnVsbCwiaWF0IjoxNzA5NzU2Njg0LCJleHAiOjE3MTY2Njg2ODR9.ZipH2UmIaRonbhb8IoHshJVkMR0LUzjZUDzZqatFS4gqC3Y4tsJhGGyVOvBY966U1f6Ei9qsFszQb-RDIGZnxMcLC2n_CzjAQ2sgFymBcUR_O1wYNSQpY_FvVOnDP9CuCPN7l2kTkDqkp9yrlyc9dYJuvuwxPY7AVBVgk9qSCM7-6uc0W4Z07XqnL0FQJwq02Sc3e46puCrAJHZGfkGTwW8Dgbr40Lxm3JU_j_RWFHzEWNyDnkd9T5cYjALFZ48gQxAFrDmB20Q_gVyXMTAC2CWr5sClYaQfU97aMnLAPiKAKclfz7HNZ8Ekphe8rzgtnAXu8ggU3U3QF6ANGDWgnQ` };
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams: queryParams! });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }

        console.log(url);

        const resp: AxiosResponse = await axios.get(url, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            if (resp.data.isError) reject(resp.data.value);

            resolve(resp.data.value as T);
        });
    }
}

export const client = new Client(new Config());