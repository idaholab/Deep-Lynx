import Container from "../../src/data_warehouse/ontology/container"
import Metatype from "../../src/data_warehouse/ontology/metatype";
import MetatypeRelationship from "../../src/data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipPair from "../../src/data_warehouse/ontology/metatype_relationship_pair";
import MetatypeKey from "../../src/data_warehouse/ontology/metatype_key";
import MetatypeRelationshipKey from "../../src/data_warehouse/ontology/metatype_relationship_key";

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
