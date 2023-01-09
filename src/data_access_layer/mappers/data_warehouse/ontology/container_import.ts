/* eslint-disable @typescript-eslint/restrict-plus-operands */
import axios, {AxiosRequestConfig} from 'axios';
import MetatypeKeyMapper from './metatype_key_mapper';
import Result from '../../../../common_classes/result';
import Logger from '../../../../services/logger';
import ContainerRepository from '../../../repositories/data_warehouse/ontology/container_respository';
import Container, {ContainerAlert, ContainerConfig} from "../../../../domain_objects/data_warehouse/ontology/container";
import MetatypeRepository from '../../../repositories/data_warehouse/ontology/metatype_repository';
import Metatype from '../../../../domain_objects/data_warehouse/ontology/metatype';
import MetatypeRelationshipRepository from '../../../repositories/data_warehouse/ontology/metatype_relationship_repository';
import MetatypeRelationship from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship';
import MetatypeRelationshipPairRepository from '../../../repositories/data_warehouse/ontology/metatype_relationship_pair_repository';
import MetatypeRelationshipPair from '../../../../domain_objects/data_warehouse/ontology/metatype_relationship_pair';
import MetatypeKeyRepository from '../../../repositories/data_warehouse/ontology/metatype_key_repository';
import MetatypeKey from '../../../../domain_objects/data_warehouse/ontology/metatype_key';
import {User} from '../../../../domain_objects/access_management/user';
import NodeRepository from '../../../repositories/data_warehouse/data/node_repository';
import EdgeRepository from '../../../repositories/data_warehouse/data/edge_repository';
import {stringToValidPropertyName} from "../../../../services/utilities";
import OntologyVersionRepository
    from "../../../repositories/data_warehouse/ontology/versioning/ontology_version_repository";
import OntologyVersion from "../../../../domain_objects/data_warehouse/ontology/versioning/ontology_version";
const convert = require('xml-js');
const xmlToJson = require('xml-2-json-streaming');
const xmlParser = xmlToJson();
import pAll from 'p-all';

const containerRepo = new ContainerRepository();
const metatypeRelationshipRepo = new MetatypeRelationshipRepository();
const metatypeRepo = new MetatypeRepository();
const metatypeRelationshipPairRepo = new MetatypeRelationshipPairRepository();
const metatypeKeyRepo = new MetatypeKeyRepository();
const ontologyRepo = new OntologyVersionRepository();
const nodeRepo = new NodeRepository();
const edgeRepo = new EdgeRepository();
import {Worker} from "worker_threads";
import {plainToInstance} from "class-transformer";

// vestigial type for ease of use
export type ContainerImportT = {
    name: string;
    description?: string | undefined;
    path?: string | undefined;
    data_versioning_enabled: boolean
    ontology_versioning_enabled: boolean
    enabled_data_sources: string[]
};

/*
  ContainerImport is a set of functions which allow the user to create and populate
  or update an existing container using an .owl ontology file
*/
export default class ContainerImport {
    private static instance: ContainerImport;

    public static get Instance(): ContainerImport {
        if (!ContainerImport.instance) {
            ContainerImport.instance = new ContainerImport();
        }
        return ContainerImport.instance;
    }

    private ValidateTarget(target: string): string {
        // Replace incompatible data_type properties (ID, IDREF, etc.)
        // Don't replace any IDs of other classes
        const regex = new RegExp('[1-9:-]');
        if (!['string', 'number', 'boolean', 'date', 'enumeration', 'file'].includes(target) && !regex.test(target)) {
            switch (target) {
                case 'integer':
                    target = 'number64';
                    break;
                case 'int':
                    target = 'number64';
                    break;
                case 'decimal':
                    target = 'float64';
                    break;
                case 'float':
                    target = 'float';
                    break;
                case 'double':
                    target = 'float64';
                    break;
                case 'rational':
                    target = 'float64';
                    break;
                case 'dateTimeStamp':
                    target = 'date';
                    break;
                case 'dateTime':
                    target = 'date';
                    break;
                case 'anyURI':
                    target = 'file';
                    break;
                case 'IDREF':
                    target = 'string';
                    break;
                case 'ID':
                    target = 'string';
                    break;
                case 'List':
                    target = 'list';
                    break;
                default:
                    target = 'string';
            }
        }
        return target;
    }

    private rollbackOntology(container: Container) {
        return new Promise((resolve, reject) => {
            containerRepo
                .delete(container)
                .then(() => {
                    resolve('Ontology rolled back successfully.');
                })
                .catch(() => {
                    reject('Unable to roll back ontology.');
                });
        });
    }

    private replaceAll(str: string, find: string, replace: string) {
        return str.replace(new RegExp(find, 'g'), replace);
    }

