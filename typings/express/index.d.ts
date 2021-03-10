import Container from "../../src/data_warehouse/ontology/container"
import Metatype from "../../src/data_warehouse/ontology/metatype";

declare global {
    namespace Express {
        export interface Request {
            container?: Container
            metatype?: Metatype
        }
   }
}
