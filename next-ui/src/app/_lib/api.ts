import Config, { configInstance } from './config';
import { AxiosRequestConfig, AxiosResponse, AxiosBasicCredentials } from 'axios';
import { ContainerT } from './types';
import buildURL from 'build-url';
import Authentication from './authentication_service';
const axios = require('axios').default;
const auth = new Authentication();

class Client {
    config?: Config;

    constructor(config?: Config) {
        if (config) this.config = config;
    }

    listContainers(): Promise<ContainerT[]> {
        return this.get<ContainerT[]>('/containers');
    }

    async containerFromImport(container: ContainerT | any, owlFile: File | null, owlFilePath: string): Promise<string> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        const formData = new FormData();
        formData.append('name', container.name);
        formData.append('description', container.description);
        formData.append('data_versioning_enabled', container.config.data_versioning_enabled);
        formData.append('ontology_versioning_enabled', container.config.ontology_versioning_enabled);
        formData.append('enabled_data_sources', container.config.enabled_data_sources.join(','));

        if (owlFile) {
            formData.append('file', owlFile);
        }

        if (owlFilePath !== '') {
            formData.append('path', owlFilePath);
        }

        return axios
            .post(buildURL(this.config?.rootURL!, { path: `containers/import` }), formData, config)
            .then((resp: AxiosResponse) => {
                return new Promise<string>((resolve, reject) => {
                    if (resp.data.isError) {
                        reject(resp.data.error);
                    }

                    resolve(resp.data.value);
                });
            })
            .catch((e: any) => {
                const error = JSON.parse(e);
                const resp: AxiosResponse = { data: {}, status: 500, statusText: 'internal server error', headers: '', config: error.config };
                if (error.response) {
                    // The request was made and the server responded with a status code
                    // that falls out of the range of 2xx

                    // init resp object
                    resp.status = error.response.status;
                    resp.headers = error.response.headers;
                    resp.config = error.config;

                    if (error.response.data.error.error) {
                        if (error.response.data.error.error.detail) {
                            const dlError = error.response.data.error.error.detail;

                            if (dlError.includes('already exists')) {
                                resp.data.error = 'This container name is already taken, please choose another.';
                            } else {
                                resp.data.error = dlError;
                            }
                        } else {
                            resp.data.error = error.response.data.error.error;
                        }
                    }
                } else if (error.request) {
                    // The request was made but no response was received
                    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                    // http.ClientRequest in node.js
                    resp.data.error = error.request;
                } else {
                    // Something happened in setting up the request that triggered an Error
                    resp.data.error = error.error;
                }

                return new Promise<string>((resolve, reject) => {
                    reject(resp.data.error);
                });
            });
    }

    async updateContainerFromImport(containerID: string, owlFile: File | null, owlFilePath: string, name?: string): Promise<string> {
        const config: { [key: string]: any } = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        const formData = new FormData();
        if (owlFile) {
            formData.append('file', owlFile);
        }

        if (owlFilePath !== '') {
            formData.append('path', owlFilePath);
        }

        if (name) {
            formData.append('name', name);
        }

        const resp: AxiosResponse = await axios.put(buildURL(this.config?.rootURL!, { path: `containers/import/${containerID}` }), formData, config);

        return new Promise<string>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.status);

            if (resp.data.isError) reject(resp.data.error);

            resolve(resp.data.value);
        });
    }

    private async get<T>(uri: string, queryParams?: { [key: string]: any }): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams: queryParams! });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }

        // `${this.config?.rootURL}${uri}
        const resp: AxiosResponse = await axios.get(url, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            if (resp.data.isError) reject(resp.data.value);

            resolve(resp.data.value as T);
        });
    }

    private async getRaw<T>(uri: string, queryParams?: { [key: string]: any }): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams: queryParams! });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }

        // `${this.config?.rootURL}${uri}
        const resp: AxiosResponse = await axios.get(url, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data);

            resolve(resp.data as T);
        });
    }

    // getNoData will return true if the response code falls between 200-299
    private async getNoData(uri: string, queryParams?: { [key: string]: any }): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams: queryParams! });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }

        // `${this.config?.rootURL}${uri}
        const resp: AxiosResponse = await axios.get(url, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            if (resp.data.isError) reject(resp.data.value);

            resolve(true);
        });
    }

    private async delete(uri: string, queryParams?: { [key: string]: any }): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }

        const resp: AxiosResponse = await axios.delete(url, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }

    private async deleteWithResponse(uri: string, queryParams?: { [key: string]: any }): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }

        const resp: AxiosResponse = await axios.delete(url, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(resp.data.value);
        });
    }

    private async post<T>(uri: string, data: any, queryParams?: { [key: string]: any }): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams: queryParams! });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }

        const resp: AxiosResponse = await axios.post(url, data, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            if (resp.data.isError) reject(resp.data.error);

            resolve(resp.data.value as T);
        });
    }

    private async postRawReturn<T>(uri: string, data: any, queryParams?: { [key: string]: any }): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams: queryParams! });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }

        const resp: AxiosResponse = await axios.post(url, data, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) {
                resp.data.error ? reject(resp.data.error) : reject(resp.data);
            }

            resolve(resp.data as T);
        });
    }

    private async postNoData(uri: string, data: any, queryParams?: { [key: string]: any }): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams: queryParams! });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }

        const resp: AxiosResponse = await axios.post(url, data, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }

    private async postNoPayload(uri: string): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        const resp: AxiosResponse = await axios.post(buildURL(this.config?.rootURL!, { path: uri }), {}, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }

    private async postFile(uri: string, inputName: string, file: File, queryParams?: { [key: string]: any }): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'multipart/form-data' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        let url: string;
        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams: queryParams! });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }

        const formData = new FormData();
        formData.append(inputName, file);

        const resp: AxiosResponse = await axios.post(url, formData, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }

    private async postFileRawReturn<T>(uri: string, inputName: string, file: File): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'multipart/form-data' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        const formData = new FormData();
        formData.append(inputName, file);

        const resp: AxiosResponse = await axios.post(buildURL(this.config?.rootURL!, { path: uri }), formData, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(resp.data as T);
        });
    }

    private async postFiles(uri: string, files: File[], queryParams?: { [key: string]: any }): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'multipart/form-data' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        const formData = new FormData();
        for (const file of files) {
            formData.append(file.name, file);
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams: queryParams! });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }
        const resp: AxiosResponse = await axios.post(url, formData, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }

    private async put<T>(uri: string, data?: any): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        const resp: AxiosResponse = await axios.put(`${this.config?.rootURL}${uri}`, data, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            if (resp.data.isError) reject(resp.data.value);

            resolve(resp.data.value as T);
        });
    }

    private async putNoData(uri: string, data: any, queryParams?: { [key: string]: any }): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams: queryParams! });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }

        const resp: AxiosResponse = await axios.put(url, data, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }

    private async putFiles(uri: string, files: File[], queryParams?: { [key: string]: any }): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'multipart/form-data' };
        config.validateStatus = () => {
            return true;
        };
        config.headers = { Authorization: `Bearer ${auth.RetrieveJWT()}` };

        const formData = new FormData();
        for (const file of files) {
            formData.append(file.name, file);
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, { path: uri, queryParams: queryParams! });
        } else {
            url = buildURL(this.config?.rootURL!, { path: uri });
        }
        const resp: AxiosResponse = await axios.put(url, formData, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }
}

export const client = new Client(configInstance);