    public async ImportOntology(
        user: User,
        input: ContainerImportT,
        file: Buffer,
        dryrun: boolean,
        update: boolean,
        containerID: string,
        dirname?: string, // override the dirname, needed for testing
    ): Promise<Result<string>> {
        let workerLocation: string
        if(dirname) {
            workerLocation = dirname+'/container_import_worker.js'
        } else {
            workerLocation = __dirname+'/container_import_worker.js'
        }
        let container: Container;
        let ontologyVersionID: string | undefined;

        // only do container creation and whatnot if a dryrun
        if(!dryrun) {
            if (!update) {
                container = new Container({
                    name: input.name,
                    description: input.description!,
                    config: new ContainerConfig({
                        data_versioning_enabled: input.data_versioning_enabled,
                        ontology_versioning_enabled: input.ontology_versioning_enabled,
                        enabled_data_sources: input.enabled_data_sources
                    })
                });

                const saved = await containerRepo.save(container, user);
                if (saved.isError) return Promise.resolve(Result.DebugFailure(saved.error.error));
            } else {
                const containerResult = await containerRepo.findByID(containerID);
                if (containerResult.isError) return Promise.resolve(Result.Failure(`Unable to retrieve container ${containerID}`));

                container = containerResult.value;
            }

            // if it's an update we need to set the ontology version manually so that we're not actually updating
            // the ontology if versioning is enabled
            if(container.config!.ontology_versioning_enabled && update) {
                if(container.config!.ontology_versioning_enabled) {
                    const ontologyVersion  =  new OntologyVersion({
                        container_id: container.id!,
                        name: `Update - ${new Date().toDateString()}`,
                        description: 'Updates created from uploading an .OWL file',
                        status: 'generating'
                    })

                    const saved = await ontologyRepo.save(ontologyVersion, user)

                    if(saved.isError) {
                        Logger.error(`unable to create ontology version for update from .OWL file ${saved.error?.error}`)
                    } else {
                        ontologyVersionID = ontologyVersion.id
                    }
                }
            }

            // if we're not making the ontology, and it's set to null, let's make sure we check for existing ontology
            // versions to ensure we're assigning these guys to the proper one - when we create a container an ontology
            // version is automatically created, so this will pull that one.
            if(!ontologyVersionID) {
                const results = await ontologyRepo
                    .where()
                    .containerID('eq', container.id!)
                    .and()
                    .status('in', ['published', 'ready']).list({sortBy: 'id', sortDesc: true})
                if(results.isError) {
                    Logger.error(`unable to find published version of ontology ${results.error?.error}`)
                } else if(results.value.length > 0){
                    ontologyVersionID = results.value.find(version => version.status === 'published')?.id

                    if(!ontologyVersionID) ontologyVersionID = results.value.find(version => version.status === 'ready')?.id
                }
            }

            if(ontologyVersionID) {
            // now we set the ontology version's status to generating
                const set = await ontologyRepo.setStatus(ontologyVersionID, 'generating')
                if(set.isError) {
                    Logger.error(`unable to set ontology version status to generating ${set.error}`)
                }
            }
        }


        if (file.length === 0) {
            // configure and make an http request to retrieve the ontology file then parse ontology
            const axiosConfig: AxiosRequestConfig = {
                headers: {
                    'Content-Type': 'application/xml;charset=UTF-8',
                },
                responseType: 'text',
            };

            try{
                const resp = await axios.get(input.path!, axiosConfig);
                return new Promise<Result<string>>((resolve, reject) => {
                    if (resp.status < 200 || resp.status > 299) reject(resp.status);

                    if (resp.data.isError) reject(resp.data.value);

                    const jsonData = convert.xml2json(resp.data, {
                        compact: true,
                        ignoreComment: true,
                        spaces: 4,
                    });

                    const worker = new Worker(workerLocation, {
                        workerData: {
                            user,
                            json: JSON.parse(jsonData),
                            name: input.name,
                            description: input.description || '',
                            data_versioning_enabled: input.data_versioning_enabled,
                            ontology_versioning_enabled: input.ontology_versioning_enabled,
                            dryrun, update, container
                        }
                    })

                    worker.on('error', (err: any) => {
                        void this.rollbackVersion(
                            container.id!,
                            ontologyVersionID!,
                            input.ontology_versioning_enabled,
                            update,
                            err)

                        Logger.error(`worker error for ontology importer ${err}`)
                    })

                    worker.on('close', (code) => {
                        if(code === 1) {
                            void this.rollbackVersion(
                                container.id!,
                                ontologyVersionID!,
                                input.ontology_versioning_enabled,
                                update,
                            )
                            Logger.error('ontology version worker exited abnormally')
                        } else {
                            void ontologyRepo.setStatus(ontologyVersionID!, 'ready')
                            resolve(Result.Success(container.id!))
                        }
                    })

                    // if we have a dir assume it's a test and be sync
                    if(dirname) {
                        worker.on('message', (message:string) => {
                            const result = plainToInstance(Result, JSON.parse(message) as object)

                            resolve(result)
                        })
                    } else {
                        worker.on('message', (message:string) => {
                            const result = plainToInstance(Result, JSON.parse(message) as object)

                            if(result.isError) {
                                void this.rollbackVersion(
                                    container.id!,
                                    ontologyVersionID!,
                                    input.ontology_versioning_enabled,
                                    update,
                                    result.error)
                                Logger.error(result.error)
                            }
                            else Logger.info('ontology imported successfully')
                        })

                        resolve(Result.Success(container.id!))
                    }


                }).catch((e) => {
                    return Promise.reject(Result.Failure(e));
                });
            } catch(e: any) {
                return Promise.resolve(Result.Error(e))
            }

        } else {
            // validate file content, first non-whitespace character must be '<'
            const stringBuffer = file.toString('utf8').trim()[0];

            if (stringBuffer !== '<') {
                return Promise.resolve(Result.Failure('Unsupported owl type supplied. Please provide a rdf/xml file.'));
            }
            // ontology file has been supplied, cleanse XML, convert to json, and parse ontology
            let xml = file.toString('utf8');

            // substitute entities if they exist to enable JSON conversion
            const doctypeRegexTest = new RegExp('<!DOCTYPE', 'gm')
            const entityRegex = new RegExp('<!ENTITY (\\w*) "(\\S+)"', 'gm')

            const isEntities = doctypeRegexTest.test(xml)
            if (isEntities) {
                const matchedEntities = xml.matchAll(entityRegex) || []
                const entities: {[key: string]: string} = {}

                for (const entity of matchedEntities) {
                    // the name of the entity will be captured in the group, or second entry of the regex array
                    // the value for the entity will be captured in the next group
                    if (entity[1] !== '' && entity[2]) {
                        entities[entity[1]] = entity[2]
                    }
                }

                // grab Doctype within which to replace sub entities
                const doctypeRegex = new RegExp('<!DOCTYPE(.|\n)*]>', 'gm')
                const doctype = xml.match(doctypeRegex)

                if (doctype && doctype[0]) {
                    for (const [key, value] of Object.entries(entities)) {
                        // find entities that are using substitution and replace them
                        const entitySubRegex = new RegExp('&(\\w+);', 'gm')
                        const subMatches = value.matchAll(entitySubRegex)
                        for (const match of subMatches) {
                            const regex = `&${match[1]};`
                            // if there is no entry, we can't complete the substitution. Error and exit
                            if (typeof entities[match[1]] == 'undefined') {
                                return Promise.reject(Result.Failure('Unrecognized file content. Please ensure this is a valid rdf/xml document.'));
                            }
                            entities[key] = this.replaceAll(value, regex, entities[match[1]])
                        }

                    }

                    // finally we can update all remaining entity uses throughout the document
                    for (const [key, value] of Object.entries(entities)) {
                        // find entities that are using substitution and replace them
                        const regex = `&${key};`
                        xml = this.replaceAll(xml, regex, value)
                    }

                }

                // remove the !DOCTYPE declaration to finalize as valid XML for conversion to JSON
                const docRegex = '<!DOCTYPE(.|\n)*]>'
                xml = this.replaceAll(xml, docRegex, '')
            }

            const json = await xmlParser.xmlToJson(xml, (err: any,json: any)=>{
                if(err) {
                    // error handling - most likely invalid XML syntax
                    // exit and return error
                    Logger.error(err)
                    if (err.message) {
                        return Promise.reject(Result.Failure(err.message));
                    }
                    return Promise.reject(Result.Failure(err));
                }

                return json
            });

            return new Promise<Result<string>>((resolve, reject) => {
                const worker = new Worker(workerLocation, {
                    workerData:{ input: {
                        user,
                        json,
                        name: input.name,
                        description: input.description || '',
                        data_versioning_enabled: input.data_versioning_enabled,
                        ontology_versioning_enabled: input.ontology_versioning_enabled,
                        dryrun, update, container, ontologyVersionID
                    }}
                })

                worker.on('error', (err: any) => {
                    void this.rollbackVersion(
                        container.id!,
                        ontologyVersionID!,
                        input.ontology_versioning_enabled,
                        update,
                        err)
                    Logger.error(`worker error for ontology importer ${err}`)
                })

                worker.on('close', () => {
                    void this.rollbackVersion(
                        container.id!,
                        ontologyVersionID!,
                        input.ontology_versioning_enabled,
                        update,
                    )
                    Logger.error('ontology version worker exited abnormally')
                })

                // if we have a dir assume it's a test and be sync
                if(dirname) {
                    worker.on('message', (message:string) => {
                        const result = plainToInstance(Result, JSON.parse(message) as object)

                        resolve(result)
                    })
                } else {
                    worker.on('message', (message:string) => {
                        const result = plainToInstance(Result, JSON.parse(message) as object)

                        if(result.isError) {
                            void this.rollbackVersion(
                                container.id!,
                                ontologyVersionID!,
                                input.ontology_versioning_enabled,
                                update,
                                result.error)
                            Logger.error(result.error)
                        }
                        else Logger.info('ontology imported successfully')
                    })

                    resolve(Result.Success(container.id!))
                }
            }).catch((e) => {
                Logger.error(e)
                if (e.message) {
                    return Promise.reject(Result.Failure(e.message));
                }
                return Promise.reject(Result.Error(e));
            });
        }
    }

