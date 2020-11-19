import Config from "../config"
import {AxiosResponse} from "axios";
import {
   AssignRolePayloadT,
   ContainerT,
   DataSourceT, ImportDataT,
   ImportT,
   MetatypeKeyT,
   MetatypeT,
   TypeMappingPayloadT,
   TypeMappingT,
   MetatypeRelationshipT,
   MetatypeRelationshipKeyT,
   MetatypeRelationshipPairT,
   ResetPasswordPayloadT, NewUserPayloadT, UserContainerInviteT,
} from "@/api/types";
import {RetrieveJWT} from "@/auth/authentication_service";
import {KeyPairT, UserT} from "@/auth/types";
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

   createContainer(container: ContainerT | any): Promise<ContainerT> {
      return this.post<ContainerT>("/containers", container)
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

      const resp: AxiosResponse = await axios.post(buildURL(this.config?.rootURL!, {path: `containers/import`}), formData, config)

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

   requestPasswordReset(email: string): Promise<boolean> {
      const query: {[key: string]: any} = {}
      query.email = email

      return this.getNoData(`/users/reset-password`, query)
   }

   resetPassword(email: string, token: string, newPassword: string): Promise<boolean> {
      return this.postNoData(`/users/reset-password`, {
         email,
         token,
         new_password: newPassword
      } as ResetPasswordPayloadT)
   }

   validateEmail(userID: string, token: string): Promise<boolean> {
      const query: {[key: string]: any} = {}
      query.id = userID
      query.token = token

      return this.getNoData(`/users/validate`, query)
   }

   listMetatypes(containerID: string, {name, limit, offset}: {name?: string; limit?: number; offset?: number}): Promise<MetatypeT[]> {
      const query: {[key: string]: any} = {}

      if(name) query.name = name
      if(limit) query.limit = limit
      if(offset) query.offset = offset

      return this.get<MetatypeT[]>(`/containers/${containerID}/metatypes`, query)
   }

   listMetatypeRelationshipPairs(containerID: string, {name, metatypeID, originID, destinationID, limit, offset}: {name?: string; metatypeID?: string; originID?: string; destinationID?: string; limit: number; offset: number}): Promise<MetatypeRelationshipPairT[]> {
      const query: {[key: string]: any} = {}

      if(name) query.name = name
      if(originID) query.originID = name
      if(destinationID) query.destinationID = name
      if(metatypeID) query.metatypeID = metatypeID
      if(limit) query.limit = limit
      if(offset) query.offset = offset

      return this.get<MetatypeRelationshipPairT[]>(`/containers/${containerID}/metatype_relationship_pairs`, query)
   }

   listTypeMappings(containerID: string, datasourceID: string, {metatypeID, limit, offset}: {metatypeID?: string; limit?: number; offset?: number}): Promise<TypeMappingT[]> {
      if(!metatypeID){
         metatypeID = ""
      }

      return this.get<TypeMappingT[]>(`/containers/${containerID}/import/datasources/${datasourceID}/mappings?limit=${limit}&offset=${offset}&metatypeID=${metatypeID}`)
   }

   createMetatype(containerID: string, metatype: any): Promise<MetatypeT> {
      return this.post<MetatypeT>(`/containers/${containerID}/metatypes`, metatype)
   }

   updateMetatype(containerID: string, metatypeID: string, metatype: any): Promise<MetatypeT> {
      return this.put<MetatypeT>(`/containers/${containerID}/metatypes/${metatypeID}`, metatype)
   }

   deleteMetatype(containerID: string, metatypeID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/metatypes/${metatypeID}`)
   }

   listMetatypeKeys(containerID: string, metatypeID: string): Promise<MetatypeKeyT[]> {
      return this.get<MetatypeKeyT[]>(`/containers/${containerID}/metatypes/${metatypeID}/keys`)
   }

   listMetatypeRelationships(containerID: string, limit: number, offset: number): Promise<MetatypeRelationshipT[]> {
      return this.get<MetatypeRelationshipT[]>(`/containers/${containerID}/metatype_relationships?limit=${limit}&offset=${offset}`)
   }

   createMetatypeRelationship(containerID: string, metatypeRelationship: any): Promise<MetatypeRelationshipT> {
      return this.post<MetatypeRelationshipT>(`/containers/${containerID}/metatype_relationships`, metatypeRelationship)
   }

   updateMetatypeRelationship(containerID: string, metatypeRelationshipID: string, metatypeRelationship: any): Promise<MetatypeRelationshipT> {
      return this.put<MetatypeRelationshipT>(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}`, metatypeRelationship)
   }

   deleteMetatypeRelationship(containerID: string, metatypeRelationshipID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/metatype_relationships/${metatypeRelationshipID}`)
   }

   createMetatypeRelationshipPair(containerID: string, metatypeRelationshipPair: any): Promise<MetatypeRelationshipPairT> {
      return this.post<MetatypeRelationshipPairT>(`/containers/${containerID}/metatype_relationship_pairs`, metatypeRelationshipPair)
   }

   updateMetatypeRelationshipPair(containerID: string, metatypeRelationshipPairID: string, metatypeRelationshipPair: any): Promise<MetatypeRelationshipPairT> {
      return this.put<MetatypeRelationshipPairT>(`/containers/${containerID}/metatype_relationship_pairs/${metatypeRelationshipPairID}`, metatypeRelationshipPair)
   }

   deleteMetatypeRelationshipPair(containerID: string, metatypeRelationshipPairID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/metatype_relationship_pairs/${metatypeRelationshipPairID}`)
   }

   listMetatypeRelationshipKeys(containerID: string, relationshipID: string): Promise<MetatypeRelationshipKeyT[]> {
      return this.get<MetatypeRelationshipKeyT[]>(`/containers/${containerID}/metatype_relationships/${relationshipID}/keys`)
   }

   createDataSource(containerID: string, dataSource: any): Promise<DataSourceT> {
      return this.post<DataSourceT>(`/containers/${containerID}/import/datasources`, dataSource)
   }

   createTypeMapping(containerID: string, dataSourceID: string, mapping: TypeMappingPayloadT): Promise<TypeMappingT> {
      return this.post<TypeMappingT>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings`, mapping)
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

   deleteTypeMapping(containerID: string, dataSourceID: string, typeMappingID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/${typeMappingID}`)
   }

   countUnmappedData(containerID: string, dataSouceID: string): Promise<number> {
      return this.get<number>(`/containers/${containerID}/import/datasources/${dataSouceID}/mappings/unmapped/count`)
   }

   getUnmappedData(containerID: string, dataSourceID: string): Promise<{[key: string]: any}> {
       return this.get<{[key: string]: any}>(`/containers/${containerID}/import/datasources/${dataSourceID}/mappings/unmapped/data`)
   }

   listImports(containerID: string, dataSourceID: string): Promise<ImportT[]> {
      return this.get<ImportT[]>(`/containers/${containerID}/import/datasources/${dataSourceID}/imports`)
   }

   listImportData(containerID: string, importID: string, limit: number, offset: number): Promise<ImportDataT[]> {
      const query: {[key: string]: any} = {}

      query.limit = limit
      query.offset = offset
      return this.get<ImportDataT[]>(`/containers/${containerID}/import/imports/${importID}/data`, query)
   }

   deleteImport(containerID: string, importID: string): Promise<boolean> {
      return this.delete(`/containers/${containerID}/import/imports/${importID}`)
   }

   deleteImportData(containerID: string, importID: string, dataID: number): Promise<boolean> {
      return this.delete(`/containers/${containerID}/import/imports/${importID}/data/${dataID}`)
   }

   createNewUser(displayName: string, email: string, password: string): Promise<UserT> {
      return this.post<UserT>("/users", {
         display_name: displayName,
         email,
         password,
         identity_provider: "username_password"
      } as NewUserPayloadT)
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

   private async get<T>(uri: string, queryParams?: {[key: string]: any}): Promise<T> {
      const config: {[key: string]: any} = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password}
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
      const config: {[key: string]: any} = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password}
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
      const config: {[key: string]: any} = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password}
      }

      const resp: AxiosResponse = await axios.delete(`${this.config?.rootURL}${uri}`, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)


         resolve(true)
      })
   }

   private async post<T>(uri: string, data: any): Promise<T> {
      const config: {[key: string]: any} = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password}
      }

      const resp: AxiosResponse = await axios.post(buildURL(this.config?.rootURL!, {path: uri}), data, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         if(resp.data.isError) reject(resp.data.value)

         resolve(resp.data.value as T)
      })
   }

   private async postNoData(uri: string, data: any): Promise<boolean> {
      const config: {[key: string]: any} = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password}
      }

      const resp: AxiosResponse = await axios.post(buildURL(this.config?.rootURL!, {path: uri}), data, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         resolve(true)
      })
   }

   private async postNoPayload(uri: string): Promise<boolean> {
      const config: {[key: string]: any} = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password}
      }

      const resp: AxiosResponse = await axios.post(buildURL(this.config?.rootURL!, {path: uri}), {}, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         resolve(true)
      })
   }

   private async postFile(uri: string, inputName: string, file: File): Promise<boolean> {
      const config: {[key: string]: any} = {}
      config.headers = {"Access-Control-Allow-Origin": "*", "Content-Type": 'multipart/form-data'}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password}
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
      const config: {[key: string]: any} = {}
      config.headers = {"Access-Control-Allow-Origin": "*"}

      if(this.config?.auth_method === "token") {
         config.headers = {"Authorization": `Bearer ${RetrieveJWT()}`}
      }

      if(this.config?.auth_method === "basic") {
         config.auth = {username: this.config.username, password: this.config.password}
      }

      const resp: AxiosResponse = await axios.put(`${this.config?.rootURL}${uri}`, data, config)

      return new Promise((resolve, reject) => {
         if(resp.status < 200 || resp.status > 299) reject(resp.status)

         if(resp.data.isError) reject(resp.data.value)

         resolve(resp.data.value as T)
      })
   }
}

export default function ClientPlugin(Vue: typeof _Vue, options?: Config): void {
  Vue.prototype.$client = new Client(options)
}
