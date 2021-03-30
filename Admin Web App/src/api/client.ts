import Config from "../config"
import {AxiosRequestConfig, AxiosResponse, AxiosBasicCredentials} from "axios";
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
   UserContainerInviteT,
   TypeMappingTransformationPayloadT,
   TypeMappingTransformationT, ExportT,
} from "@/api/types";
import {RetrieveJWT} from "@/auth/authentication_service";
import {UserT} from "@/auth/types";
import buildURL from 'build-url'
const axios = require('axios').default;

import  _Vue from "vue"

export type Config  = {
   rootURL: string;
   auth_method?: string;
   username?: string;
   password?: string;
}

// We provide both a a constructor and a singleton type instance for consumption. The
// singleton applies sane defaults based on the configuration file. We know however
// that there might be instances in which you might want to maintain connections to two
// separate deep-lynx instances, thus the combination of the two. The majority of the application
// will be written using the singleton class.
export class Client {
   config?: Config;

   constructor( config?: Config) {
      if(config) this.config = config;
   }

   listContainers(): Promise<ContainerT[]> {
     return this.get<ContainerT[]>("/containers")
   }

   retrieveContainer(containerID: string): Promise<ContainerT> {
      return this.get<ContainerT>(`/containers/${containerID}`)
   }

   createContainer(container: ContainerT | any): Promise<ContainerT[]> {
      return this.post<ContainerT[]>("/containers", container)
   }

