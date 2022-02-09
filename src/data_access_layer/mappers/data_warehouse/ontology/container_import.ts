/* eslint-disable @typescript-eslint/restrict-plus-operands */
import axios, {AxiosRequestConfig} from 'axios';
import MetatypeKeyMapper from './metatype_key_mapper';
import Result from '../../../../common_classes/result';
import Logger from '../../../../services/logger';
import ContainerRepository from '../../../repositories/data_warehouse/ontology/container_respository';
import Container, { ContainerConfig } from "../../../../domain_objects/data_warehouse/ontology/container";
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
const convert = require('xml-js');

const containerRepo = new ContainerRepository();
const metatypeRelationshipRepo = new MetatypeRelationshipRepository();
const metatypeRepo = new MetatypeRepository();
const metatypeRelationshipPairRepo = new MetatypeRelationshipPairRepository();
const metatypeKeyRepo = new MetatypeKeyRepository();
const nodeRepo = new NodeRepository();
const edgeRepo = new EdgeRepository();

// vestigial type for ease of use
export type ContainerImportT = {
    name: string;
    description?: string | undefined;
    path?: string | undefined;
    data_versioning_enabled: boolean
    ontology_versioning_enabled: boolean
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

    public async ImportOntology(
        user: User,
        input: ContainerImportT,
        file: Buffer,
        dryrun: boolean,
        update: boolean,
        containerID: string,
    ): Promise<Result<string>> {
        if (file.length === 0) {
            // configure and make an http request to retrieve the ontology file then parse ontology
            const axiosConfig: AxiosRequestConfig = {
                headers: {
                    'Content-Type': 'application/xml;charset=UTF-8',
                },
                responseType: 'text',
            };
            const resp = await axios.get(input.path!, axiosConfig);
            return new Promise<Result<string>>((resolve, reject) => {
                if (resp.status < 200 || resp.status > 299) reject(resp.status);

                if (resp.data.isError) reject(resp.data.value);

                const jsonData = convert.xml2json(resp.data, {
                    compact: true,
                    ignoreComment: true,
                    spaces: 4,
                });

                this.parseOntology(
                    user,
                    JSON.parse(jsonData),
                    input.name,
                    input.description || '',
                    input.data_versioning_enabled,
                    input.ontology_versioning_enabled,
                    dryrun, update, containerID)
                    .then((result) => {
                        resolve(result);
                    })
                    .catch((e) => {
                        reject(e);
                    });
            }).catch((e) => {
                return Promise.reject(Result.Failure(e));
            });
        } else {
            // ontology file has been supplied, convert to json and parse ontology
            const jsonData = convert.xml2json(file.toString('utf8'), {
                compact: true,
                ignoreComment: true,
                spaces: 4,
            });
            return new Promise<Result<string>>((resolve) => {
                resolve(this.parseOntology(
                    user,
                    JSON.parse(jsonData),
                    input.name,
                    input.description || '',
                    input.data_versioning_enabled,
                    input.ontology_versioning_enabled,
                    dryrun, update, containerID));
            }).catch((e) => {
                return Promise.reject(Result.Failure(e));
            });
        }
    }

    private async parseOntology(
        user: User | any,
        json: any,
        name: string,
        description: string,
        data_versioning_enabled: boolean,
        ontology_versioning_enabled: boolean,
        dryrun: boolean,
        update: boolean,
        containerID: string,
    ): Promise<Result<string>> {
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        return new Promise<Result<string>>(async (resolve) => {
            json = json['rdf:RDF'];
            const ontologyHead = json['owl:Ontology'];
            const objectProperties = json['owl:ObjectProperty'];
            const datatypeProperties = json['owl:DatatypeProperty'];
            const classes = json['owl:Class'];

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
                const classID = selectedClass._attributes['rdf:about'];
                let classLabel = selectedClass['rdfs:label']._text;
                // if language has not been set, rdfs:label has a single string property rather than an object
                if (typeof classLabel === 'undefined') {
                    classLabel = selectedClass['rdfs:label'];
                }

                let parentID;
                const properties: {[key: string]: PropertyT} = {};
                if (typeof selectedClass['rdfs:subClassOf'][0] === 'undefined') {
                    parentID = selectedClass['rdfs:subClassOf']._attributes['rdf:resource'];
                } else {
                    // if no other properties, subClassOf is not an array
                    parentID = selectedClass['rdfs:subClassOf'][0]._attributes['rdf:resource'];
                    // loop through properties
                    // if someValuesFrom -> rdf:resource !== "http://www*" then assume its a relationship, otherwise static property
                    let j;
                    // start at 1 since 0 is the parent ID property
                    for (j = 1; j < selectedClass['rdfs:subClassOf'].length; j++) {
                        const property = selectedClass['rdfs:subClassOf'][j]['owl:Restriction'];
                        const onProperty = property['owl:onProperty']._attributes['rdf:resource'];
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
                                ? property['owl:qualifiedCardinality']._text
                                : property['owl:maxQualifiedCardinality']
                                    ? property['owl:maxQualifiedCardinality']._text
                                    : property['owl:minQualifiedCardinality']
                                        ? property['owl:minQualifiedCardinality']._text
                                        : 'unknown cardinality value';
                            // Primitive type and class cardinality
                            dataRange = property['owl:onDataRange']
                                ? property['owl:onDataRange']._attributes['rdf:resource'].split('#')[1]
                                : property['owl:onClass']
                                    ? property['owl:onClass']._attributes['rdf:resource']
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
                            target = property['owl:someValuesFrom']._attributes['rdf:resource'];
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
                    classDescription = selectedClass['obo:IAO_0000115']._text ? selectedClass['obo:IAO_0000115']._text : selectedClass['obo:IAO_0000115'];
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
            for (const relationship of objectProperties) {
                const relationshipID = relationship._attributes['rdf:about'];
                const relationshipName = relationship['rdfs:label']._text ? relationship['rdfs:label']._text : relationship['rdfs:label'];
                let relationshipDescription = '';
                if (typeof relationship['obo:IAO_0000115'] !== 'undefined') {
                    relationshipDescription = relationship['obo:IAO_0000115']._text ? relationship['obo:IAO_0000115']._text : relationship['obo:IAO_0000115'];
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
            // Add inheritance relationship to relationship map
            relationshipMap.set('inheritance', {
                name: 'inheritance',
                description: 'Identifies the parent of the entity.',
            });

            // Datatype Properties
            for (const dataProperty of datatypeProperties) {
                const dpID = dataProperty._attributes['rdf:about'];
                const dpName = dataProperty['rdfs:label']._text ? dataProperty['rdfs:label']._text : dataProperty['rdfs:label'];
                let dpDescription = '';
                if (typeof dataProperty['obo:IAO_0000115'] !== 'undefined') {
                    dpDescription = dataProperty['obo:IAO_0000115']._text ? dataProperty['obo:IAO_0000115']._text : dataProperty['obo:IAO_0000115'];
                }
                let dpEnumRange = null;
                if (typeof dataProperty['rdfs:range'] !== 'undefined') {
                    dpEnumRange = dataProperty['rdfs:range']['rdfs:Datatype'] ? dataProperty['rdfs:range']['rdfs:Datatype'] : null;

                    if (dpEnumRange !== null) {
                        // Add the first enum value
                        let currentOption = dpEnumRange['owl:oneOf']['rdf:Description'];
                        const options = [currentOption['rdf:first']._text];
                        // Loop through the remaining enum values
                        while (typeof currentOption['rdf:rest']['rdf:Description'] !== 'undefined') {
                            currentOption = currentOption['rdf:rest']['rdf:Description'];
                            options.push(currentOption['rdf:first']._text);
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

            let ontologyDescription = description || '';
            // grab the ontology description if the provided description matches
            // an attribute of the ontology head
            if (ontologyHead[description]) {
                ontologyDescription = ontologyHead[description]._text ? ontologyHead[description]._text : description;
            }

            // grab the default ontology description if available and none provided
            if (ontologyDescription === '' || (ontologyDescription === 'null' && ontologyHead['obo:IAO_0000115'])) {
                ontologyDescription = ontologyHead['obo:IAO_0000115']._text ? ontologyHead['obo:IAO_0000115']._text : description;
            }

            if (dryrun) {
                let explainString = '<b>Ontology Extractor - Explain Plan</b><br/>';
                explainString += 'Container name: ' + name + '<br/>';
                explainString += 'Container description: ' + ontologyDescription + '<br/>';
                explainString += '# of classes/types: ' + classListMap.size + '<br/>';
                explainString += '# of data properties: ' + dataPropertyMap.size + '<br/>';
                explainString += '# of relationships: ' + relationshipMap.size + '<br/>';
                resolve(Result.Success(explainString));
            } else {
                let container: Container;

                // If performing a create, need to create container and retrieve container ID
                if (!update) {
                    container = new Container({
                        name,
                        description: ontologyDescription,
                        config: new ContainerConfig({data_versioning_enabled, ontology_versioning_enabled})
                    });

                    const saved = await containerRepo.save(container, user);
                    if (saved.isError) return resolve(Result.SilentFailure(saved.error!.error));
                    containerID = container.id!;
                } else {
                    const containerResult = await containerRepo.findByID(containerID);
                    if (containerResult.isError) return resolve(Result.Failure(`Unable to retrieve container ${containerID}`));

                    container = containerResult.value;
                }

                const allRelationshipPairNames: string[] = [];

                // prepare inheritance relationship pairs
                classListMap.forEach((thisClass: MetatypeExtendT) => {
                    // don't add parent relationship for root entity
                    if (!/owl#Thing/.exec(thisClass.parent_id!)) {
                        allRelationshipPairNames.push(thisClass.name + ' : child of : ' + classIDMap.get(thisClass.parent_id).name);

                        // add inherited properties and relationships (flatten ontology)
                        let parent = classIDMap.get(thisClass.parent_id);
                        // loop until root class (below owl#Thing) is reached
                        while (!parent.parent_id.match(/owl#Thing/)) {
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

                            thisClass.keys.push(dataProp.name);
                        } else if (property.property_type === 'relationship') {
                            // use relationshipIDMap for accessing relationships by ID
                            const relationship = relationshipIDMap.get(property.value);
                            const relationshipName = thisClass.name + ' : ' + relationship.name + ' : ' + classIDMap.get(property.target).name;

                            allRelationshipPairNames.push(relationshipName);
                        }
                    }
                });

                if (update) {
                    let oldMetatypeRelationships: MetatypeRelationship[] = [];
                    let oldMetatypes: Metatype[] = [];
                    let oldMetatypeRelationshipPairs: MetatypeRelationshipPair[] = [];

                    // retrieve existing container, relationships, metatypes, and relationship pairs
                    oldMetatypeRelationships = (await metatypeRelationshipRepo.where().containerID('eq', containerID).list(false)).value;

                    oldMetatypes = (await metatypeRepo.where().containerID('eq', containerID).list(false)).value;

                    oldMetatypeRelationshipPairs = (await metatypeRelationshipPairRepo.where().containerID('eq', containerID).list()).value;

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
                                if (removal.error) return resolve(Result.Failure(`Unable to delete metatype ${metatype.name}`));
                            }
                        } else {
                            // mark metatype for update and add existing IDs
                            const thisMetatype = classListMap.get(metatype.name);
                            thisMetatype.update = true;
                            thisMetatype.container_id = containerID;
                            thisMetatype.db_id = metatype.id;
                            classIDMap.set(thisMetatype.id, thisMetatype);

                            // check metatypeKeys for metatypes to be updated
                            const newMetatypeKeys = classListMap.get(metatype.name).keys;
                            const oldMetatypeKeys = (await MetatypeKeyMapper.Instance.ListForMetatype(metatype.id!)).value;

                            for (const key of oldMetatypeKeys) {
                                if (!newMetatypeKeys.includes(key.name)) {
                                    const nodes = (await nodeRepo.where().metatypeID('eq', metatype.id!).list(false, {limit: 10})).value;

                                    if (nodes.length > 0) {
                                        resolve(
                                            Result.Failure(`Attempting to remove metatype ${metatype.name} key ${key.name}.
                      This metatype has associated data, please delete the data before container update.`),
                                        );
                                    } else {
                                        // no associated data, remove key
                                        Logger.info(`Removing metatype key ${key.name}`);
                                        const removal = await metatypeKeyRepo.delete(key);
                                        if (removal.error) return resolve(Result.Failure(`Unable to delete metatype key ${key.name}`));
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
                                if (removal.error) return resolve(Result.Failure(`Unable to delete metatype relationship pair ${relationshipPair.name}`));
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
                            if (removal.error) return resolve(Result.Failure(`Unable to delete relationship ${relationship.name}`));
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
                        container_id: containerID,
                        name: relationship.name,
                        description: relationship.description,
                    });

                    // if marked for update, assign relationship id
                    if (relationship.update) {
                        data.id = relationship.db_id;
                    }

                    // push to array. repository handles updates or creates
                    metatypeRelationships.push(data);
                });

                const relationshipPromise = await metatypeRelationshipRepo.bulkSave(user, metatypeRelationships);
                // check for an error and rollback if necessary
                if (relationshipPromise.isError) {
                    const rollback = await this.rollbackOntology(container)
                        .then((result) => {
                            return result + ' ' + relationshipPromise.error?.error;
                        })
                        .catch((err: string) => {
                            return err + ' ' + relationshipPromise.error?.error;
                        });
                    resolve(Result.SilentFailure(rollback));
                    return;
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
                        container_id: containerID,
                        name: thisClass.name,
                        description: thisClass.description,
                    });

                    // if marked for update, assign metatype id
                    if (thisClass.update) {
                        data.id = thisClass.db_id;
                    }

                    // push to array. repository handles updates or creates
                    metatypes.push(data);
                });

                const metatypePromise = await metatypeRepo.bulkSave(user, metatypes);
                // check for an error and rollback if necessary
                if (metatypePromise.isError) {
                    const rollback = await this.rollbackOntology(container)
                        .then((result) => {
                            return result + ' ' + metatypePromise.error?.error;
                        })
                        .catch((err: string) => {
                            return err + ' ' + metatypePromise.error?.error;
                        });
                    resolve(Result.SilentFailure(rollback));
                    return;
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

                const propertyPromises: Promise<Result<boolean>>[] = [];
                // Add metatype keys (properties) and relationship pairs
                classListMap.forEach((thisClass: MetatypeExtendT) => {
                    const updateRelationships: MetatypeRelationshipPair[] = [];

                    // Add relationship to parent class
                    const relationship = relationshipMap.get('inheritance');
                    // Don't add parent relationship for root entity
                    if (!/owl#Thing/.exec(thisClass.parent_id!)) {
                        const relationshipName = thisClass.name + ' : child of : ' + classIDMap.get(thisClass.parent_id).name;

                        const data = new MetatypeRelationshipPair({
                            name: relationshipName,
                            description: relationship.description,
                            origin_metatype: thisClass.db_id!,
                            destination_metatype: classIDMap.get(thisClass.parent_id).db_id,
                            relationship: relationship.db_id,
                            relationship_type: 'many:one',
                            container_id: containerID,
                        });

                        if (thisClass.updateKeyNames.includes(relationshipName)) {
                            const originalKeyData = thisClass.updateKeys.get(relationshipName);
                            data.id = originalKeyData.id;
                            updateRelationships.push(data);
                        } else {
                            propertyPromises.push(metatypeRelationshipPairRepo.bulkSave(user, [data]));
                        }
                    }

                    // Add primitive properties and other relationships
                    // placeholder for keys that will be sent to BatchUpdate()
                    const updateKeys: MetatypeKey[] = [];

                    for (const propertyName in thisClass.properties) {
                        const property = thisClass.properties[propertyName];

                        if (property.property_type === 'primitive') {
                            const dataProp = dataPropertyMap.get(property.value);
                            let propertyOptions = [];

                            if (dataProp.dp_enum !== null) {
                                propertyOptions = dataProp.dp_enum;
                            }

                            // Leave 0 for unbounded and 'some' restriction type
                            let min = 0;
                            let max = 0;
                            const cardinalityQuantity = parseInt(property.cardinality_quantity, 10);

                            switch (property.restriction_type) {
                                case 'exact':
                                    min = cardinalityQuantity;
                                    max = cardinalityQuantity;
                                    break;
                                case 'min':
                                    min = cardinalityQuantity;
                                    break;
                                case 'max':
                                    max = cardinalityQuantity;
                                    break;
                            }

                            const propName = dataProp.name.split(' ').join('_');
                            const data = new MetatypeKey({
                                metatype_id: thisClass.db_id,
                                container_id: containerID,
                                name: dataProp.name,
                                required: false,
                                property_name: stringToValidPropertyName(propName),
                                description: dataProp.description,
                                data_type: property.target,
                                validation: {
                                    regex: '',
                                    min,
                                    max,
                                },
                                options: propertyOptions.length > 0 ? propertyOptions : undefined,
                            });

                            if (thisClass.updateKeyNames.includes(dataProp.name)) {
                                const originalKeyData = thisClass.updateKeys.get(dataProp.name);
                                data.id = originalKeyData.id;
                                updateKeys.push(data);
                            } else {
                                propertyPromises.push(metatypeKeyRepo.bulkSave(user, [data]));
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
                                container_id: containerID,
                            });

                            if (thisClass.updateKeyNames.includes(relationshipName)) {
                                const originalKeyData = thisClass.updateKeys.get(relationshipName);
                                data.id = originalKeyData.id;
                                updateRelationships.push(data);
                            } else {
                                propertyPromises.push(metatypeRelationshipPairRepo.bulkSave(user, [data]));
                            }
                        }
                    }

                    if (updateKeys.length > 0) {
                        propertyPromises.push(metatypeKeyRepo.bulkSave(user, updateKeys));
                    }

                    if (updateRelationships.length > 0) {
                        propertyPromises.push(metatypeRelationshipPairRepo.bulkSave(user, updateRelationships));
                    }
                });
                const propertyResults: Result<boolean>[] = await Promise.all(propertyPromises);
                for (const propResult of propertyResults) {
                    if (propResult.isError) {
                        const rollback = await this.rollbackOntology(container)
                            .then((result) => {
                                return result + ' ' + propResult.error?.error;
                            })
                            .catch((err: string) => {
                                return err + ' ' + propResult.error?.error;
                            });
                        resolve(Result.SilentFailure(rollback));
                        return;
                    }
                }

                resolve(Result.Success(containerID));
            }
        }).catch<Result<string>>((e: string) => {
            return Promise.resolve(Result.SilentFailure(e));
        });
    }
}
