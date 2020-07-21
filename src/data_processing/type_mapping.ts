import {TypeMappingT} from "../types/import/typeMappingT";
import {NodeT} from "../types/graph/nodeT";
import Result from "../result";
import MetatypeKeyStorage from "../data_storage/metatype_key_storage";
import MetatypeRelationshipKeyStorage from "../data_storage/metatype_relationship_key_storage";
import {EdgeT} from "../types/graph/edgeT";
import {getNestedValue} from "../utilities";



// TransformPayload takes a type mapping and applies it to the supplied payload
// this will create either an EdgeT or NodeT ready for insertion into the database.
// Because a type mapping might apply both data and connection (think a data node with
// a parent data node id included) this operation will also return a Node/Edge tuple
export async function TransformPayload(mapping: TypeMappingT, payload: {[key:string]: any}): Promise<Result<NodeT | EdgeT | [NodeT, EdgeT]>> {
   const newPayload: {[key:string]: any}  = {}
   const newPayloadRelationship: {[key:string]: any} = {}


   if(mapping.keys) {
       for (const k of mapping.keys!) {
           // fetch value by key from the payload if it exists
           const value = getNestedValue(k.key!, payload)
           if (!value) continue;

           // separate the metatype and metatype relationship keys from each other
           // the type mapping _should_ have easily handled the combination of keys
           if (k.metatype_key_id) {
               const fetched = await MetatypeKeyStorage.Instance.Retrieve(k.metatype_key_id)
               if (fetched.isError) return Promise.resolve(Result.Failure('unable to fetch keys to map payload'))

               newPayload[fetched.value.property_name] = value
           }

           if (k.metatype_relationship_key_id) {
               const fetched = await MetatypeRelationshipKeyStorage.Instance.Retrieve(k.metatype_relationship_key_id)
               if (fetched.isError) return Promise.resolve(Result.Failure('unable to fetch keys to map payload'))

               newPayload[fetched.value.property_name] = value
           }
       }
   }


   // return a NodeT if we're handling data nodes
   if(mapping.metatype_id && !mapping.metatype_relationship_id) {
      const node = {
          metatype_id: mapping.metatype_id,
          properties: newPayload,
          data_type_mapping_id: mapping.id!,
          data_source_id: mapping.data_source_id,
          original_data_id: getNestedValue(mapping.unique_identifier_key, payload)
      } as NodeT

      if(mapping.action_key && getNestedValue(mapping.action_key, payload).toLowerCase() === "update") node.modified_at = new Date()
      if(mapping.action_key && getNestedValue(mapping.action_key, payload).toLowerCase() === "delete") node.deleted_at = new Date()

      return new Promise(resolve => {
           resolve(Result.Success(node))
       })
   }

   // return EdgeT if we're handling relationships between nodes
   if(mapping.metatype_relationship_id && !mapping.metatype_id) {
       const edge = {
           relationship_id: mapping.metatype_relationship_id,
           properties: newPayload,
           origin_node_original_id: getNestedValue(mapping.origin_key!, payload),
           destination_node_original_id: getNestedValue(mapping.destination_key!, payload),
           data_source_id: mapping.data_source_id, // we must include the data source, we can't search by original ID for connection without it
           original_data_id: getNestedValue(mapping.unique_identifier_key, payload)
       } as EdgeT

       if(mapping.action_key && getNestedValue(mapping.action_key, payload).toLowerCase() === "update") edge.modified_at = new Date()
       if(mapping.action_key && getNestedValue(mapping.action_key, payload).toLowerCase() === "delete") edge.deleted_at = new Date()

       return new Promise(resolve => {
           resolve(Result.Success(edge))
       })
   }

   // return a combination of both a new NodeT and EdgeT based on the type mapping
   if(mapping.metatype_id && mapping.metatype_relationship_id) {
       const node = {
           metatype_id: mapping.metatype_id,
           properties: newPayload,
           data_type_mapping_id: mapping.id!,
           data_source_id: mapping.data_source_id, // we must include the data source, we can't search by original ID for connection without it
           original_data_id: getNestedValue(mapping.unique_identifier_key, payload)
       } as NodeT

       const edge = {
           relationship_id: mapping.metatype_relationship_id,
           properties: newPayloadRelationship,
           origin_node_original_id: (mapping.origin_key) ? getNestedValue(mapping.origin_key, payload) : getNestedValue(mapping.unique_identifier_key, payload),
           destination_node_original_id: (mapping.destination_key) ? getNestedValue(mapping.destination_key,payload) : getNestedValue(mapping.unique_identifier_key, payload),
           data_source_id: mapping.data_source_id,
           original_data_id: getNestedValue(mapping.unique_identifier_key, payload)
       } as EdgeT

       if(mapping.action_key && getNestedValue(mapping.action_key, payload).toLowerCase() === "update") {
           edge.modified_at = new Date()
           node.modified_at = new Date()
       }

       if(mapping.action_key && getNestedValue(mapping.action_key, payload).toLowerCase() === "delete") {
           edge.deleted_at = new Date()
           node.deleted_at = new Date()
       }


       return new Promise(resolve => {
            resolve(Result.Success([node, edge] as [NodeT, EdgeT]))
        })
    }

   return new Promise(resolve => resolve(Result.Failure('unable to map payload')))
}
