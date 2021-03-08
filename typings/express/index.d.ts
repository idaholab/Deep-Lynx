import Container from "../../src/data_warehouse/ontology/container"

declare global {
    namespace Express {
        export interface Request {
            container?: Container
        }
   }
}
