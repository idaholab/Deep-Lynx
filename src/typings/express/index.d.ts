import Container from '../../domain_objects/data_warehouse/ontology/container';
import Metatype from '../../domain_objects/data_warehouse/ontology/metatype';
import File from '../../domain_objects/data_warehouse/data/file';
import MetatypeRelationship from '../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipPair from '../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeKey from '../../domain_objects/data_warehouse/ontology/metatype_key';
import MetatypeRelationshipKey from '../../domain_objects/data_warehouse/ontology/metatype_relationship_key';
import {User as DLUser} from '../../domain_objects/access_management/user';
import {OAuthApplication} from '../../domain_objects/access_management/oauth/oauth';
import Node from '../../domain_objects/data_warehouse/data/node';
import Edge from '../../domain_objects/data_warehouse/data/edge';
import TypeMapping from '../../domain_objects/data_warehouse/etl/type_mapping';
import TypeTransformation from '../../domain_objects/data_warehouse/etl/type_transformation';
import Import, {DataStaging} from '../../domain_objects/data_warehouse/import/import';
import TaskRecord from '../../domain_objects/task_runner/task';
import Event from '../../domain_objects/event_system/event';
import EventAction from '../../domain_objects/event_system/event_action';
import EventActionStatus from '../../domain_objects/event_system/event_action_status';
import {Exporter} from '../../interfaces_and_impl/data_warehouse/export/exporter';
import {DataSource} from '../../interfaces_and_impl/data_warehouse/import/data_source';
import OntologyVersion from '../../domain_objects/data_warehouse/ontology/versioning/ontology_version';

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
            event?: Event;
            eventAction?: EventAction;
            eventActionStatus?: EventActionStatus;
            node?: Node;
            edge?: Edge;
            typeMapping?: TypeMapping;
            typeTransformation?: TypeTransformation;
            exporter?: Exporter;
            dataImport?: Import;
            dataStagingRecord?: DataStaging;
            dataSource?: DataSource;
            file?: File;
            task?: TaskRecord;
            ontologyVersion?: OntologyVersion;
        }
    }
}
