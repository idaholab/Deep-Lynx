import {TypeMappingT, TypeTransformationConditionT, TypeTransformationT} from "../types/import/typeMappingT";
import {NodeT} from "../types/graph/nodeT";
import Result from "../result";
import {EdgeT} from "../types/graph/edgeT";
import {getNestedValue} from "../utilities";
import MetatypeKeyStorage from "../data_storage/metatype_key_storage";
import MetatypeRelationshipKeyStorage from "../data_storage/metatype_relationship_key_storage";
import {DataStagingT} from "../types/import/dataStagingT";



// TransformPayload takes a type mapping and applies it to the supplied payload
// this will create either an EdgeT or NodeT ready for insertion into the database.
// Because a type mapping might apply both data and connection (think a data node with
// a parent data node id included) this operation will also return a Node/Edge tuple
export async function TransformPayload(mapping: TypeMappingT, payload: {[key:string]: any}): Promise<Result<NodeT | EdgeT | [NodeT, EdgeT]>> {
    // TODO: IMPLEMENT
   return new Promise(resolve => resolve(Result.Failure('UNIMPLEMENTED')))
}

export async function ApplyTransformation(mapping: TypeMappingT, transformation: TypeTransformationT, data: DataStagingT): Promise<Result<NodeT[] | EdgeT[]>> {
   const newPayload: {[key:string]: any}  = {}
   const newPayloadRelationship: {[key:string]: any} = {}


   /*
   if(transformation.keys) {
      for (const k of transformation.keys!) {
         // the value can either be a constant value or an indicator of where to
         // fetch the value from the original payload
         let value:any = k.value

         if(k.key) {
            value = getNestedValue(k.key!, data.data)
         }
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

            newPayloadRelationship[fetched.value.property_name] = value
         }
      }
   }

   if(transformation.metatype_id && !transformation.metatype_relationship_pair_id) {
      const node = {
         metatype_id: transformation.metatype_id,
         properties: newPayload,
         type_mapping_transformation_id: transformation.id,
         data_source_id: mapping.data_source_id,
         container_id: mapping.container_id,
         data_staging_id: data.id,
      } as NodeT

      if(transformation.unique_identifier_key) {
         node.original_data_id = getNestedValue(transformation.unique_identifier_key!, data.data)
         node.composite_original_id = `${mapping.container_id}+${mapping.data_source_id}+${transformation.unique_identifier_key}+${getNestedValue(transformation.unique_identifier_key!, data.data)}`
      }

      return new Promise(resolve => resolve(Result.Success([node])))
   }
    */

   return transform(mapping, transformation, data)
}

async function transform(mapping: TypeMappingT, transformation: TypeTransformationT, data: DataStagingT, index?: number[]): Promise<Result<NodeT[] | EdgeT[]>> {
   let nodes: NodeT[] | EdgeT[] = []
   // if no root array, act normally
   if(!transformation.root_array) {
      return new Promise(resolve => resolve(Result.Success([{metatype_id: "", properties: {}}] as NodeT[])))
   }

   // lets see how nested the array we're dealing with is - number directly corresponds to the index argument
   const arrays = transformation.root_array.split("[]")

   // we're at the root
   if(!index || index.length === 0) {
      // fetch the root array
      const key = (arrays[0].charAt(arrays[0].length -1) === ".") ? arrays[0].substr(0, arrays[0].length -1 ) : arrays[0]

      const rootArray = getNestedValue(key, data.data)

      if(!Array.isArray(rootArray)) return new Promise(resolve => resolve(Result.Failure("provided root array key does not extract array from payload")))

      for(let i = 0; i < rootArray.length; i++) {
         const result = await transform(mapping, transformation, data, [i])

         if(result.isError) return new Promise(resolve => resolve(Result.Pass(result)))
         if(!result.isError) { // @ts-ignore
            nodes = [...nodes, ...result.value]
         }
      }


      return new Promise(resolve => resolve(Result.Success(nodes)))
   }

   // more arrays that index indicate we must dive deeper into the nested arrays
   if(index && index.length < arrays.length) {
      const rawKey = arrays.slice(0, index.length + 1).join("[]")
      const key = (rawKey.charAt(rawKey.length - 1) === ".") ? rawKey.substr(0, rawKey.length - 1) : rawKey

      const nestedArray = getNestedValue(key, data.data, [...index])

      if(!Array.isArray(nestedArray)) return new Promise(resolve => resolve(Result.Failure("provided nested array key does not extract array from payload")))

      for(let i = 0; i < nestedArray.length; i++) {
         const newIndex: number[] = (index) ? [...index] : []
         newIndex.push(i)
         const result = await transform(mapping, transformation, data, newIndex)

         if(result.isError) return new Promise(resolve => resolve(Result.Pass(result)))
         if(!result.isError) { // @ts-ignore
            nodes = [...nodes, ...result.value]
         }
      }


      return new Promise(resolve => resolve(Result.Success(nodes)))
   }

   // same number of arrays as indices indicate we can now build the node/edge
   if(index && index.length === arrays.length) {
      return new Promise(resolve => (resolve(Result.Success([{metatype_id: Math.random().toString(36).substr(7), properties: {}}] as NodeT[]))))
   }

   return new Promise(resolve => resolve(Result.Success(nodes)))
}

export function ValidTransformationCondition(condition: TypeTransformationConditionT, payload: {[key:string]: any}, index?: number[]): boolean {
   const value = getNestedValue(condition.key, payload, index)

   if(!value) return false
   let rootExpressionResult = compare(condition.operator, value, condition.value)

   // handle subexpressions
   if(condition.subexpressions && condition.subexpressions.length > 0) {
       for(const sub of condition.subexpressions) {
         const subValue = getNestedValue(sub.key, payload, index)

         if(sub.expression === "OR" && !rootExpressionResult) {
            rootExpressionResult = compare(sub.operator, subValue, sub.value)
         }

         if(sub.expression === "AND" && rootExpressionResult) {
            rootExpressionResult = compare(sub.operator, subValue, sub.value)
         }
       }
   }

   return rootExpressionResult
}

function compare(operator: string, value: any, expected?: any): boolean {
   switch(operator) {
      case "==": {
         return value === expected
      }

      case "!=": {
         return value !== expected
      }

      case "in": {
         const expectedValues = expected.split(",")

         return expectedValues.includes(value)
      }

      case "contains": {
         return String(value).includes(expected)
      }

      case "exists": {
         return typeof value !== "undefined"
      }

      case ">": {
         return value > expected
      }

      case "<": {
         return value < expected
      }

      case "<=": {
         return value <= expected
      }

      case ">=": {
         return value >= expected
      }

      default: {
         return false
      }
   }
}
