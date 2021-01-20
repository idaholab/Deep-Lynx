import {TypeMappingT, TypeTransformationConditionT, TypeTransformationT} from "../types/import/typeMappingT";
import {nodeT, NodeT} from "../types/graph/nodeT";
import Result from "../result";
import {edgeT, EdgeT} from "../types/graph/edgeT";
import {getNestedValue} from "../utilities";
import MetatypeKeyStorage from "../data_storage/metatype_key_storage";
import MetatypeRelationshipKeyStorage from "../data_storage/metatype_relationship_key_storage";
import {DataStagingT} from "../types/import/dataStagingT";
import Logger from "../logger"

// ApplyTransformation will take a mapping, a transformation, and a data record
// in order to generate an array of nodes or edges based on the transformation type
export async function ApplyTransformation(mapping: TypeMappingT, transformation: TypeTransformationT, data: DataStagingT): Promise<Result<NodeT[] | EdgeT[]>> {
   return transform(mapping, transformation, data)
}

// transform is used to recursively generate node/edges based on the transformation
// this allows us to handle the root array portion of type transformations and to
// generate nodes/edges based on nested data.
async function transform(mapping: TypeMappingT, transformation: TypeTransformationT, data: DataStagingT, index?: number[]): Promise<Result<NodeT[] | EdgeT[]>> {
   let results: NodeT[] | EdgeT[] = []
   // if no root array, act normally
   if(!transformation.root_array) {
      const results = await generateResults(mapping, transformation, data)

      if(results.isError) {
         return new Promise(resolve => resolve(Result.Pass(results)))
      }

      return new Promise(resolve => resolve(Result.Success(results.value)))
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

         if(result.isError){
            Logger.error(`unable to apply transformation ${result.error}`)
            continue
         }

         if(!result.isError) { // @ts-ignore
            results = [...results, ...result.value]
         }
      }


      return new Promise(resolve => resolve(Result.Success(results)))
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

         if(result.isError) {
            Logger.error(`unable to apply transformation ${result.error}`)
            continue
         }

         if(!result.isError) { // @ts-ignore
            results= [...results, ...result.value]
         }
      }


      return new Promise(resolve => resolve(Result.Success(results)))
   }

   // same number of arrays as indices indicate we can now build the node/edge
   if(index && index.length === arrays.length) {
      // validate the transformation now that we've run it down into the index
      let valid = false;

      // no conditions immediately equals true
      if(transformation.conditions && transformation.conditions.length === 0) valid = true;

      if(transformation.conditions) {
         for(const condition of transformation.conditions) {
            const isValid = await ValidTransformationCondition(condition, data.data as {[key:string]: any}, [...index])

            if(isValid) {
               valid = true
               break;
            }
         }
      }

      // we don't error out on a non-matching condition, simply pass the transformation by
      if(!valid) return new Promise(resolve => resolve(Result.Success([])))

      const results = await generateResults(mapping, transformation, data, [...index])

      if(results.isError) {
         return new Promise(resolve => resolve(Result.Pass(results)))
      }

      return new Promise(resolve => resolve(Result.Success(results.value)))
   }

   return new Promise(resolve => resolve(Result.Success(results)))
}

// generate results is the actual node/edge creation. While this only ever returns
// a single node/edge, it returns it in an array for ease of use in the recursive
// transform function
async function generateResults(mapping: TypeMappingT, transformation: TypeTransformationT, data: DataStagingT, index?: number[]): Promise<Result<NodeT[] | EdgeT[]>> {
   const newPayload: {[key:string]: any}  = {}
   const newPayloadRelationship: {[key:string]: any} = {}

   if(transformation.keys) {
      for (const k of transformation.keys!) {
         // the value can either be a constant value or an indicator of where to
         // fetch the value from the original payload
         let value:any = k.value

         if(k.key) {
            value = getNestedValue(k.key!, data.data, index)
         }
         if (typeof value === "undefined") continue;

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



   // create a node if metatype id is set
   if(transformation.metatype_id && !transformation.metatype_relationship_pair_id) {
      const node = {
         metatype_id: transformation.metatype_id,
         properties: newPayload,
         type_mapping_transformation_id: transformation.id,
         data_source_id: mapping.data_source_id,
         container_id: mapping.container_id,
         data_staging_id: data.id,
         import_data_id: data.import_id,
      } as NodeT

      if(transformation.unique_identifier_key) {
         node.original_data_id = `${getNestedValue(transformation.unique_identifier_key!, data.data, index)}`
         node.composite_original_id = `${mapping.container_id}+${mapping.data_source_id}+${transformation.unique_identifier_key}+${getNestedValue(transformation.unique_identifier_key!, data.data, index)}`
      }

      return new Promise(resolve => resolve(Result.Success([node])))
   }

   // create an edge if the relationship id is set
   if(transformation.metatype_relationship_pair_id && !transformation.metatype_id) {
       const edge = {
          relationship_pair_id: transformation.metatype_relationship_pair_id,
          properties: newPayloadRelationship,
          type_mapping_transformation_id: transformation.id,
          data_source_id: mapping.data_source_id,
          container_id: mapping.container_id,
          data_staging_id: data.id,
          import_data_id: data.import_id,
          origin_node_original_id: `${getNestedValue(transformation.origin_id_key!, data.data, index)}`,
          destination_node_original_id: `${getNestedValue(transformation.destination_id_key!, data.data, index)}`,
          origin_node_composite_original_id: `${mapping.container_id}+${mapping.data_source_id}+${transformation.origin_id_key}+${getNestedValue(transformation.origin_id_key!, data.data, index)}`,
          destination_node_composite_original_id: `${mapping.container_id}+${mapping.data_source_id}+${transformation.destination_id_key}+${getNestedValue(transformation.destination_id_key!, data.data, index)}`
       } as EdgeT

       if(transformation.unique_identifier_key) {
         edge.original_data_id = `${getNestedValue(transformation.unique_identifier_key!, data.data, index)}`
         edge.composite_original_id = `${mapping.container_id}+${mapping.data_source_id}+${transformation.unique_identifier_key}+${getNestedValue(transformation.unique_identifier_key!, data.data, index)}`
      }

       return new Promise(resolve => resolve(Result.Success([edge])))

   }

   return new Promise(resolve => resolve(Result.Failure("unable to generate either node or edge")))
}

// will return whether or not a transformation condition is valid for a given payload
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


// type guard for differentiating an array of nodes from either array of nodes or edges
export function IsNodes(set: NodeT[] | EdgeT[]): set is NodeT[] {
   // technically an empty array could be a set of NodeT
   if(Array.isArray(set) && set.length === 0) return true;

   return nodeT.is(set[0])
}


// type guard for differentiating an array of edges from either array of nodes or edges
export function IsEdges(set: NodeT[] | EdgeT[]): set is EdgeT[] {
   // technically an empty array could be a set of EdgeT
   if(Array.isArray(set) && set.length === 0) return true;

   return edgeT.is(set[0])
}
