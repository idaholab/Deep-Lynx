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
    // TODO: IMPLEMENT
   return new Promise(resolve => resolve(Result.Failure('UNIMPLEMENTED')))
}