    async parseOntology(
        input: {user: User | any,
            json: any,
            name: string,
            description: string,
            data_versioning_enabled: boolean,
            ontology_versioning_enabled: boolean,
            dryrun: boolean,
            update: boolean,
            container: Container,
            ontologyVersionID?: string}
    ): Promise<Result<string>> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        return new Promise<Result<string>>(async (resolve) => {
            let ontologyHead: {[key: string]: any} = {};
            let objectProperties = [];
            let datatypeProperties = [];
            let classes = [];

            // We currently only allow rdf/xml documents
            // Fail if the xml document does not match specified type
            if (input.json['rdf:RDF']) {
                input.json = input.json['rdf:RDF'];

                ontologyHead = input.json['owl:Ontology'] || {};
                objectProperties = input.json['owl:ObjectProperty'] || [];
                datatypeProperties = input.json['owl:DatatypeProperty'] || [];
                classes = input.json['owl:Class'] || [];
            } else {
                resolve(Result.Failure('Unrecognized file content. Please ensure this is a valid rdf/xml document.'));
            }

            // ensure the property and class variables above are arrays
            if (!Array.isArray(objectProperties)) {
                objectProperties = [objectProperties]
            }

            if (!Array.isArray(datatypeProperties)) {
                datatypeProperties = [datatypeProperties]
            }

            if (!Array.isArray(classes)) {
                classes = [classes]
            }

            // Declare an intersection type to add needed fields to MetatypeT
            type MetatypeExtendT = {
                name: string;
                description: string;
                id?: string;
                container_id?: string;
                archived?: boolean;
                created_by?: string;
                modified_by?: string;
                created_at?: string | Date | undefined;
                modified_at?: string | Date | undefined;
                db_id?: string;
                parent_id?: string;
                properties: {[key: string]: any};
                keys: {[key: string]: any};
                updateKeys: Map<string, any>;
                updateKeyNames: {[key: string]: any};
                update: boolean;
                ontology_version?: string;
            };

            type PropertyT = {
                value: string;
                target: string;
                property_type: string;
                restriction_type: string;
                cardinality_quantity: string;
            };

            // map for accessing by class name
            const classListMap = new Map();
            // map for accessing by class ID
            const classIDMap = new Map();

            // map for accessing by relationship name
            const relationshipMap = new Map();
            // map for accessing by relationship ID
            const relationshipIDMap = new Map();

            const dataPropertyMap = new Map();

            for (const selectedClass of classes) {
                // skip empty objects (no rdf:about property)
                if (typeof selectedClass['rdf:about'] === 'undefined') {
                    continue
                }

                const classID = selectedClass['rdf:about'];
                let classLabel = selectedClass['rdfs:label']?.textNode ? selectedClass['rdfs:label']?.textNode : selectedClass['rdfs:label'];

                // if a rdfs:label was not provided or is an array, attempt to grab the name via the rdf:about
                // for ontology IRIs, the name may be after a # or the last /
                if (typeof classLabel === 'undefined' || Array.isArray(classLabel)) {
                    // try # first and then /
                    const aboutSplit = selectedClass['rdf:about'].split('#');
                    const aboutSplitSlash = selectedClass['rdf:about'].split('/');

                    if (aboutSplit.length > 1) {
                        classLabel = aboutSplit[1];
                    } else if (aboutSplitSlash.length > 1) {
                        classLabel = aboutSplitSlash[aboutSplitSlash.length - 1];
                    } else if (selectedClass['rdf:about'] != null && selectedClass['rdf:about'] !== '') {
                        classLabel = selectedClass['rdf:about'];
                    } else {
                        // if we still couldn't find a name this way, we can't provide a name for this class
                        // provide a useful error and return
                        resolve(Result.Failure(`Unable to find a name for the class with rdf:about "${selectedClass['rdf:about']}".
                            Please provide a name for classes via the rdfs:label annotation.`));
                    }
                }

                let parentID;
                const properties: {[key: string]: PropertyT} = {};
                if (selectedClass['rdfs:subClassOf'] && typeof selectedClass['rdfs:subClassOf'][0] === 'undefined') {
                    parentID = selectedClass['rdfs:subClassOf']['rdf:resource'];
                } else if(selectedClass['rdfs:subClassOf']) {
                    // if no other properties, subClassOf is not an array
                    parentID = selectedClass['rdfs:subClassOf'][0]['rdf:resource'];

                    // ensure that parentID actually points to a class, otherwise return an error that all children of owl:thing
                    // must have a parent specified
                    if (!parentID) {
                        return resolve(Result.Failure(`Class ${classID} does not specify a parent class. 
                            Please ensure all children of the root "owl:thing" class specify their parent.`));
                    }

                    // loop through properties
                    // if someValuesFrom -> rdf:resource !== "http://www*" then assume its a relationship, otherwise static property
                    let j;
                    // start at 1 since 0 is the parent ID property
                    for (j = 1; j < selectedClass['rdfs:subClassOf'].length; j++) {
                        const property = selectedClass['rdfs:subClassOf'][j]['owl:Restriction'];
                        // if the property is not found, continue
                        if (typeof(property) === 'undefined') {
                            continue;
                        }
                        const onProperty = property['owl:onProperty']['rdf:resource'];
                        // object or datatype referenced will either be someValuesFrom or qualifiedCardinality and onDataRange
                        let dataRange;
                        let propertyType;
                        let restrictionType = 'some';
                        let target = 'none';
                        let cardinalityQuantity = 'none';

                        if (typeof property['owl:someValuesFrom'] === 'undefined') {
                            restrictionType = property['owl:qualifiedCardinality']
                                ? 'exact'
                                : property['owl:maxQualifiedCardinality']
                                    ? 'max'
                                    : property['owl:minQualifiedCardinality']
                                        ? 'min'
                                        : 'unknown restriction type';
                            cardinalityQuantity = property['owl:qualifiedCardinality']
                                ? property['owl:qualifiedCardinality'].textNode
                                : property['owl:maxQualifiedCardinality']
                                    ? property['owl:maxQualifiedCardinality'].textNode
                                    : property['owl:minQualifiedCardinality']
                                        ? property['owl:minQualifiedCardinality'].textNode
                                        : 'unknown cardinality value';
                            // Primitive type and class cardinality
                            dataRange = property['owl:onDataRange']
                                ? property['owl:onDataRange']['rdf:resource'].split('#')[1]
                                : property['owl:onClass']
                                    ? property['owl:onClass']['rdf:resource']
                                    : 'unknown data range';

                            target = dataRange; // This contains the class or datatype with a cardinality
                            target = this.ValidateTarget(target);

                            // Determine if primitive or relationship property by looking for :
                            // This will indicate that the target is another class (e.g. ontologyName:0001)
                            const regex = new RegExp('[:-]');
                            if (regex.test(target)) {
                                // The target is an identifier for another class
                                propertyType = 'relationship';
                            } else {
                                propertyType = 'primitive';
                            }
                        } else {
                            target = property['owl:someValuesFrom']['rdf:resource'];
                            if (/http:\/\/www/.exec(target)) {
                                propertyType = 'primitive';
                                target = target.split('#')[1];
                                target = this.ValidateTarget(target);
                            } else {
                                propertyType = 'relationship';
                            }
                        }

                        const propertyObj = {
                            value: onProperty,
                            target,
                            property_type: propertyType,
                            restriction_type: restrictionType,
                            cardinality_quantity: cardinalityQuantity,
                        };
                        const propKey = propertyObj.value + propertyObj.target;
                        properties[propKey] = propertyObj;
                    }
                }

                let classDescription = '';
                if (typeof selectedClass['obo:IAO_0000115'] !== 'undefined') {
                    classDescription = selectedClass['obo:IAO_0000115'].textNode ? selectedClass['obo:IAO_0000115'].textNode : selectedClass['obo:IAO_0000115'];
                }

                // alternative description elements (in order): rdfs:isDefinedBy, skos:definition, rdfs:comment
                if (classDescription === '' && typeof selectedClass['rdfs:isDefinedBy'] !== 'undefined') {
                    classDescription = selectedClass['rdfs:isDefinedBy']?.textNode ?
                        selectedClass['rdfs:isDefinedBy']?.textNode : selectedClass['rdfs:isDefinedBy'];
                }

                if (classDescription === '' && typeof selectedClass['skos:definition'] !== 'undefined') {
                    classDescription = selectedClass['skos:definition']?.textNode ?
                        selectedClass['skos:definition']?.textNode : selectedClass['skos:definition'];
                }

                if (classDescription === '' && typeof selectedClass['rdfs:comment'] !== 'undefined') {
                    classDescription = selectedClass['rdfs:comment']?.textNode ?
                        selectedClass['rdfs:comment']?.textNode : selectedClass['rdfs:comment'];
                }

                // Search for and remove troublesome characters from class descriptions
                const regex = new RegExp('[’]');
                if (regex.test(classDescription)) {
                    classDescription = classDescription.replace('’', '');
                }

                const thisClass = {
                    id: classID,
                    name: classLabel,
                    parent_id: parentID,
                    description: classDescription,
                    properties,
                    keys: [],
                    updateKeys: new Map(),
                    updateKeyNames: [],
                };
                classListMap.set(classLabel, thisClass);
                classIDMap.set(classID, thisClass);
            }

            // Relationships
            if(objectProperties) {
                for (const relationship of objectProperties) {
                    // skip empty objects (no rdf:about property)
                    if (typeof relationship['rdf:about'] === 'undefined') {
                        continue
                    }

                    const relationshipID = relationship['rdf:about'];
                    let relationshipName = relationship['rdfs:label']?.textNode ? relationship['rdfs:label'].textNode : relationship['rdfs:label'];

                    // if a rdfs:label was not provided, attempt to grab the name via the rdf:about
                    if (typeof relationshipName === 'undefined') {
                        const aboutSplit = relationship['rdf:about'].split('#')
                        const aboutSplitSlash = relationship['rdf:about'].split('/');

                        if (aboutSplit.length > 1) {
                            relationshipName = aboutSplit[1]
                        } else if (aboutSplitSlash.length > 1) {
                            relationshipName = aboutSplit[aboutSplitSlash.length - 1];
                        } else if (relationship['rdf:about'] != null && relationship['rdf:about'] !== '') {
                            relationshipName = relationship['rdf:about'];
                        } else {
                            // if we still couldn't find a name this way, we can't provide a name for this relationship
                            // provide a useful error and return
                            resolve(Result.Failure(`Unable to find a name for the relationship with rdf:about "${relationship['rdf:about']}".
                                Please provide a name via the rdfs:label annotation.`));
                        }
                    }

                    let relationshipDescription = '';
                    if (typeof relationship['obo:IAO_0000115'] !== 'undefined') {
                        relationshipDescription = relationship['obo:IAO_0000115']?.textNode ?
                            relationship['obo:IAO_0000115']?.textNode : relationship['obo:IAO_0000115'];
                    }

                    // alternative description elements: rdfs:isDefinedBy, rdfs:comment
                    if (relationshipDescription === '' && typeof relationship['rdfs:isDefinedBy'] !== 'undefined') {
                        relationshipDescription = relationship['rdfs:isDefinedBy']?.textNode ?
                            relationship['rdfs:isDefinedBy']?.textNode : relationship['rdfs:isDefinedBy'];
                    }

                    if (relationshipDescription === '' && typeof relationship['rdfs:comment'] !== 'undefined') {
                        relationshipDescription = relationship['rdfs:comment']?.textNode ?
                            relationship['rdfs:comment']?.textNode : relationship['rdfs:comment'];
                    }

                    relationshipMap.set(relationshipName, {
                        id: relationshipID,
                        name: relationshipName,
                        description: relationshipDescription,
                    });
                    relationshipIDMap.set(relationshipID, {
                        id: relationshipID,
                        name: relationshipName,
                        description: relationshipDescription,
                    });
                }
            }

            // Add inherits relationship to relationship map
            relationshipMap.set('inherits', {
                name: 'inherits',
                description: 'Identifies the parent of the entity.',
            });

            // Datatype Properties
            for (const dataProperty of datatypeProperties) {
                // skip empty objects (no rdf:about property)
                if (typeof dataProperty['rdf:about'] === 'undefined') {
                    continue
                }

                const dpID = dataProperty['rdf:about'];
                let dpName = dataProperty['rdfs:label']?.textNode ? dataProperty['rdfs:label']?.textNode : dataProperty['rdfs:label'];

                // if a rdfs:label was not provided, attempt to grab the name via the rdf:about
                if (typeof dpName === 'undefined') {
                    const aboutSplit = dataProperty['rdf:about'].split('#');
                    const aboutSplitSlash = dataProperty['rdf:about'].split('/');

                    if (aboutSplit.length > 1) {
                        dpName = aboutSplit[1]
                    } else if (aboutSplitSlash.length > 1) {
                        dpName = aboutSplit[aboutSplitSlash.length - 1];
                    } else if (dataProperty['rdf:about'] != null && dataProperty['rdf:about'] !== '') {
                        dpName = dataProperty['rdf:about'];
                    } else {
                        // if we still couldn't find a name this way, we can't provide a name for this data property
                        // provide a useful error and return
                        resolve(Result.Failure(`Unable to find a name for the data property with rdf:about "${dataProperty['rdf:about']}".
                                Please provide a name via the rdfs:label annotation.`));
                    }
                }

                let dpDescription = '';
                if (typeof dataProperty['obo:IAO_0000115'] !== 'undefined') {
                    dpDescription = dataProperty['obo:IAO_0000115']?.textNode ? dataProperty['obo:IAO_0000115']?.textNode : dataProperty['obo:IAO_0000115'];
                }

                // alternative description elements: rdfs:isDefinedBy, rdfs:comment
                if (dpDescription === '' && typeof dataProperty['rdfs:isDefinedBy'] !== 'undefined') {
                    dpDescription = dataProperty['rdfs:isDefinedBy']?.textNode ?
                        dataProperty['rdfs:isDefinedBy']?.textNode : dataProperty['rdfs:isDefinedBy'];
                }

                if (dpDescription === '' && typeof dataProperty['rdfs:comment'] !== 'undefined') {
                    dpDescription = dataProperty['rdfs:comment']?.textNode ?
                        dataProperty['rdfs:comment']?.textNode : dataProperty['rdfs:comment'];
                }

                let dpEnumRange = null;
                if (typeof dataProperty['rdfs:range'] !== 'undefined') {
                    dpEnumRange = dataProperty['rdfs:range']['rdfs:Datatype'] ? dataProperty['rdfs:range']['rdfs:Datatype'] : null;

                    if (dpEnumRange !== null) {
                        // Add the first enum value
                        let currentOption = dpEnumRange['owl:oneOf']['rdf:Description'];
                        const options = [currentOption['rdf:first']?.textNode ? currentOption['rdf:first']?.textNode : currentOption['rdf:first']];
                        // Loop through the remaining enum values
                        while (typeof currentOption['rdf:rest']['rdf:Description'] !== 'undefined') {
                            currentOption = currentOption['rdf:rest']['rdf:Description'];
                            options.push(currentOption['rdf:first']?.textNode ? currentOption['rdf:first']?.textNode : currentOption['rdf:first']);
                        }
                        dpEnumRange = options;
                    }
                }
                dataPropertyMap.set(dpID, {
                    name: dpName,
                    description: dpDescription,
                    dp_enum: dpEnumRange,
                });
            }

            let ontologyDescription = input.description || '';
            // grab the ontology description if the provided description matches
            // an attribute of the ontology head
            if (ontologyHead[input.description]) {
                ontologyDescription = ontologyHead[input.description].textNode ? ontologyHead[input.description].textNode : input.description;
            }

            // grab the default ontology description if available and none provided
            if (ontologyHead['obo:IAO_0000115'] && (ontologyDescription === 'null' || ontologyDescription === '')) {
                ontologyDescription = ontologyHead['obo:IAO_0000115'].textNode ? ontologyHead['obo:IAO_0000115'].textNode : ontologyHead['obo:IAO_0000115'];
            }

            // try dc:description
            if (ontologyHead['dc:description'] && (ontologyDescription === 'null' || ontologyDescription === '')) {
                ontologyDescription = ontologyHead['dc:description'].textNode ? ontologyHead['dc:description'].textNode : ontologyHead['dc:description'];
            }

            // try rdfs:comment if it still hasn't been found
            if (ontologyHead['rdfs:comment'] && (ontologyDescription === 'null' || ontologyDescription === '')) {
                ontologyDescription = ontologyHead['rdfs:comment'].textNode ? ontologyHead['rdfs:comment'].textNode : ontologyHead['rdfs:comment'];
            }

            if (input.dryrun) {
                let explainString = '<b>Ontology Extractor - Explain Plan</b><br/>';
                explainString += 'Container name: ' + name + '<br/>';
                explainString += 'Container description: ' + ontologyDescription + '<br/>';
                explainString += '# of classes/types: ' + classListMap.size + '<br/>';
                explainString += '# of data properties: ' + dataPropertyMap.size + '<br/>';
                explainString += '# of relationships: ' + relationshipMap.size + '<br/>';
                resolve(Result.Success(explainString));
            } else {
                const allRelationshipPairNames: string[] = [];

                // prepare inherits relationship pairs
                classListMap.forEach((thisClass: MetatypeExtendT) => {
                    // don't add parent relationship for root entity
                    if (thisClass.parent_id && !/owl#Thing/.exec(thisClass.parent_id)) {
                        allRelationshipPairNames.push(thisClass.name + ' : child of : ' + classIDMap.get(thisClass.parent_id).name);

                        // add inherited properties and relationships (flatten ontology)
                        let parent = classIDMap.get(thisClass.parent_id);
                        // loop until root class (below owl#Thing) is reached
                        while (typeof parent.parent_id !== 'undefined' && !parent.parent_id.match(/owl#Thing/)) {
                            thisClass.properties = {
                                ...thisClass.properties,
                                ...parent.properties,
                            };
                            parent = classIDMap.get(parent.parent_id);
                        }
                        // add root class properties
                        thisClass.properties = {
                            ...thisClass.properties,
                            ...parent.properties,
                        };
                    }

                    // prepare properties/keys and remaining relationship pairs
                    // for now we just need the names for matching later
                    for (const propertyName in thisClass.properties) {
                        const property = thisClass.properties[propertyName];

                        if (property.property_type === 'primitive') {
                            const dataProp = dataPropertyMap.get(property.value);
                            if (dataProp) {
                            thisClass.keys.push(dataProp.name);
                            }
                        } else if (property.property_type === 'relationship') {
                            // use relationshipIDMap for accessing relationships by ID
                            const relationship = relationshipIDMap.get(property.value);
                            const relationshipName = thisClass.name + ' : ' + relationship.name + ' : ' + classIDMap.get(property.target).name;

                            allRelationshipPairNames.push(relationshipName);
                        }
                    }
                });



                // only pull and map the old data if we're updating an ontology in place, in a container where versioning
                // isn't enabled
                if (input.update && !input.container.config!.ontology_versioning_enabled) {
                    let oldMetatypeRelationships: MetatypeRelationship[] = [];
                    let oldMetatypes: Metatype[] = [];
                    let oldMetatypeRelationshipPairs: MetatypeRelationshipPair[] = [];

                    // retrieve existing container, relationships, metatypes, and relationship pairs
                    oldMetatypeRelationships = (await metatypeRelationshipRepo.where().containerID('eq', input.container.id!).list(false)).value;

                    // we load from the materialized view here because of the possible large amount of keys - however we need to refresh the view
                    // so we don't have stale data
                    await MetatypeKeyMapper.Instance.RefreshView();
                    oldMetatypes = (await metatypeRepo.where().containerID('eq', input.container.id!).list(false)).value;

                    oldMetatypeRelationshipPairs = (await metatypeRelationshipPairRepo.where().containerID('eq', input.container.id!).list()).value;

                    // loop through above, checking if there is anything in old that has been removed
                    // if anything has been removed, check for associated nodes/edges
                    // if associated data exists, raise error. Otherwise remove

                    for (const metatype of oldMetatypes) {
                        // metatype has been removed
                        if (!classListMap.has(metatype.name)) {
                            const nodes = (await nodeRepo.where().metatypeID('eq', metatype.id!).list(false, {limit: 10})).value;

                            if (nodes.length > 0) {
                                resolve(
                                    Result.Failure(`Attempting to remove metatype ${metatype.name}.
                  This metatype has associated data, please delete the data before container update.`),
                                );
                            } else {
                                // no associated data, remove metatype
                                Logger.info(`Removing metatype ${metatype.name}`);
                                const removal = await metatypeRepo.delete(metatype);
                                if (removal.error) {
                                    return resolve(Result.Failure(`Unable to delete metatype ${metatype.name}`));
                                }
                            }
                        } else {
                            // mark metatype for update and add existing IDs
                            const thisMetatype = classListMap.get(metatype.name);
                            thisMetatype.update = true;
                            thisMetatype.container_id = input.container.id!;
                            thisMetatype.ontology_version = metatype.ontology_version;
                            thisMetatype.db_id = metatype.id;
                            classIDMap.set(thisMetatype.id, thisMetatype);

                            // check metatypeKeys for metatypes to be updated
                            const newMetatypeKeys = classListMap.get(metatype.name).keys;
                            const oldMetatypeKeys = (await MetatypeKeyMapper.Instance.ListFromViewForMetatype(metatype.id!)).value;

                            for (const key of oldMetatypeKeys) {
                                if (!newMetatypeKeys.includes(key.name)) {
                                    const nodes = (await nodeRepo.where().metatypeID('eq', metatype.id!).list(false, {limit: 10})).value;

                                    if (nodes.length > 0) {
                                        await this.rollbackVersion(
                                            input.container.id!,
                                            input.ontologyVersionID!,
                                            input.ontology_versioning_enabled,
                                            input.update,
                                            `Attempting to remove metatype ${metatype.name} key ${key.name}.
                      This metatype has associated data, please delete the data before container update.` )

                                        resolve(
                                            Result.Failure(`Attempting to remove metatype ${metatype.name} key ${key.name}.
                      This metatype has associated data, please delete the data before container update.`),
                                        );
                                    } else {
                                        // no associated data, remove key
                                        Logger.info(`Removing metatype key ${key.name}`);
                                        const removal = await metatypeKeyRepo.delete(key);
                                        if (removal.error) {
                                            await this.rollbackVersion(
                                                input.container.id!,
                                                input.ontologyVersionID!,
                                                input.ontology_versioning_enabled,
                                                input.update,
                                                `Unable to delete metatype key ${key.name}` )
                                            return resolve(Result.Failure(`Unable to delete metatype key ${key.name}`));
                                        }
                                    }
                                } else {
                                    // update key
                                    const thisMetatype = classListMap.get(metatype.name);
                                    thisMetatype.updateKeys.set(key.name, key);
                                    thisMetatype.updateKeyNames.push(key.name);
                                }
                            }
                        }
                    }

                    // Ontology must first be flattened
                    for (const relationshipPair of oldMetatypeRelationshipPairs) {
                        if (!allRelationshipPairNames.includes(relationshipPair.name)) {
                            const edges = (await edgeRepo.where().relationshipPairID('eq', relationshipPair.id!).list(true, {limit: 10})).value;
                            if (edges.length > 0) {
                                resolve(
                                    Result.Failure(`Attempting to remove metatype relationship pair ${relationshipPair.name}.
                  This relationship pair has associated data, please delete the data before container update.`),
                                );
                            } else {
                                // no associated data, remove relationship pair
                                Logger.info(`Removing relationship pair ${relationshipPair.name}`);
                                const removal = await metatypeRelationshipPairRepo.delete(relationshipPair);
                                if (removal.error) {
                                    return resolve(Result.Failure(`Unable to delete metatype relationship pair ${relationshipPair.name}`));
                                }
                            }
                        } else {
                            // update key
                            // use regex to parse out metatype name
                            const regex = /\S*/;
                            const metatypeName = regex.exec(relationshipPair.name)![0];

                            const thisMetatype = classListMap.get(metatypeName);
                            thisMetatype.updateKeys.set(relationshipPair.name, relationshipPair);
                            thisMetatype.updateKeyNames.push(relationshipPair.name);
                        }
                    }

                    for (const relationship of oldMetatypeRelationships) {
                        if (!relationshipMap.has(relationship.name)) {
                            // ontological assumption: if metatypes and metatype relationship pairs are examined first,
                            // we don't need to dig into them again for metatype relationships
                            // any edges instantiated from relationship pairs that depend on the relationship would have already been found
                            Logger.info(`Removing relationship ${relationship.name}`);
                            const removal = await metatypeRelationshipRepo.delete(relationship);
                            if (removal.error) {
                                return resolve(Result.Failure(`Unable to delete relationship ${relationship.name}`));
                            }
                        } else {
                            const thisRelationship = relationshipMap.get(relationship.name);
                            thisRelationship.update = true;
                            thisRelationship.db_id = relationship.id;
                        }
                    }
                }

                const metatypeRelationships: MetatypeRelationship[] = [];

                relationshipMap.forEach((relationship) => {
                    const data = new MetatypeRelationship({
                        container_id: input.container.id!,
                        name: relationship.name,
                        description: relationship.description,
                        ontology_version: (input.ontologyVersionID) ? input.ontologyVersionID : relationship.ontology_version,
                    });

                    // if marked for update, assign relationship id
                    if (relationship.update) {
                        data.id = relationship.db_id;
                    }

                    // push to array. repository handles updates or creates
                    metatypeRelationships.push(data);
                });

                const relationshipPromise = await metatypeRelationshipRepo.bulkSave(input.user, metatypeRelationships, false);
                if (relationshipPromise.isError) {
                    resolve(Result.Pass(relationshipPromise))
                }

                // loop through relationships (with new IDs if created)
                metatypeRelationships.forEach((relationship) => {
                    if (relationship.id) {
                        const mapValue = relationshipMap.get(relationship.name);
                        mapValue.db_id = relationship.id;
                        relationshipMap.set(mapValue.name, mapValue);
                    }
                });

                const metatypes: Metatype[] = [];

                classListMap.forEach((thisClass: MetatypeExtendT) => {
                    const data = new Metatype({
                        container_id: input.container.id!,
                        name: thisClass.name,
                        description: thisClass.description,
                        ontology_version: (input.ontologyVersionID) ? input.ontologyVersionID : thisClass.ontology_version,
                    });

                    // if marked for update, assign metatype id
                    if (thisClass.update) {
                        data.id = thisClass.db_id;
                    }

                    // push to array. repository handles updates or creates
                    metatypes.push(data);
                });

                const metatypePromise = await metatypeRepo.bulkSave(input.user, metatypes, false);
                // check for an error and rollback if necessary
                if (metatypePromise.isError) {
                    resolve(Result.Pass(metatypePromise))
                }

                // loop through metatypes adding new database IDs
                metatypes.forEach((metatype) => {
                    if (metatype.id) {
                        const mapValue = classListMap.get(metatype.name);
                        mapValue.db_id = metatype.id;

                        classListMap.set(mapValue.name, mapValue);
                        classIDMap.set(mapValue.id, mapValue);
                    }
                });

                const propertyPromises: (() => Promise<Result<boolean>>)[] = [];

                // declare structures to hold metatype keys and relationship pairs for cache invalidation
                const metatypeKeys: MetatypeKey[] = []
                const relationshipPairs: MetatypeRelationshipPair[] = []

                // Add metatype keys (properties) and relationship pairs
                classListMap.forEach((thisClass: MetatypeExtendT) => {
                    const updateRelationships: MetatypeRelationshipPair[] = [];

                    // Add relationship to parent class
                    const relationship = relationshipMap.get('inherits');
                    // Don't add parent relationship for root entity
                    if (thisClass.parent_id && !/owl#Thing/.exec(thisClass.parent_id)) {
                        const relationshipName = thisClass.name + ' : child of : ' + classIDMap.get(thisClass.parent_id).name;

                        const data = new MetatypeRelationshipPair({
                            name: relationshipName,
                            description: relationship.description,
                            origin_metatype: thisClass.db_id!,
                            destination_metatype: classIDMap.get(thisClass.parent_id).db_id,
                            relationship: relationship.db_id,
                            relationship_type: 'many:one',
                            container_id: input.container.id!,
                            ontology_version: (input.ontologyVersionID) ? input.ontologyVersionID : thisClass.ontology_version
                        });

                        if (thisClass.updateKeyNames.includes(relationshipName)) {
                            const originalKeyData = thisClass.updateKeys.get(relationshipName);
                            data.id = originalKeyData.id;
                            updateRelationships.push(data);
                        } else {
                            propertyPromises.push(() => metatypeRelationshipPairRepo.bulkSave(input.user, [data], false));
                            relationshipPairs.push(data);
                        }
                    }

                    // Add primitive properties and other relationships
                    // placeholder for keys that will be sent to BatchUpdate()
                    const updateKeys: MetatypeKey[] = [];
                    let toSaveKeyBuffer: MetatypeKey[] = [];
                    const toSaveRelationshipBuffer: MetatypeRelationshipPair[] = [];

                    for (const propertyName in thisClass.properties) {
                        const property = thisClass.properties[propertyName];

                        if (property.property_type === 'primitive') {
                            const dataProp = dataPropertyMap.get(property.value);
                            let propertyOptions = [];

                            if (dataProp.dp_enum !== null) {
                                propertyOptions = dataProp.dp_enum;
                            }

                            // support min/exact 1 to make property required
                            let required = false;
                            const cardinalityQuantity = parseInt(property.cardinality_quantity, 10);

                            if (property.restriction_type === 'min' && cardinalityQuantity === 1) {
                                required = true;
                            } else if (property.restriction_type === 'exact' && cardinalityQuantity === 1) {
                                required = true;
                            }

                            // SUPPORT CARDINALITY IN FUTURE VERSION

                            // switch (property.restriction_type) {
                            //     case 'exact':
                            //         min = cardinalityQuantity;
                            //         max = cardinalityQuantity;
                            //         break;
                            //     case 'min':
                            //         min = cardinalityQuantity;
                            //         break;
                            //     case 'max':
                            //         max = cardinalityQuantity;
                            //         break;
                            // }

                            if(!dataProp?.name) {
                                resolve(Result.Failure('unable to load .owl file, data property missing label or name'))
                                return
                            }

                            const propName = dataProp.name.split(' ').join('_');
                            const data = new MetatypeKey({
                                metatype_id: thisClass.db_id,
                                container_id: input.container.id!,
                                name: dataProp.name,
                                required,
                                property_name: stringToValidPropertyName(propName),
                                description: dataProp.description,
                                data_type: property.target,
                                validation: { // OWL file does not supply regex validation information
                                    regex: '',
                                    min: 0,
                                    max: 0,
                                },
                                options: propertyOptions.length > 0 ? propertyOptions : undefined,
                                ontology_version: (input.ontologyVersionID) ? input.ontologyVersionID : property.ontology_version
                            });

                            if (thisClass.updateKeyNames.includes(dataProp.name)) {
                                const originalKeyData = thisClass.updateKeys.get(dataProp.name);
                                data.id = originalKeyData.id;
                                updateKeys.push(data);
                            } else {
                                toSaveKeyBuffer.push(data);
                                metatypeKeys.push(data);
                            }
                        } else if (property.property_type === 'relationship') {
                            const relationship = relationshipIDMap.get(property.value);
                            const relationshipID = relationshipMap.get(relationship.name).db_id;
                            const relationshipName = thisClass.name + ' : ' + relationship.name + ' : ' + classIDMap.get(property.target).name;

                            const data = new MetatypeRelationshipPair({
                                name: relationshipName,
                                description: relationship.description,
                                origin_metatype: thisClass.db_id!,
                                destination_metatype: classIDMap.get(property.target).db_id,
                                relationship: relationshipID,
                                relationship_type: 'many:many',
                                container_id: input.container.id!,
                                ontology_version: (input.ontologyVersionID) ? input.ontologyVersionID : relationship.ontology_version
                            });

                            if (thisClass.updateKeyNames.includes(relationshipName)) {
                                const originalKeyData = thisClass.updateKeys.get(relationshipName);
                                data.id = originalKeyData.id;
                                updateRelationships.push(data);
                            } else {
                                toSaveRelationshipBuffer.push(data)
                                relationshipPairs.push(data);
                            }
                        }

                        if (toSaveKeyBuffer.length > 1000) {
                            // clone the buffer so we can clear
                            const buffer = toSaveKeyBuffer.slice(0);
                            toSaveKeyBuffer = []

                            propertyPromises.push(() => metatypeKeyRepo.importBulkSave(input.user, buffer))
                        }

                        if (toSaveRelationshipBuffer.length > 1000) {
                            // clone the buffer so we can clear
                            const buffer = toSaveRelationshipBuffer.slice(0);
                            toSaveKeyBuffer = []

                            propertyPromises.push(() => metatypeRelationshipPairRepo.bulkSave(input.user, buffer, false))
                        }

                    }

                    propertyPromises.push(() => metatypeKeyRepo.importBulkSave(input.user, toSaveKeyBuffer));
                    propertyPromises.push(() => metatypeRelationshipPairRepo.bulkSave(input.user, toSaveRelationshipBuffer, false));

                    if (updateKeys.length > 0) {
                        propertyPromises.push(() => metatypeKeyRepo.importBulkSave(input.user, updateKeys));
                        metatypeKeys.concat(updateKeys);
                    }

                    if (updateRelationships.length > 0) {
                        propertyPromises.push(() => metatypeRelationshipPairRepo.bulkSave(input.user, updateRelationships, false));
                        relationshipPairs.concat(updateRelationships);
                    }
                });
                const propertyResults: Result<boolean>[] = await pAll(propertyPromises, {concurrency: 2});

                // refresh metatype keys view just once now that all keys have been saved
                metatypeKeyRepo.RefreshView().catch((e) => {
                    Logger.error(`error refreshing metatype keys view ${e}`);
                });

                // Invalidate cache for this container as a final step
                for (const metatype of metatypes) {
                    // this will also invalidate cached keys for these metatypes
                    if (metatype.id) void metatypeRepo.deleteCached(metatype.id, input.container.id);
                }
                for (const metatypeRelationship of metatypeRelationships) {
                    if (metatypeRelationship.id) void metatypeRelationshipRepo.deleteCached(metatypeRelationship.id, input.container.id);
                }

                for (const relationshipPair of relationshipPairs) {
                    if (relationshipPair.id) void metatypeRelationshipPairRepo.deleteCached(relationshipPair.id, input.container.id);
                }

                for (const propResult of propertyResults) {
                    if (propResult.isError) {
                        resolve(Result.Pass(propResult))
                    }
                }

                if(!input.ontology_versioning_enabled) {
                    await ontologyRepo.setStatus(input.ontologyVersionID!, 'published')
                } else {
                    await ontologyRepo.setStatus(input.ontologyVersionID!, 'ready')
                }

                await containerRepo.createAlert(new ContainerAlert({
                    containerID: input.container.id!,
                    type: 'info' ,
                    message: `Container ontology successfully loaded from OWL file or URL`
                }))

                resolve(Result.Success(input.container.id!));
            }
        }).catch<Result<string>>((e: string) => {
            return Promise.resolve(Result.DebugFailure(e));
        });
    }

    async rollbackVersion(containerID: string, ontologyVersionID: string, versioningEnabled: boolean, isUpdate?: boolean, errorMessage?: string): Promise<void> {
        if(!versioningEnabled) {
            await ontologyRepo.setStatus(ontologyVersionID, 'published')
        } else {
            await ontologyRepo.setStatus(ontologyVersionID, 'error', errorMessage)
        }

        await containerRepo.createAlert(new ContainerAlert({
            containerID,
            type: 'error',
            message: `Unable to import ontology using OWL file or URL. Contact administrator for more information ${JSON.stringify(errorMessage)} `
        }))

        return Promise.resolve()
    }
}
