import {TypeMappingT, TypeTransformationConditionT} from "../types/import/typeMappingT";
import {NodeT} from "../types/graph/nodeT";
import Result from "../result";
import {EdgeT} from "../types/graph/edgeT";
import {getNestedValue} from "../utilities";



// TransformPayload takes a type mapping and applies it to the supplied payload
// this will create either an EdgeT or NodeT ready for insertion into the database.
// Because a type mapping might apply both data and connection (think a data node with
// a parent data node id included) this operation will also return a Node/Edge tuple
export async function TransformPayload(mapping: TypeMappingT, payload: {[key:string]: any}): Promise<Result<NodeT | EdgeT | [NodeT, EdgeT]>> {
    // TODO: IMPLEMENT
   return new Promise(resolve => resolve(Result.Failure('UNIMPLEMENTED')))
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
