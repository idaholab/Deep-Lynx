import Config from '../config';
import {AxiosRequestConfig, AxiosResponse, AxiosBasicCredentials} from 'axios';
import {
    AssignRolePayloadT,
    ContainerT,
    DataSourceT,
    ImportDataT,
    ImportT,
    MetatypeKeyT,
    MetatypeT,
    TypeMappingT,
    MetatypeRelationshipT,
    MetatypeRelationshipKeyT,
    MetatypeRelationshipPairT,
    NodeT,
    EdgeT,
    UserContainerInviteT,
    TypeMappingTransformationPayloadT,
    TypeMappingTransformationT,
    ExportT,
    ResultT,
    FileT,
    KeyPairT,
    OntologyVersionT,
    ChangelistT,
    ChangelistApprovalT,
    ContainerAlertT,
    TypeMappingUpgradePayloadT,
    CreateServiceUserPayloadT,
    ServiceUserPermissionSetT,
    FullStatistics,
    EventActionT,
    EventActionStatusT,
    TagT,
    TimeseriesRange,
    TimeseriesRowCount,
} from '@/api/types';
import {RetrieveJWT} from '@/auth/authentication_service';
import {UserT} from '@/auth/types';
import buildURL from 'build-url';
const axios = require('axios').default;

import _Vue from 'vue';

export type Config = {
    rootURL: string;
    auth_method?: string;
    username?: string;
    password?: string;
};

export type GraphQLOptions = {
    pointInTime?: string;
    rawMetadataEnabled?: boolean;
};

// We provide both a a constructor and a singleton type instance for consumption. The
// singleton applies sane defaults based on the configuration file. We know however
// that there might be instances in which you might want to maintain connections to two
// separate deep-lynx instances, thus the combination of the two. The majority of the application
// will be written using the singleton class.
export class Client {
    config?: Config;

    constructor(config?: Config) {
        if (config) this.config = config;
    }

    retrieveStats(): Promise<FullStatistics> {
        return this.get<FullStatistics>(`/stats`);
    }

    submitGraphQLQuery(containerID: string, query: any, options?: GraphQLOptions): Promise<any> {
        if (query.query) {
            query.query = query.query.replace(/\n/g, '');
        }

        const queryParams: {[key: string]: any} = {};
        if (options?.pointInTime) queryParams.pointInTime = options.pointInTime;
        if (options?.rawMetadataEnabled) queryParams.rawMetadataEnabled = options.rawMetadataEnabled;

        return this.postRawReturn<any>(`/containers/${containerID}/data`, query, queryParams);
    }

    submitNodeGraphQLQuery(containerID: string, nodeID: string, query: any): Promise<any> {
        if (query.query) {
            query.query = query.query.replace(/\n/g, '');
        }

        return this.postRawReturn<any>(`/containers/${containerID}/graphs/nodes/${nodeID}/timeseries`, query);
    }

    submitDataSourceGraphQLQuery(containerID: string, dataSourceID: string, query: any): Promise<any> {
        if (query.query) {
            query.query = query.query.replace(/\n/g, '');
        }

        return this.postRawReturn<any>(`/containers/${containerID}/import/datasources/${dataSourceID}/data`, query);
    }

    listContainers(): Promise<ContainerT[]> {
        return this.get<ContainerT[]>('/containers');
    }

    retrieveContainer(containerID: string): Promise<ContainerT> {
        return this.get<ContainerT>(`/containers/${containerID}`);
    }

    listContainerAlerts(containerID: string): Promise<ContainerAlertT[]> {
        return this.get<ContainerAlertT[]>(`/containers/${containerID}/alerts`);
    }

    acknowledgeContainerAlert(containerID: string, alertID: string): Promise<boolean> {
        return this.postNoPayload(`/containers/${containerID}/alerts/${alertID}`);
    }

    createContainer(container: ContainerT | any): Promise<ContainerT[]> {
        return this.post<ContainerT[]>('/containers', container);
    }

    // like create container but instead uses a multipart form with a potential
    // file upload, taking .owl files and creating a container with all its supporting
    // metatypes etc.
    async containerFromImport(container: ContainerT | any, owlFile: File | null, owlFilePath: string): Promise<string> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

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
            .post(buildURL(this.config?.rootURL!, {path: `containers/import`}), formData, config)
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
                const resp: AxiosResponse = {data: {}, status: 500, statusText: 'internal server error', headers: '', config: error.config};
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
        const config: {[key: string]: any} = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

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

        const resp: AxiosResponse = await axios.put(buildURL(this.config?.rootURL!, {path: `containers/import/${containerID}`}), formData, config);

