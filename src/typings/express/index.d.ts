import Container from "../../data_warehouse/ontology/container"
import Metatype from "../../data_warehouse/ontology/metatype";
import MetatypeRelationship from "../../data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipPair from "../../data_warehouse/ontology/metatype_relationship_pair";
import MetatypeKey from "../../data_warehouse/ontology/metatype_key";
import MetatypeRelationshipKey from "../../data_warehouse/ontology/metatype_relationship_key";

declare global {
    namespace Express {
        export interface Request {
            container?: Container
            metatype?: Metatype
            metatypeRelationship?: MetatypeRelationship
            metatypeRelationshipPair?: MetatypeRelationshipPair
            metatypeKey: MetatypeKey
            metatypeRelationshipKey: MetatypeRelationshipKey
        }
   }
}