   // like create container but instead uses a multipart form with a potential
   // file upload, taking .owl files and creating a container with all its supporting
   // metatypes etc.
   async containerFromImport(container: ContainerT | any, owlFile: File | null, owlFilePath: string): Promise<string> {
      const config: {[key: string]: any} = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password}
      }

      const formData = new FormData()
      formData.append('name', container.name)
      formData.append('description', container.description)

      if(owlFile) {
         formData.append('file', owlFile)
      }

      if(owlFilePath !== "") {
         formData.append('path', owlFilePath)
      }

      const resp: AxiosResponse = await axios.post(buildURL(this.config?.rootURL!, {path: `containers/import`}), formData, config as AxiosRequestConfig)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         if(resp.data.isError) reject(resp.data.error)

         resolve(resp.data.value)
      })
   }

   async updateContainerFromImport(containerID: string, owlFile: File | null, owlFilePath: string): Promise<string> {
      const config: {[key: string]: any} = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password}
      }

      const formData = new FormData()
      if(owlFile) {
         formData.append('file', owlFile)
      }

      if(owlFilePath !== "") {
         formData.append('path', owlFilePath)
      }

      const resp: AxiosResponse = await axios.put(buildURL(this.config?.rootURL!, {path: `containers/import/${containerID}`}), formData, config as AxiosRequestConfig)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         if(resp.data.isError) reject(resp.data.error)

         resolve(resp.data.value)
      })
   }

   deleteContainer(containerID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}`)
   }

   updateContainer(container: ContainerT | any, containerID: string): Promise<ContainerT> {
      return this.put<ContainerT>(`/containers/${containerID}`, container)
   }

   listMetatypes(containerID: string, {name, description, limit, offset, sortBy, sortDesc, count}: {name?: string; description?: string; limit?: number; offset?: number; sortBy?: string; sortDesc?: boolean; count?: boolean}): Promise<MetatypeT[] | number> {
      const query: {[key: string]: any} = {}

      if(name) query.name = name
      if(description) query.description = description
      if(limit) query.limit = limit
      if(offset) query.offset = offset
      if(sortBy) query.sortBy = sortBy
      if(sortDesc) query.sortDesc = sortDesc
      if(count) query.count = "true"

      return this.get<MetatypeT[] | number>(`/containers/${containerID}/metatypes`, query)
   }

   listMetatypeRelationshipPairs(containerID: string, {name, description, metatypeID, originID, destinationID, limit, offset, sortBy, sortDesc, count}: {name?: string; description?: string; metatypeID?: string; originID?: string; destinationID?: string; limit?: number; offset?: number; sortBy?: string; sortDesc?: boolean; count?: boolean}): Promise<MetatypeRelationshipPairT[] | number> {
      const query: {[key: string]: any} = {}

      if(name) query.name = name
      if(description) query.description = description
      if(originID) query.originID = originID
      if(destinationID) query.destinationID = destinationID
      if(metatypeID) query.metatypeID = metatypeID
      if(limit) query.limit = limit
      if(offset) query.offset = offset
      if(sortBy) query.sortBy = sortBy
      if(sortDesc) query.sortDesc = sortDesc
      if(count) query.count = count

      return this.get<MetatypeRelationshipPairT[] | number>(`/containers/${containerID}/metatype_relationship_pairs`, query)
   }


   createMetatype(containerID: string, name: string, description: string): Promise<MetatypeT[]> {
      return this.post<MetatypeT[]>(`/containers/${containerID}/metatypes`, {name, description})
   }

   retrieveMetatype(containerID: string, metatypeID: string): Promise<MetatypeT> {
      return this.get<MetatypeT>(`/containers/${containerID}/metatypes/${metatypeID}`)
   }

   updateMetatype(containerID: string, metatypeID: string, metatype: any): Promise<boolean> {
      return this.put<boolean>(`/containers/${containerID}/metatypes/${metatypeID}`, metatype)
   }

   deleteMetatype(containerID: string, metatypeID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/metatypes/${metatypeID}`)
   }

   listMetatypeKeys(containerID: string, metatypeID: string): Promise<MetatypeKeyT[]> {
      return this.get<MetatypeKeyT[]>(`/containers/${containerID}/metatypes/${metatypeID}/keys`)
   }

   createMetatypeKey(containerID: string, metatypeID: string, key: MetatypeKeyT): Promise<MetatypeKeyT[]> {
      return this.post<MetatypeKeyT[]>(`/containers/${containerID}/metatypes/${metatypeID}/keys`, key)
   }

   deleteMetatypeKey(containerID: string, metatypeID: string, keyID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/metatypes/${metatypeID}/keys/${keyID}`)
   }

   updateMetatypeKey(containerID: string, metatypeID: string, keyID: string, key: MetatypeKeyT): Promise<boolean> {
      return this.put<boolean>(`/containers/${containerID}/metatypes/${metatypeID}/keys/${keyID}`, key)
   }

   listMetatypeRelationships(containerID: string, {name, description, limit, offset, sortBy, sortDesc, count}: {name?: string; description?: string; limit?: number; offset?: number; sortBy?: string; sortDesc?: boolean; count?: boolean}): Promise<MetatypeRelationshipT[] | number> {
      const query: {[key: string]: any} = {}

      if(name) query.name = name
      if(description) query.description = name
      if(limit) query.limit = limit
      if(offset) query.offset = offset
      if(sortBy) query.sortBy = sortBy
      if(sortDesc) query.sortDesc = sortDesc
      if(count) query.count = "true"

      return this.get<MetatypeRelationshipT[] | number>(`/containers/${containerID}/metatype_relationships`, query)
   }

   retrieveMetatypeRelationship(containerID: string, metatypeRelationshipID: string): Promise<MetatypeRelationshipT> {
      return this.get<MetatypeRelationshipT>(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}`)
   }

   createMetatypeRelationship(containerID: string, name: string, description: string): Promise<MetatypeRelationshipT[]> {
      return this.post<MetatypeRelationshipT[]>(`/containers/${containerID}/metatype_relationships`, {name, description})
   }

   retrieveMetatypeRelationshipPair(containerID: string, metatypeRelationshipPairID: string): Promise<MetatypeRelationshipPairT> {
      return this.get<MetatypeRelationshipPairT>(`/containers/${containerID}/metatype_relationship_pairs/${metatypeRelationshipPairID}`)
   }

   updateMetatypeRelationship(containerID: string, metatypeRelationshipID: string, metatypeRelationship: any): Promise<boolean> {
      return this.put<boolean>(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}`, metatypeRelationship)
   }

   deleteMetatypeRelationship(containerID: string, metatypeRelationshipID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}`)
   }

   createMetatypeRelationshipPair(containerID: string, metatypeRelationshipPair: any): Promise<MetatypeRelationshipPairT[]> {
      return this.post<MetatypeRelationshipPairT[]>(`/containers/${containerID}/metatype_relationship_pairs`, metatypeRelationshipPair)
   }

   updateMetatypeRelationshipPair(containerID: string, metatypeRelationshipPairID: string, metatypeRelationshipPair: any): Promise<boolean> {
      return this.put<boolean>(`/containers/${containerID}/metatype_relationship_pairs/${metatypeRelationshipPairID}`, metatypeRelationshipPair)
   }

   deleteMetatypeRelationshipPair(containerID: string, metatypeRelationshipPairID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/metatype_relationship_pairs/${metatypeRelationshipPairID}`)
   }

   listMetatypeRelationshipKeys(containerID: string, relationshipID: string): Promise<MetatypeRelationshipKeyT[]> {
      return this.get<MetatypeRelationshipKeyT[]>(`/containers/${containerID}/metatype_relationships/${relationshipID}/keys`)
   }

   deleteMetatypeRelationshipKey(containerID: string, metatypeRelationshipID: string, keyID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}/keys/${keyID}`)
   }

   createMetatypeRelationshipKey(containerID: string, metatypeRelationshipID: string, key: MetatypeRelationshipKeyT): Promise<MetatypeRelationshipKeyT[]> {
      return this.post<MetatypeRelationshipKeyT[]>(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}/keys`, key)
   }

   updateMetatypeRelationshipKey(containerID: string, metatypeRelationshipID: string, keyID: string, key: MetatypeRelationshipKeyT): Promise<boolean> {
      return this.put<boolean>(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}/keys/${keyID}`, key)
   }

   createDataSource(containerID: string, dataSource: any): Promise<DataSourceT> {
      return this.post<DataSourceT>(`/containers/${containerID}/import/datasources`, dataSource)
   }

   createTypeMappingTransformation(containerID: string, dataSourceID: string, typeMappingID: string, transformation: TypeMappingTransformationPayloadT): Promise<TypeMappingTransformationPayloadT> {
      return this.post<TypeMappingTransformationPayloadT>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}/transformations`, transformation )
   }

   updateTypeMappingTransformation(containerID: string, dataSourceID: string, typeMappingID: string, transformationID: string, transformation: TypeMappingTransformationPayloadT): Promise<TypeMappingTransformationPayloadT> {
      return this.put<TypeMappingTransformationPayloadT>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}/transformations/${transformationID}`, transformation )
   }

   dataSourceJSONFileImport(containerID: string, dataSourceID: string, file: File): Promise<boolean> {
      return this.postFile(`/containers/${containerID}/import/datasources/${dataSourceID}/imports`, 'import', file)
   }

   listDataSources(containerID: string): Promise<DataSourceT[]> {
      return this.get<DataSourceT[]>(`/containers/${containerID}/import/datasources`)
   }

   deleteDataSources(containerID: string, dataSourceID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/import/datasources/${dataSourceID}`)
   }

   activateDataSource(containerID: string, dataSourceID: string): Promise<boolean> {
      return this.postNoPayload(`/containers/${containerID}/import/datasources/${dataSourceID}/active`)
   }

   deactivateDataSource(containerID: string, dataSourceID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/import/datasources/${dataSourceID}/active`)
   }

   listImports(containerID: string, dataSourceID: string, {limit, offset, sortBy, sortDesc}: {limit: number; offset: number; sortBy?: string; sortDesc?: boolean}): Promise<ImportT[]> {
      const query: {[key: string]: any} = {}

      query.limit = limit
      query.offset = offset
      if(sortBy) query.sortBy = sortBy
      if(sortDesc) query.sortDesc = sortDesc

      return this.get<ImportT[]>(`/containers/${containerID}/import/datasources/${dataSourceID}/imports`, query)
   }

   countImports(containerID: string, dataSourceID: string): Promise<number> {
      const query: {[key: string]: any} = {}

      query.count = true
      return this.get<number>(`/containers/${containerID}/import/datasources/${dataSourceID}/imports`, query)
   }

   listImportData(containerID: string, importID: string, {limit, offset, sortBy, sortDesc}: {limit: number; offset: number; sortBy?: string; sortDesc?: boolean}): Promise<ImportDataT[]> {
      const query: {[key: string]: any} = {}

      query.limit = limit
      query.offset = offset
      if(sortBy) query.sortBy = sortBy
      if(sortDesc) query.sortDesc = sortDesc

      return this.get<ImportDataT[]>(`/containers/${containerID}/import/imports/${importID}/data`, query)
   }

   countImportData(containerID: string, importID: string): Promise<number> {
      const query: {[key: string]: any} = {}

      query.count = true
      return this.get<number>(`/containers/${containerID}/import/imports/${importID}/data`, query)
   }

   deleteImport(containerID: string, importID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/import/imports/${importID}`)
   }

   deleteImportData(containerID: string, importID: string, dataID: number): Promise<boolean> {
      return this.delete(`/containers/${containerID}/import/imports/${importID}/data/${dataID}`)
   }

   inviteUserToContainer(containerID: string, email: string): Promise<boolean> {
      return this.postNoData(`/containers/${containerID}/users/invite`, {
         email
      })
   }

   acceptContainerInvite(token: string): Promise<boolean> {
      const query: {[key: string]: any} = {}

      query.token = token

      return this.getNoData(`/users/invite`, query)
   }

   listOutstandingContainerInvites(): Promise<UserContainerInviteT[]> {
      return this.get<UserContainerInviteT[]>(`/users/invites`)
   }

   updateUser(user: UserT | any, userID: string): Promise<UserT> {
      return this.put<UserT>(`/users/${userID}`, user)
   }

   deleteUser(userID: string): Promise<boolean> {
      return this.delete(`/users/${userID}`)
   }

   listUsers(): Promise<UserT[]> {
      return this.get<UserT[]>(`/users`)
   }

   listUsersInContainer(containerID: string): Promise<UserT[]> {
      return this.get<UserT[]>(`/containers/${containerID}/users`)
   }

   assignRoleToUser(containerID: string, payload: AssignRolePayloadT): Promise<boolean> {
      return this.post<boolean>(`/containers/${containerID}/users/roles`, payload)
   }

   retrieveUserRoles(containerID: string, userID: string): Promise<string[]> {
      return this.get<string[]>(`/containers/${containerID}/users/${userID}/roles`)
   }

   retrieveTypeMapping(containerID: string, dataSourceID: string, typeMappingID: string): Promise<TypeMappingT> {
      return this.get<TypeMappingT>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}`)
   }

   deleteTypeMapping(containerID: string, dataSourceID: string, typeMappingID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}`)
   }

   updateTypeMapping(containerID: string, dataSourceID: string, typeMappingID: string, mapping: TypeMappingT): Promise<boolean> {
      return this.putNoData(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}`, mapping)
   }

   retrieveTransformations(containerID: string, dataSourceID: string, typeMappingID: string): Promise<TypeMappingTransformationT[]> {
      return this.get<TypeMappingTransformationT[]>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}/transformations`)
   }

   deleteTransformation(containerID: string, dataSourceID: string, typeMappingID: string, tranformationID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}/transformations/${tranformationID}`)
   }


   listTypeMappings(containerID: string, dataSourceID: string, {limit, offset, sortBy, sortDesc, resultingMetatypeName, resultingMetatypeRelationshipName, noTransformations }: {limit?: number; offset?: number; sortBy?: string; sortDesc?: boolean; resultingMetatypeName?: string | undefined; resultingMetatypeRelationshipName?: string | undefined; noTransformations?: boolean}): Promise<TypeMappingT[]> {
      const query: {[key: string]: any} = {}

      if(limit) query.limit = limit
      if(offset) query.offset = offset
      if(sortBy) query.sortBy = sortBy
      if(sortDesc) query.sortDesc = sortDesc
      if(resultingMetatypeName) query.resultingMetatypeName = resultingMetatypeName
      if(resultingMetatypeRelationshipName) query.resultingMetatypeRelationshipName = resultingMetatypeRelationshipName
      if(noTransformations) query.noTransformations = "true"


      return this.get<TypeMappingT[]>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings`, query)
   }

   countTypeMappings(containerID: string, dataSourceID: string, needsTransformations?: boolean): Promise<number> {
      const query: {[key: string]: any} = {}

      if(needsTransformations) query.needsTransformations = true
      query.count = true

      return this.get<number>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings`, query)
   }

   listExports(containerID: string, {limit, offset, sortBy, sortDesc, count}: {limit?: number; offset?: number; sortBy?: string; sortDesc?: boolean; count?: boolean}): Promise<ExportT[] | number> {
      const query: {[key: string]: any} = {}

      if(limit) query.limit = limit
      if(offset) query.offset = offset
      if(sortBy) query.sortBy = sortBy
      if(sortDesc) query.sortDesc = sortDesc
      if(count) query.count = "true"

      return this.get<ExportT[] | number>(`/containers/${containerID}/data/export`, query)
   }

   createExport(containerID: string, exportT: ExportT): Promise<ExportT> {
      return this.post<ExportT>(`/containers/${containerID}/data/export/`, exportT)
   }

   startExport(containerID: string, exportID: string, reset?: boolean): Promise<boolean> {
       return this.post<boolean>(`/containers/${containerID}/data/export/${exportID}`, {}, {reset})
   }

   stopExport(containerID: string, exportID: string): Promise<boolean> {
      return this.put<boolean>(`/containers/${containerID}/data/export/${exportID}`, {})
   }

   deleteExport(containerID: string, exportID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/data/export/${exportID}`)
   }

   private async get<T>(uri: string, queryParams?: {[key: string]: any}): Promise<T> {
      const config: AxiosRequestConfig = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials
      }

      let url: string

      if(queryParams) {
          url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!})
       } else {
          url = buildURL(this.config?.rootURL!, {path: uri})
       }

      // `${this.config?.rootURL}${uri}
      const resp: AxiosResponse = await axios.get(url, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         if(resp.data.isError) reject(resp.data.value)

         resolve(resp.data.value as T)
       })
   }

   // getNoData will return true if the response code falls between 200-299
   private async getNoData(uri: string, queryParams?: {[key: string]: any}): Promise<boolean> {
      const config: AxiosRequestConfig = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials
      }

      let url: string

      if(queryParams) {
         url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!})
      } else {
         url = buildURL(this.config?.rootURL!, {path: uri})
      }

      // `${this.config?.rootURL}${uri}
      const resp: AxiosResponse = await axios.get(url, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         if(resp.data.isError) reject(resp.data.value)

         resolve(true)
      })
   }

   private async delete(uri: string): Promise<boolean> {
      const config: AxiosRequestConfig = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials
      }

      const resp: AxiosResponse = await axios.delete(`${this.config?.rootURL}${uri}`, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)


         resolve(true)
      })
   }

   private async post<T>(uri: string, data: any, queryParams?: {[key: string]: any}): Promise<T> {
      const config: AxiosRequestConfig = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials
      }

      let url: string

      if(queryParams) {
         url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!})
      } else {
         url = buildURL(this.config?.rootURL!, {path: uri})
      }

      const resp: AxiosResponse = await axios.post(url, data, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         if(resp.data.isError) reject(resp.data.value)

         resolve(resp.data.value as T)
      })
   }

   private async postNoData(uri: string, data: any, queryParams?: {[key: string]: any}): Promise<boolean> {
      const config: AxiosRequestConfig = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials
      }

      let url: string

      if(queryParams) {
         url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!})
      } else {
         url = buildURL(this.config?.rootURL!, {path: uri})
      }

      const resp: AxiosResponse = await axios.post(url, data, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         resolve(true)
      })
   }

   private async postNoPayload(uri: string): Promise<boolean> {
      const config: AxiosRequestConfig = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials
      }

      const resp: AxiosResponse = await axios.post(buildURL(this.config?.rootURL!, {path: uri}), {}, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         resolve(true)
      })
   }

   private async postFile(uri: string, inputName: string, file: File): Promise<boolean> {
      const config: AxiosRequestConfig = {}
      config.headers = {"Access-Control-Allow-Origin": "*", "Content-Type": 'multipart/form-data'}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials
      }

      const formData = new FormData()
      formData.append(inputName, file)

      const resp: AxiosResponse = await axios.post(buildURL(this.config?.rootURL!, {path:uri}), formData, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         resolve(true)
      })
   }

   private async put<T>(uri: string,data: any): Promise<T> {
      const config: AxiosRequestConfig = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials
      }

      const resp: AxiosResponse = await axios.put(`${this.config?.rootURL}${uri}`, data, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         if(resp.data.isError) reject(resp.data.value)

         resolve(resp.data.value as T)
      })
   }

   private async putNoData(uri: string, data: any, queryParams?: {[key: string]: any}): Promise<boolean> {
      const config: AxiosRequestConfig = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password} as AxiosBasicCredentials
      }

      let url: string

      if(queryParams) {
         url = buildURL(this.config?.rootURL!, {path: uri, queryParams: queryParams!})
      } else {
         url = buildURL(this.config?.rootURL!, {path: uri})
      }

      const resp: AxiosResponse = await axios.put(url, data, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         resolve(true)
      })
   }
}

export default function ClientPlugin(Vue: typeof _Vue, options?: Config): void {
  Vue.prototype.$client = new Client(options)
}
