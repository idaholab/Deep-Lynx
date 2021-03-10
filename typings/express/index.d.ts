import Container from "../../src/data_warehouse/ontology/container"
import Metatype from "../../src/data_warehouse/ontology/metatype";
import MetatypeRelationship from "../../src/data_warehouse/ontology/metatype_relationship";

declare global {
    namespace Express {
        export interface Request {
            container?: Container
            metatype?: Metatype
            metatypeRelationship?: MetatypeRelationship
        }
   }
}
