import Container from '../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeRelationship from '../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipPair from '../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeKey from '../../domain_objects/data_warehouse/ontology/metatype_key';
import MetatypeRelationshipKey from '../../domain_objects/data_warehouse/ontology/metatype_relationship_key';
import {User as DLUser} from '../../domain_objects/access_management/user';
import {OAuthApplication} from '../../domain_objects/access_management/oauth/oauth';
import EventRegistration from '../../domain_objects/event_system/event_registration';
import Node from '../../domain_objects/data_warehouse/data/node';
import Edge from '../../domain_objects/data_warehouse/data/edge';
import TypeMapping from '../../domain_objects/data_warehouse/etl/type_mapping';
import TypeTransformation from '../../domain_objects/data_warehouse/etl/type_transformation';
import {Exporter} from '../../domain_objects/data_warehouse/export/export';
import Import, {DataStaging} from '../../domain_objects/data_warehouse/import/import';
import {DataSource} from '../../domain_objects/data_warehouse/import/data_source';

declare global {
    namespace Express {
        // we're going to extend the standard Request in order to facilitate
        // the context middleware - this allows us to pass instantiated classes
        // based on url parameters - really a QoL change
        export interface Request {
            container?: Container;
            metatype?: Metatype;
            metatypeRelationship?: MetatypeRelationship;
            metatypeRelationshipPair?: MetatypeRelationshipPair;
            metatypeKey?: MetatypeKey;
            metatypeRelationshipKey?: MetatypeRelationshipKey;
            currentUser?: DLUser;
            routeUser?: DLUser;
            oauthApp?: OAuthApplication;
            eventRegistration?: EventRegistration;
            node?: Node;
            edge?: Edge;
            typeMapping?: TypeMapping;
            typeTransformation?: TypeTransformation;
            exporter?: Exporter;
            dataImport?: Import;
            dataStagingRecord?: DataStaging;
            dataSource?: DataSource;
        }
    }
}