        return new Promise<string>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.status);

            if (resp.data.isError) reject(resp.data.error);

            resolve(resp.data.value);
        });
    }

    deleteContainer(containerID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}`);
    }

    updateContainer(container: ContainerT | any): Promise<ContainerT> {
        return this.put<ContainerT>(`/containers/${container.id}`, container);
    }

    listMetatypes(
        containerID: string,
        {
            name,
            nameIn,
            description,
            limit,
            offset,
            ontologyVersion,
            sortBy,
            sortDesc,
            count,
            loadKeys,
            createdAfter,
            modifiedAfter,
            deleted = false,
        }: {
            name?: string;
            nameIn?: string;
            description?: string;
            limit?: number;
            offset?: number;
            ontologyVersion?: string;
            sortBy?: string;
            sortDesc?: boolean;
            count?: boolean;
            loadKeys?: boolean;
            createdAfter?: string;
            modifiedAfter?: string;
            deleted?: boolean;
        },
    ): Promise<MetatypeT[] | number> {
        const query: {[key: string]: any} = {};

        if (name) query.name = name;
        if (nameIn) query.nameIn = nameIn;
        if (description) query.description = description;
        if (ontologyVersion) query.ontologyVersion = ontologyVersion;
        if (limit) query.limit = limit;
        if (offset) query.offset = offset;
        if (sortBy) query.sortBy = sortBy;
        if (sortDesc) query.sortDesc = sortDesc;
        if (count) query.count = 'true';
        if (typeof loadKeys !== 'undefined') query.loadKeys = loadKeys;
        if (createdAfter) query.createdAfter = createdAfter;
        if (modifiedAfter) query.modifiedAfter = modifiedAfter;
        query.deleted = deleted;

        return this.get<MetatypeT[] | number>(`/containers/${containerID}/metatypes`, query);
    }

    listMetatypeRelationshipPairs(
        containerID: string,
        {
            name,
            ontologyVersion,
            metatypeID,
            originID,
            destinationID,
            limit,
            offset,
            sortBy,
            sortDesc,
            count,
            deleted = false,
            nameIn,
            loadRelationships,
            originName,
            destinationName,
        }: {
            name?: string;
            ontologyVersion?: string;
            metatypeID?: string;
            originID?: string;
            destinationID?: string;
            limit?: number;
            offset?: number;
            sortBy?: string;
            sortDesc?: boolean;
            count?: boolean;
            deleted?: boolean;
            nameIn?: string;
            loadRelationships?: boolean;
            originName?: string;
            destinationName?: string;
        },
    ): Promise<MetatypeRelationshipPairT[] | number> {
        const query: {[key: string]: any} = {};

        if (name) query.name = name;
        if (ontologyVersion) query.ontologyVersion = ontologyVersion;
        query.ontologyVersion = ontologyVersion;
        if (originID) query.originID = originID;
        if (destinationID) query.destinationID = destinationID;
        if (metatypeID) query.metatypeID = metatypeID;
        if (limit) query.limit = limit;
        if (offset) query.offset = offset;
        if (sortBy) query.sortBy = sortBy;
        if (sortDesc) query.sortDesc = sortDesc;
        if (count) query.count = count;
        if (nameIn) query.nameIn = nameIn;
        if (loadRelationships) query.loadRelationships = loadRelationships;
        if (originName) query.originName = originName;
        if (destinationName) query.destinationName = destinationName;
        query.deleted = deleted;

        return this.get<MetatypeRelationshipPairT[] | number>(`/containers/${containerID}/metatype_relationship_pairs`, query);
    }

    createMetatype(containerID: string, name: string, description: string, ontologyVersion?: string, parentID?: string): Promise<MetatypeT[]> {
        return this.post<MetatypeT[]>(`/containers/${containerID}/metatypes`, {name, description, ontology_version: ontologyVersion, parent_id: parentID});
    }

    retrieveMetatype(containerID: string, metatypeID: string): Promise<MetatypeT> {
        return this.get<MetatypeT>(`/containers/${containerID}/metatypes/${metatypeID}`);
    }

    retrieveMetatypeByUUID(containerID: string, metatypeID: string): Promise<MetatypeT> {
        return this.get<MetatypeT>(`/containers/${containerID}/metatypes/${metatypeID}`, {uuid: true});
    }

    updateMetatype(containerID: string, metatypeID: string, metatype: any): Promise<boolean> {
        return this.put<boolean>(`/containers/${containerID}/metatypes/${metatypeID}`, metatype);
    }

    deleteMetatype(containerID: string, metatypeID: string, {permanent, reverse}: {permanent?: boolean; reverse?: boolean}): Promise<boolean> {
        const query: {[key: string]: any} = {};
        if (permanent) query.permanent = permanent;
        if (reverse) query.reverse = reverse;

        return this.delete(`/containers/${containerID}/metatypes/${metatypeID}`, query);
    }

    listMetatypeKeys(containerID: string, metatypeID: string, deleted = false): Promise<MetatypeKeyT[]> {
        const query: {[key: string]: any} = {};
        query.deleted = deleted;

        return this.get<MetatypeKeyT[]>(`/containers/${containerID}/metatypes/${metatypeID}/keys`, query);
    }

    createMetatypeKey(containerID: string, metatypeID: string, key: MetatypeKeyT): Promise<MetatypeKeyT[]> {
        return this.post<MetatypeKeyT[]>(`/containers/${containerID}/metatypes/${metatypeID}/keys`, key);
    }

    deleteMetatypeKey(
        containerID: string,
        metatypeID: string,
        keyID: string,
        {permanent, reverse}: {permanent?: boolean; reverse?: boolean},
    ): Promise<boolean> {
        const query: {[key: string]: any} = {};
        if (permanent) query.permanent = permanent;
        if (reverse) query.reverse = reverse;

        return this.delete(`/containers/${containerID}/metatypes/${metatypeID}/keys/${keyID}`, query);
    }

    updateMetatypeKey(containerID: string, metatypeID: string, keyID: string, key: MetatypeKeyT): Promise<boolean> {
        return this.put<boolean>(`/containers/${containerID}/metatypes/${metatypeID}/keys/${keyID}`, key);
    }

    listKeyPairsForUser(): Promise<KeyPairT[]> {
        return this.get<KeyPairT[]>('/users/keys');
    }

    generateKeyPairForUser(note?: string): Promise<KeyPairT> {
        return this.post<KeyPairT>('/users/keys', {note});
    }

    deleteKeyPairForUser(keyID: string): Promise<boolean> {
        return this.delete(`/users/keys/${keyID}`);
    }

    listKeyPairsForServiceUser(containerID: string, serviceUserID: string, note?: string): Promise<KeyPairT[]> {
        const query: {[key: string]: any} = {};
        if (note) query.note = note;

        return this.get<KeyPairT[]>(`/containers/${containerID}/service-users/${serviceUserID}/keys`, query);
    }

    listServiceKeysForContainer(containerID: string, note?: string) {
        const query: {[key: string]: any} = {};
        if (note) query.note = note;

        return this.get<KeyPairT[]>(`/containers/${containerID}/service-users/keys`);
    }

    generateKeyPairForServiceUser(containerID: string, serviceUserID: string, note?: string): Promise<KeyPairT> {
        return this.post<KeyPairT>(`/containers/${containerID}/service-users/${serviceUserID}/keys`, {note});
    }

    deleteKeyPairForServiceUser(containerID: string, serviceUserID: string, keyID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/service-users/${serviceUserID}/keys/${keyID}`);
    }

    createServiceUser(containerID: string, payload: CreateServiceUserPayloadT): Promise<UserT> {
        return this.post<UserT>(`/containers/${containerID}/service-users`, payload);
    }

    listServiceUsers(containerID: string): Promise<UserT[]> {
        return this.get<UserT[]>(`/containers/${containerID}/service-users`);
    }

    deleteServiceUser(containerID: string, userID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/service-users/${userID}`);
    }

    getServiceUsersPermissions(containerID: string, userID: string): Promise<ServiceUserPermissionSetT> {
        return new Promise((resolve, reject) => {
            this.getRaw<string[][]>(`/containers/${containerID}/service-users/${userID}/permissions`)
                .then((results) => {
                    const set: ServiceUserPermissionSetT = {
                        containers: [],
                        ontology: [],
                        users: [],
                        data: [],
                    };

                    results.forEach((result) => {
                        if (result.length != 3) return;

                        switch (result[1]) {
                            case 'containers': {
                                set.containers.push(result[2]);
                                break;
                            }
                            case 'ontology': {
                                set.ontology.push(result[2]);
                                break;
                            }
                            case 'data': {
                                set.data.push(result[2]);
                                break;
                            }
                            case 'users': {
                                set.users.push(result[2]);
                                break;
                            }
                        }
                    });

                    resolve(set);
                })
                .catch((e) => reject(e));
        });
    }

    setServiceUsersPermissions(containerID: string, userID: string, set: ServiceUserPermissionSetT): Promise<boolean> {
        return this.put<boolean>(`/containers/${containerID}/service-users/${userID}/permissions`, set);
    }

    listMetatypeRelationships(
        containerID: string,
        {
            name,
            description,
            ontologyVersion,
            limit,
            offset,
            sortBy,
            sortDesc,
            count,
            nameIn,
            loadKeys,
            deleted = false,
        }: {
            name?: string;
            description?: string;
            ontologyVersion?: string;
            limit?: number;
            offset?: number;
            sortBy?: string;
            sortDesc?: boolean;
            count?: boolean;
            nameIn?: string;
            loadKeys?: boolean;
            deleted?: boolean;
        },
    ): Promise<MetatypeRelationshipT[] | number> {
        const query: {[key: string]: any} = {};

        if (name) query.name = name;
        if (description) query.description = name;
        if (ontologyVersion) query.ontologyVersion = ontologyVersion;
        if (limit) query.limit = limit;
        if (offset) query.offset = offset;
        if (sortBy) query.sortBy = sortBy;
        if (sortDesc) query.sortDesc = sortDesc;
        if (count) query.count = 'true';
        if (nameIn) query.nameIn = nameIn;
        if (loadKeys) query.loadKeys = loadKeys;
        query.deleted = deleted;

        return this.get<MetatypeRelationshipT[] | number>(`/containers/${containerID}/metatype_relationships`, query);
    }

    retrieveMetatypeRelationship(containerID: string, metatypeRelationshipID: string): Promise<MetatypeRelationshipT> {
        return this.get<MetatypeRelationshipT>(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}`);
    }

    createMetatypeRelationship(containerID: string, name: string, description: string, ontologyVersion?: string): Promise<MetatypeRelationshipT[]> {
        return this.post<MetatypeRelationshipT[]>(`/containers/${containerID}/metatype_relationships`, {name, description, ontology_version: ontologyVersion});
    }

    retrieveMetatypeRelationshipPair(containerID: string, metatypeRelationshipPairID: string): Promise<MetatypeRelationshipPairT> {
        return this.get<MetatypeRelationshipPairT>(`/containers/${containerID}/metatype_relationship_pairs/${metatypeRelationshipPairID}`);
    }

    listMetatypeRelationshipPairsForMetatype(containerID: string, metatypeID: string): Promise<MetatypeRelationshipPairT[]> {
        return this.get<MetatypeRelationshipPairT[]>(`/containers/${containerID}/metatypes/${metatypeID}/metatype_relationship_pairs`);
    }

    updateMetatypeRelationship(containerID: string, metatypeRelationshipID: string, metatypeRelationship: any): Promise<boolean> {
        return this.put<boolean>(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}`, metatypeRelationship);
    }

    deleteMetatypeRelationship(
        containerID: string,
        metatypeRelationshipID: string,
        {permanent, reverse}: {permanent?: boolean; reverse?: boolean},
    ): Promise<boolean> {
        const query: {[key: string]: any} = {};
        if (permanent) query.permanent = permanent;
        if (reverse) query.reverse = reverse;

        return this.delete(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}`, query);
    }

    createMetatypeRelationshipPair(containerID: string, metatypeRelationshipPair: any): Promise<MetatypeRelationshipPairT[]> {
        return this.post<MetatypeRelationshipPairT[]>(`/containers/${containerID}/metatype_relationship_pairs`, metatypeRelationshipPair);
    }

    updateMetatypeRelationshipPair(containerID: string, metatypeRelationshipPairID: string, metatypeRelationshipPair: any): Promise<boolean> {
        return this.put<boolean>(`/containers/${containerID}/metatype_relationship_pairs/${metatypeRelationshipPairID}`, metatypeRelationshipPair);
    }

    deleteMetatypeRelationshipPair(
        containerID: string,
        metatypeRelationshipPairID: string,
        {permanent, reverse}: {permanent?: boolean; reverse?: boolean},
    ): Promise<boolean> {
        const query: {[key: string]: any} = {};
        if (permanent) query.permanent = permanent;
        if (reverse) query.reverse = reverse;

        return this.delete(`/containers/${containerID}/metatype_relationship_pairs/${metatypeRelationshipPairID}`, query);
    }

    listMetatypeRelationshipKeys(containerID: string, relationshipID: string, deleted = false): Promise<MetatypeRelationshipKeyT[]> {
        const query: {[key: string]: any} = {};
        query.deleted = deleted;

        return this.get<MetatypeRelationshipKeyT[]>(`/containers/${containerID}/metatype_relationships/${relationshipID}/keys`, query);
    }

    deleteMetatypeRelationshipKey(
        containerID: string,
        metatypeRelationshipID: string,
        keyID: string,
        {permanent, reverse}: {permanent?: boolean; reverse?: boolean},
    ): Promise<boolean> {
        const query: {[key: string]: any} = {};
        if (permanent) query.permanent = permanent;
        if (reverse) query.reverse = reverse;

        return this.delete(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}/keys/${keyID}`, query);
    }

    createMetatypeRelationshipKey(containerID: string, metatypeRelationshipID: string, key: MetatypeRelationshipKeyT): Promise<MetatypeRelationshipKeyT[]> {
        return this.post<MetatypeRelationshipKeyT[]>(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}/keys`, key);
    }

    updateMetatypeRelationshipKey(containerID: string, metatypeRelationshipID: string, keyID: string, key: MetatypeRelationshipKeyT): Promise<boolean> {
        return this.put<boolean>(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}/keys/${keyID}`, key);
    }

    createDataSource(containerID: string, dataSource: any): Promise<DataSourceT> {
        return this.post<DataSourceT>(`/containers/${containerID}/import/datasources`, dataSource);
    }

    updateDataSource(containerID: string, dataSource: DataSourceT): Promise<DataSourceT> {
        return this.put<DataSourceT>(`/containers/${containerID}/import/datasources/${dataSource.id}`, dataSource);
    }

    createTypeMappingTransformation(
        containerID: string,
        dataSourceID: string,
        typeMappingID: string,
        transformation: TypeMappingTransformationPayloadT,
    ): Promise<TypeMappingTransformationPayloadT> {
        return this.post<TypeMappingTransformationPayloadT>(
            `/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}/transformations`,
            transformation,
        );
    }

    updateTypeMappingTransformation(
        containerID: string,
        dataSourceID: string,
        typeMappingID: string,
        transformationID: string,
        transformation: TypeMappingTransformationPayloadT,
    ): Promise<TypeMappingTransformationPayloadT> {
        return this.put<TypeMappingTransformationPayloadT>(
            `/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}/transformations/${transformationID}`,
            transformation,
        );
    }

    upgradeTypeMappings(containerID: string, dataSourceID: string, payload: TypeMappingUpgradePayloadT): Promise<ResultT<boolean>[]> {
        return this.postRawReturn<ResultT<boolean>[]>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/upgrade`, payload);
    }

    dataSourceJSONFileImport(containerID: string, dataSourceID: string, file: File, fastload?: boolean): Promise<boolean> {
        return this.postFile(`/containers/${containerID}/import/datasources/${dataSourceID}/imports`, 'import', file, {fastLoad: fastload});
    }

    async uploadFile(containerID: string, dataSourceID: string, file: File): Promise<FileT> {
        const results = await this.postFileRawReturn<ResultT<ResultT<FileT>[]>>(
            `/containers/${containerID}/import/datasources/${dataSourceID}/files`,
            'import',
            file,
        );

        return new Promise((resolve, reject) => {
            if (results.value[0].isError) reject(results.value[0].error);

            resolve(new Promise((r) => r(results.value[0].value as FileT)));
        });
    }

    deleteFile(containerID: string, dataSourceID: string, fileID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/import/datasources/${dataSourceID}/files/${fileID}`);
    }

    attachFileToNode(containerID: string, nodeID: string, fileID: string): Promise<boolean> {
        return this.put(`/containers/${containerID}/graphs/nodes/${nodeID}/files/${fileID}`);
    }

    detachFileFromNode(containerID: string, nodeID: string, fileID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/graphs/nodes/${nodeID}/files/${fileID}`);
    }

    listNodeFiles(containerID: string, nodeID: string): Promise<FileT[]> {
        return this.get<FileT[]>(`/containers/${containerID}/graphs/nodes/${nodeID}/files`);
    }

    listEdgesForNodeIDs(containerID: string, nodeIDS: string[], options: {[key: string]: any}): Promise<EdgeT[]> {
        const query: {[key: string]: any} = {};
        if (options.pointInTime) query.pointInTime = options.pointInTime;
        if (options.limit) query.limit = options.limit;

        return this.post<EdgeT[]>(`/containers/${containerID}/graphs/nodes/edges`, {node_ids: nodeIDS}, query);
    }

    listDataSources(containerID: string, archived = false, timeseries = false): Promise<DataSourceT[]> {
        // we hardcoded the sortBy to insure we're always getting archived data sources at the bottom of the list
        return this.get<DataSourceT[]>(`/containers/${containerID}/import/datasources`, {archived, sortBy: 'archived', timeseries});
    }

    retrieveDataSource(containerID: string, dataSourceID: string): Promise<DataSourceT> {
        // we hardcoded the sortBy to insure we're always getting archived data sources at the bottom of the list
        return this.get<DataSourceT>(`/containers/${containerID}/import/datasources/${dataSourceID}`);
    }

    deleteDataSources(
        containerID: string,
        dataSourceID: string,
        {archive, forceDelete, withData}: {archive?: boolean; forceDelete?: boolean; withData?: boolean},
    ): Promise<boolean> {
        const query: {[key: string]: any} = {};

        if (archive) query.archive = archive;
        if (forceDelete) query.forceDelete = forceDelete;
        if (withData) query.withData = withData;

        return this.delete(`/containers/${containerID}/import/datasources/${dataSourceID}`, query);
    }

    activateDataSource(containerID: string, dataSourceID: string): Promise<boolean> {
        return this.postNoPayload(`/containers/${containerID}/import/datasources/${dataSourceID}/active`);
    }

    deactivateDataSource(containerID: string, dataSourceID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/import/datasources/${dataSourceID}/active`);
    }

    reprocessDataSource(containerID: string, dataSourceID: string): Promise<boolean> {
        return this.postNoPayload(`/containers/${containerID}/import/datasources/${dataSourceID}/reprocess`);
    }

    reprocessImport(containerID: string, importID: string): Promise<boolean> {
        return this.postNoPayload(`/containers/${containerID}/import/imports/${importID}/reprocess`);
    }

    //****** EVENT SYSTEM CLIENTS ******//

    createEvent(event: any): Promise<EventActionT> {
        return this.post<EventActionT>(`/events`, event);
    }

    activateEventAction(actionID: string): Promise<boolean> {
        return this.postNoPayload(`/event_actions/${actionID}/active`);
    }

    deactivateEventAction(actionID: string): Promise<boolean> {
        return this.delete(`/event_actions/${actionID}/active`);
    }

    createEventAction(action: any): Promise<EventActionT> {
        return this.post<EventActionT>('/event_actions', action);
    }

    updateEventAction(action: EventActionT): Promise<EventActionT> {
        return this.put<EventActionT>(`/event_actions/${action.id}`, action);
    }

    listEventActions(archived = false, containerID?: string): Promise<EventActionT[]> {
        // we hardcoded the sortBy to insure we're always getting archived data sources at the bottom of the list
        const query: {[key: string]: any} = {};
        query.archived = archived;
        query.sortBy = 'archived';
        if (containerID) {
            query.containerID = containerID;
        }
        return this.get<EventActionT[]>(`/event_actions`, query);
    }

    retrieveEventAction(actionID: string): Promise<EventActionT> {
        return this.get<EventActionT>(`/event_actions/${actionID}`);
    }

    deleteEventAction(actionID: string): Promise<boolean> {
        return this.delete(`/event_actions/${actionID}`);
    }

    listEventActionStatusForEventAction(actionID: string): Promise<EventActionStatusT[]> {
        return this.get<EventActionStatusT[]>(`/event_actions/${actionID}/event_action_status`);
    }

    updateEventActionStatus(status: EventActionT): Promise<EventActionStatusT> {
        return this.put<EventActionStatusT>(`/event_action_status/${status.id}`, status);
    }

    listEventActionStatuses(archived = false): Promise<EventActionStatusT[]> {
        // we hardcoded the sortBy to insure we're always getting archived data sources at the bottom of the list
        return this.get<EventActionStatusT[]>(`/event_action_status`, {archived, sortBy: 'archived'});
    }

    retrieveEventActionStatus(statusID: string): Promise<EventActionStatusT> {
        return this.get<EventActionStatusT>(`/event_action_status/${statusID}`);
    }

    createOrUpdateNode(containerID: string, node: any): Promise<NodeT[]> {
        return this.post<NodeT[]>(`/containers/${containerID}/graphs/nodes`, node);
    }

    deleteNode(containerID: string, nodeID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/graphs/nodes/${nodeID}`);
    }

    listNodes(
        containerID: string,
        {
            limit,
            offset,
            transformationID,
            metatypeID,
            dataSourceID,
            loadMetatypes,
        }: {limit?: number; offset?: number; transformationID?: string; metatypeID?: string; dataSourceID?: string; loadMetatypes?: string},
    ): Promise<NodeT[]> {
        const query: {[key: string]: any} = {};

        if (dataSourceID) query.dataSourceID = dataSourceID;
        if (limit) query.limit = limit;
        if (offset) query.offset = offset;
        if (transformationID) query.transformationID = transformationID;
        if (metatypeID) query.metatypeID = metatypeID;
        if (loadMetatypes) query.loadMetatypes = loadMetatypes;

        return this.get<NodeT[]>(`/containers/${containerID}/graphs/nodes`, query);
    }

    listTimeseriesTables(containerID: string, nodeID: string): Promise<Map<string, string>> {
        return this.get<Map<string, string>>(`/containers/${containerID}/graphs/nodes/${nodeID}/timeseries`);
    }

    downloadTimeseriesData(containerID: string, dataSourceID: string) {
        return this.get(`/containers/${containerID}/import/datasources/${dataSourceID}/download`);
    }

    retrieveTimeseriesRowCount(containerID: string, dataSourceID: string): Promise<TimeseriesRowCount> {
        return this.get<TimeseriesRowCount>(`/containers/${containerID}/import/datasources/${dataSourceID}/timeseries/count`);
    }

    retrieveTimeseriesRange(containerID: string, dataSourceID: string): Promise<TimeseriesRange> {
        return this.get<TimeseriesRange>(`/containers/${containerID}/import/datasources/${dataSourceID}/timeseries/range`);
    }

    retrieveNode(containerID: string, nodeID: string): Promise<NodeT> {
        return this.get<NodeT>(`/containers/${containerID}/graphs/nodes/${nodeID}`);
    }

    retrieveNodeHistory(containerID: string, nodeID: string): Promise<NodeT[]> {
        const query: {[key: string]: any} = {};
        query.history = 'true';
        query.includeRawData = 'true';

        return this.get<NodeT[]>(`/containers/${containerID}/graphs/nodes/${nodeID}`, query);
    }

    retrieveEdge(containerID: string, edgeID: string): Promise<EdgeT> {
        return this.get<EdgeT>(`/containers/${containerID}/graphs/edges/${edgeID}`);
    }

    retrieveEdgeHistory(containerID: string, edgeID: string): Promise<EdgeT[]> {
        const query: {[key: string]: any} = {};
        query.history = 'true';
        query.includeRawData = 'true';

        return this.get<EdgeT[]>(`/containers/${containerID}/graphs/edges/${edgeID}`, query);
    }

    countNodes(containerID: string, dataSourceID: string): Promise<number> {
        const query: {[key: string]: any} = {};

        query.dataSourceID = dataSourceID;
        query.count = true;
        return this.get<number>(`/containers/${containerID}/graphs/nodes`, query);
    }

    createEdge(containerID: string, edge: any): Promise<EdgeT[]> {
        return this.post<EdgeT[]>(`/containers/${containerID}/graphs/edges`, edge);
    }

    deleteEdge(containerID: string, edgeID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/graphs/edges/${edgeID}`);
    }

    listEdges(
        containerID: string,

        {
            relationshipPairName,
            relationshipPairID,
            limit,
            offset,
            originID,
            destinationID,
            dataSourceID,
            loadRelationshipPairs,
        }: {
            relationshipPairName?: string;
            relationshipPairID?: string;
            limit?: number;
            offset?: number;
            originID?: string;
            destinationID?: string;
            dataSourceID?: string;
            loadRelationshipPairs?: string;
        },
    ): Promise<EdgeT[]> {
        const query: {[key: string]: any} = {};

        if (dataSourceID) query.dataSourceID = dataSourceID;
        if (relationshipPairName) query.relationshipPairName = relationshipPairName;
        if (relationshipPairID) query.relationshipPairID = relationshipPairID;
        if (limit) query.limit = limit;
        if (offset) query.offset = offset;
        if (originID) query.originID = originID;
        if (destinationID) query.destinationID = destinationID;
        if (loadRelationshipPairs) query.loadRelationshipPairs = loadRelationshipPairs;

        return this.get<EdgeT[]>(`/containers/${containerID}/graphs/edges`, query);
    }

    countEdges(containerID: string, dataSourceID: string): Promise<number> {
        const query: {[key: string]: any} = {};

        query.dataSourceID = dataSourceID;
        query.count = true;
        return this.get<number>(`/containers/${containerID}/graphs/edges`, query);
    }

    listImports(
        containerID: string,
        dataSourceID: string,
        {limit, offset, sortBy, sortDesc, count}: {limit: number; offset: number; sortBy?: string; sortDesc?: boolean; count?: boolean},
    ): Promise<ImportT[]> {
        const query: {[key: string]: any} = {};

        query.limit = limit;
        query.offset = offset;
        if (sortBy) query.sortBy = sortBy;
        if (sortDesc) query.sortDesc = sortDesc;
        if (count) query.count = count;

        return this.get<ImportT[]>(`/containers/${containerID}/import/datasources/${dataSourceID}/imports`, query);
    }

    countImports(containerID: string, dataSourceID: string): Promise<number> {
        const query: {[key: string]: any} = {};

        query.count = true;
        return this.get<number>(`/containers/${containerID}/import/datasources/${dataSourceID}/imports`, query);
    }

    countDataForSource(containerID: string, dataSourceID: string): Promise<number> {
        return this.get<number>(`/containers/${containerID}/import/datasources/${dataSourceID}/data`);
    }

    listImportData(
        containerID: string,
        importID: string,
        {limit, offset, sortBy, sortDesc}: {limit: number; offset: number; sortBy?: string; sortDesc?: boolean},
    ): Promise<ImportDataT[]> {
        const query: {[key: string]: any} = {};

        query.limit = limit;
        query.offset = offset;
        if (sortBy) query.sortBy = sortBy;
        if (sortDesc) query.sortDesc = sortDesc;

        return this.get<ImportDataT[]>(`/containers/${containerID}/import/imports/${importID}/data`, query);
    }

    countImportData(containerID: string, importID: string): Promise<number> {
        const query: {[key: string]: any} = {};

        query.count = true;
        return this.get<number>(`/containers/${containerID}/import/imports/${importID}/data`, query);
    }

    deleteImport(containerID: string, importID: string, withData = false): Promise<boolean> {
        return this.delete(`/containers/${containerID}/import/imports/${importID}`, {withData});
    }

    deleteImportData(containerID: string, importID: string, dataID: number): Promise<boolean> {
        return this.delete(`/containers/${containerID}/import/imports/${importID}/data/${dataID}`);
    }

    inviteUserToContainer(containerID: string, email: string, role_name: string): Promise<boolean> {
        return this.postNoData(`/containers/${containerID}/users/invite`, {
            email,
            role_name,
        });
    }

    acceptContainerInvite(token: string): Promise<boolean> {
        const query: {[key: string]: any} = {};

        query.token = token;

        return this.getNoData(`/users/invite`, query);
    }

    listOutstandingContainerInvites(): Promise<UserContainerInviteT[]> {
        return this.get<UserContainerInviteT[]>(`/users/invites`);
    }

    listOntologyVersions(containerID: string, {status, createdBy}: {status?: string | string[]; createdBy?: string}): Promise<OntologyVersionT[]> {
        const query: {[key: string]: any} = {};

        if (status) query.status = Array.isArray(status) ? status.join(',') : status;
        if (createdBy) query.createdBy = createdBy;

        return this.get<OntologyVersionT[]>(`/containers/${containerID}/ontology/versions`, query);
    }

    updateUser(user: UserT | any, userID: string): Promise<UserT> {
        return this.put<UserT>(`/users/${userID}`, user);
    }

    deleteUser(userID: string): Promise<boolean> {
        return this.delete(`/users/${userID}`);
    }

    listUsers(): Promise<UserT[]> {
        return this.get<UserT[]>(`/users`);
    }

    listUsersInContainer(containerID: string): Promise<UserT[]> {
        return this.get<UserT[]>(`/containers/${containerID}/users`);
    }

    assignRoleToUser(containerID: string, payload: AssignRolePayloadT): Promise<boolean> {
        return this.post<boolean>(`/containers/${containerID}/users/roles`, payload);
    }

    retrieveUserRoles(containerID: string, userID: string): Promise<string[]> {
        return this.get<string[]>(`/containers/${containerID}/users/${userID}/roles`);
    }

    removeAllUserRoles(containerID: string, userID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/users/${userID}/roles`);
    }

    retrieveTypeMapping(containerID: string, dataSourceID: string, typeMappingID: string): Promise<TypeMappingT> {
        return this.get<TypeMappingT>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}`);
    }

    retrieveTypeMappingByShapeHash(containerID: string, dataSourceID: string, shapeHash: string): Promise<TypeMappingT> {
        const query: {[key: string]: any} = {};
        query.shapeHash = shapeHash;

        return this.get<TypeMappingT>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings`, query);
    }

    deleteTypeMapping(containerID: string, dataSourceID: string, typeMappingID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}`);
    }

    updateTypeMapping(containerID: string, dataSourceID: string, typeMappingID: string, mapping: TypeMappingT): Promise<boolean> {
        return this.putNoData(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}`, mapping);
    }

    // only use this function when exporting type mappings from one data source to another WITHIN THE SAME DL INSTANCE
    // this will not work for exporting to a separate instance of DeepLynx
    exportTypeMappings(containerID: string, dataSourceID: string, targetDataSource: string, ...typeMappings: TypeMappingT[]): Promise<ResultT<any>[]> {
        return this.postRawReturn<ResultT<any>[]>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/export`, {
            mapping_ids: typeMappings.map((mapping) => mapping.id),
            target_data_source: targetDataSource,
        });
    }

    importTypeMappings(containerID: string, dataSourceID: string, file: File): Promise<ResultT<any>[]> {
        return this.postFileRawReturn<ResultT<any>[]>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/import`, 'mappings', file);
    }

    retrieveTransformations(containerID: string, dataSourceID: string, typeMappingID: string): Promise<TypeMappingTransformationT[]> {
        return this.get<TypeMappingTransformationT[]>(
            `/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}/transformations`,
        );
    }

    retrieveTransformation(containerID: string, transformationID: string): Promise<TypeMappingTransformationT> {
        return this.get<TypeMappingTransformationT>(`/containers/${containerID}/transformations/${transformationID}`);
    }

    deleteTransformation(
        containerID: string,
        dataSourceID: string,
        typeMappingID: string,
        transformationID: string,
        {archive, forceDelete, withData, inUse}: {archive?: boolean; forceDelete?: boolean; withData?: boolean; inUse?: boolean},
    ): Promise<boolean> {
        const query: {[key: string]: any} = {};

        if (archive) query.archive = archive;
        if (forceDelete) query.forceDelete = forceDelete;
        if (withData) query.withData = withData;
        if (inUse) query.inUse = inUse;

        return this.deleteWithResponse(
            `/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}/transformations/${transformationID}`,
            query,
        );
    }

    listTypeMappings(
        containerID: string,
        dataSourceID: string,
        {
            limit,
            offset,
            sortBy,
            sortDesc,
            resultingMetatypeName,
            resultingMetatypeRelationshipName,
            noTransformations,
        }: {
            limit?: number;
            offset?: number;
            sortBy?: string;
            sortDesc?: boolean;
            resultingMetatypeName?: string | undefined;
            resultingMetatypeRelationshipName?: string | undefined;
            noTransformations?: boolean;
        },
    ): Promise<TypeMappingT[]> {
        const query: {[key: string]: any} = {};

        if (limit) query.limit = limit;
        if (offset) query.offset = offset;
        if (sortBy) query.sortBy = sortBy;
        if (sortDesc) query.sortDesc = sortDesc;
        if (resultingMetatypeName) query.resultingMetatypeName = resultingMetatypeName;
        if (resultingMetatypeRelationshipName) query.resultingMetatypeRelationshipName = resultingMetatypeRelationshipName;
        if (noTransformations) query.noTransformations = 'true';

        return this.get<TypeMappingT[]>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings`, query);
    }

    countTypeMappings(containerID: string, dataSourceID: string, needsTransformations?: boolean): Promise<number> {
        const query: {[key: string]: any} = {};

        if (needsTransformations) query.needsTransformations = true;
        query.count = true;

        return this.get<number>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings`, query);
    }

    listExports(
        containerID: string,
        {limit, offset, sortBy, sortDesc, count}: {limit?: number; offset?: number; sortBy?: string; sortDesc?: boolean; count?: boolean},
    ): Promise<ExportT[] | number> {
        const query: {[key: string]: any} = {};

        if (limit) query.limit = limit;
        if (offset) query.offset = offset;
        if (sortBy) query.sortBy = sortBy;
        if (sortDesc) query.sortDesc = sortDesc;
        if (count) query.count = 'true';

        return this.get<ExportT[] | number>(`/containers/${containerID}/data/export`, query);
    }

    createExport(containerID: string, exportT: ExportT): Promise<ExportT> {
        return this.post<ExportT>(`/containers/${containerID}/data/export/`, exportT);
    }

    startExport(containerID: string, exportID: string, reset?: boolean): Promise<boolean> {
        return this.post<boolean>(`/containers/${containerID}/data/export/${exportID}`, {}, {reset});
    }

    stopExport(containerID: string, exportID: string): Promise<boolean> {
        return this.put<boolean>(`/containers/${containerID}/data/export/${exportID}`, {});
    }

    deleteExport(containerID: string, exportID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/data/export/${exportID}`);
    }

    rollbackOntology(containerID: string, ontologyVersionID: string): Promise<boolean> {
        return this.post<boolean>(`/containers/${containerID}/ontology/versions/${ontologyVersionID}/rollback`, {});
    }

    createOntologyVersion(containerID: string, version: OntologyVersionT, baseVersionID: string): Promise<ChangelistT> {
        const query: {[key: string]: any} = {};
        query.baseOntologyVersion = baseVersionID;

        return this.post<ChangelistT>(`/containers/${containerID}/ontology/versions/`, version, query);
    }

    approveOntologyVersion(containerID: string, versionID: string): Promise<ChangelistApprovalT> {
        return this.put<ChangelistApprovalT>(`/containers/${containerID}/ontology/versions/${versionID}/approve`, {});
    }

    sendOntologyVersionForApproval(containerID: string, versionID: string): Promise<ChangelistApprovalT> {
        return this.post<ChangelistApprovalT>(`/containers/${containerID}/ontology/versions/${versionID}/approve`, {});
    }

    revokeOntologyVersionApproval(containerID: string, versionID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/ontology/versions/${versionID}/approve`, {});
    }

    applyOntologyVersion(containerID: string, versionID: string): Promise<boolean> {
        return this.post<boolean>(`/containers/${containerID}/ontology/versions/${versionID}/publish`, {});
    }

    deleteOntologyVersion(containerID: string, versionID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/ontology/versions/${versionID}`);
    }

    createTag(containerID: string, tags: TagT[]): Promise<boolean> {
        return this.post(`/containers/${containerID}/graphs/tags`, tags);
    }

    updateTag(containerID: string, tagID: string, tag: TagT): Promise<boolean> {
        return this.put(`/containers/${containerID}/graphs/tags/${tagID}`, tag);
    }

    listFilesWithAnyTag(containerID: string): Promise<any> {
        return this.get(`/containers/${containerID}/graphs/tags/files`);
    }

    listTagsForFile(containerID: string, fileID: string): Promise<TagT> {
        return this.get(`/containers/${containerID}/graphs/tags/files/${fileID}`);
    }

    listTagsForContainer(containerID: string): Promise<TagT[]> {
        return this.get(`/containers/${containerID}/graphs/tags`);
    }

    listTagsForNode(containerID: string, nodeID: string): Promise<TagT[]> {
        return this.get(`/containers/${containerID}/graphs/tags/nodes/${nodeID}`);
    }

    attachTagToNode(containerID: string, tagID: string, nodeID: string): Promise<TagT> {
        return this.put(`/containers/${containerID}/graphs/tags/${tagID}/nodes/${nodeID}`);
    }

    detachTagFromNode(containerID: string, tagID: string, nodeID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/graphs/tags/${tagID}/nodes/${nodeID}`);
    }

    listTagsForEdge(containerID: string, edgeID: string): Promise<TagT[]> {
        return this.get(`/containers/${containerID}/graphs/tags/edges/${edgeID}`);
    }

    attachTagToEdge(containerID: string, tagID: string, edgeID: string): Promise<TagT> {
        return this.put(`/containers/${containerID}/graphs/tags/${tagID}/edges/${edgeID}`);
    }

    detachTagFromEdge(containerID: string, tagID: string, edgeID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/graphs/tags/${tagID}/edges/${edgeID}`);
    }

    createWebGLTagsAndFiles(containerID: string, files: File[], tagName: string): Promise<boolean> {
        const query: {[key: string]: any} = {};
        query.tag = tagName;

        return this.postFiles(`/containers/${containerID}/graphs/webgl`, files, query);
    }

    listWebGLFilesAndTags(containerID: string): Promise<any> {
        return this.get(`/containers/${containerID}/graphs/webgl`);
    }

    updateWebGLFiles(containerID: string, fileID: string, files: File[]): Promise<boolean> {
        return this.putFiles(`/containers/${containerID}/graphs/webgl/files/${fileID}`, files);
    }

    deleteWebGLFile(containerID: string, fileID: string): Promise<boolean> {
        return this.delete(`/containers/${containerID}/graphs/webgl/files/${fileID}`);
    }

    createServalSession(containerID: string, body: object): Promise<any> {
        return this.post(`/containers/${containerID}/serval/sessions`, body);
    }

    listServalSessions(containerID: string): Promise<any> {
        return this.get(`/containers/${containerID}/serval/sessions`);
    }

    getServalSession(containerID: string, sessionID: string): Promise<any> {
        return this.get(`/containers/${containerID}/serval/sessions/${sessionID}`);
    }

    deleteServalSession(containerID: string, sessionID: string): Promise<any> {
        return this.delete(`/containers/${containerID}/serval/sessions/${sessionID}`);
    }

    listServalObjects(containerID: string, sessionID: string): Promise<any> {
        return this.get(`/containers/${containerID}/serval/sessions/${sessionID}/objects`);
    }

    getServalObject(containerID: string, sessionID: string, objectID: string): Promise<any> {
        return this.get(`/containers/${containerID}/serval/sessions/${sessionID}/objects/${objectID}`);
    }

    deleteServalObject(containerID: string, sessionID: string, objectID: string): Promise<any> {
        return this.delete(`/containers/${containerID}/serval/sessions/${sessionID}/objects/${objectID}`);
    }

    listServalPlayers(containerID: string, sessionID: string): Promise<any> {
        return this.get(`/containers/${containerID}/serval/sessions/${sessionID}/players`);
    }

    deleteServalPlayer(containerID: string, sessionID: string, playerID: string): Promise<any> {
        return this.delete(`/containers/${containerID}/serval/sessions/${sessionID}/players/${playerID}`);
    }

    private async get<T>(uri: string, queryParams?: {[key: string]: any}): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
        }

        // `${this.config?.rootURL}${uri}
        const resp: AxiosResponse = await axios.get(url, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            if (resp.data.isError) reject(resp.data.value);

            resolve(resp.data.value as T);
        });
    }

    private async getRaw<T>(uri: string, queryParams?: {[key: string]: any}): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
        }

        // `${this.config?.rootURL}${uri}
        const resp: AxiosResponse = await axios.get(url, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data);

            resolve(resp.data as T);
        });
    }

    // getNoData will return true if the response code falls between 200-299
    private async getNoData(uri: string, queryParams?: {[key: string]: any}): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
        }

        // `${this.config?.rootURL}${uri}
        const resp: AxiosResponse = await axios.get(url, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            if (resp.data.isError) reject(resp.data.value);

            resolve(true);
        });
    }

    private async delete(uri: string, queryParams?: {[key: string]: any}): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
        }

        const resp: AxiosResponse = await axios.delete(url, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }

    private async deleteWithResponse(uri: string, queryParams?: {[key: string]: any}): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
        }

        const resp: AxiosResponse = await axios.delete(url, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(resp.data.value);
        });
    }

    private async post<T>(uri: string, data: any, queryParams?: {[key: string]: any}): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
        }

        const resp: AxiosResponse = await axios.post(url, data, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            if (resp.data.isError) reject(resp.data.error);

            resolve(resp.data.value as T);
        });
    }

    private async postRawReturn<T>(uri: string, data: any, queryParams?: {[key: string]: any}): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
        }

        const resp: AxiosResponse = await axios.post(url, data, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) {
                resp.data.error ? reject(resp.data.error) : reject(resp.data);
            }

            resolve(resp.data as T);
        });
    }

    private async postNoData(uri: string, data: any, queryParams?: {[key: string]: any}): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
        }

        const resp: AxiosResponse = await axios.post(url, data, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }

    private async postNoPayload(uri: string): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        const resp: AxiosResponse = await axios.post(buildURL(this.config?.rootURL!, {path: uri}), {}, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }

    private async postFile(uri: string, inputName: string, file: File, queryParams?: {[key: string]: any}): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'multipart/form-data'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        let url: string;
        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
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
        config.headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'multipart/form-data'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        const formData = new FormData();
        formData.append(inputName, file);

        const resp: AxiosResponse = await axios.post(buildURL(this.config?.rootURL!, {path: uri}), formData, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(resp.data as T);
        });
    }

    private async postFiles(uri: string, files: File[], queryParams?: {[key: string]: any}): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'multipart/form-data'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        const formData = new FormData();
        for (const file of files) {
            formData.append(file.name, file);
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
        }
        const resp: AxiosResponse = await axios.post(url, formData, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }

    private async put<T>(uri: string, data?: any): Promise<T> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        const resp: AxiosResponse = await axios.put(`${this.config?.rootURL}${uri}`, data, config);

        return new Promise<T>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            if (resp.data.isError) reject(resp.data.value);

            resolve(resp.data.value as T);
        });
    }

    private async putNoData(uri: string, data: any, queryParams?: {[key: string]: any}): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
        }

        const resp: AxiosResponse = await axios.put(url, data, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }

    private async putFiles(uri: string, files: File[], queryParams?: {[key: string]: any}): Promise<boolean> {
        const config: AxiosRequestConfig = {};
        config.headers = {'Access-Control-Allow-Origin': '*', 'Content-Type': 'multipart/form-data'};
        config.validateStatus = () => {
            return true;
        };

        if (this.config?.auth_method === 'token') {
            config.headers = {Authorization: `Bearer ${RetrieveJWT()}`};
        }

        if (this.config?.auth_method === 'basic') {
            config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials;
        }

        const formData = new FormData();
        for (const file of files) {
            formData.append(file.name, file);
        }

        let url: string;

        if (queryParams) {
            url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!});
        } else {
            url = buildURL(this.config?.rootURL!, {path: uri});
        }
        const resp: AxiosResponse = await axios.put(url, formData, config);

        return new Promise<boolean>((resolve, reject) => {
            if (resp.status < 200 || resp.status > 299) reject(resp.data.error);

            resolve(true);
        });
    }
}

export default function ClientPlugin(Vue: typeof _Vue, options?: Config): void {
    Vue.prototype.$client = new Client(options);
}
