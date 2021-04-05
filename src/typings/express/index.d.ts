import Container from "../../data_warehouse/ontology/container"
import Metatype from "../../data_warehouse/ontology/metatype";
import MetatypeRelationship from "../../data_warehouse/ontology/metatype_relationship";
import MetatypeRelationshipPair from "../../data_warehouse/ontology/metatype_relationship_pair";
import MetatypeKey from "../../data_warehouse/ontology/metatype_key";
import MetatypeRelationshipKey from "../../data_warehouse/ontology/metatype_relationship_key";
import {User as DLUser} from "../../access_management/user"
import {OAuthApplication} from "../../access_management/oauth/oauth";
import EventRegistration from "../../event_system/event_registration";
import Node from "../../data_warehouse/data/node";
import Edge from "../../data_warehouse/data/edge";
import TypeMapping from "../../data_warehouse/etl/type_mapping";
import TypeTransformation from "../../data_warehouse/etl/type_transformation";
import {Exporter} from "../../data_warehouse/export/export";
import Import, {DataStaging} from "../../data_warehouse/import/import";
import {DataSource} from "../../data_warehouse/import/data_source";


declare global {
    namespace Express {
        // we're going to extend the standard Request in order to facilitate
        // the context middleware - this allows us to pass instantiated classes
        // based on url parameters - really a QoL change
        export interface Request {
            container?: Container
            metatype?: Metatype
            metatypeRelationship?: MetatypeRelationship
            metatypeRelationshipPair?: MetatypeRelationshipPair
            metatypeKey?: MetatypeKey
            metatypeRelationshipKey?: MetatypeRelationshipKey
            currentUser?: DLUser
            routeUser?: DLUser
            oauthApp?: OAuthApplication
            eventRegistration?: EventRegistration
            node?: Node
            edge?: Edge
            typeMapping?: TypeMapping
            typeTransformation?: TypeTransformation
            exporter?: Exporter
            dataImport?: Import
            dataStagingRecord?: DataStaging
            dataSource?: DataSource
        }
   }
}
