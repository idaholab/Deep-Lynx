import axios, { AxiosRequestConfig } from "axios";
import ContainerStorage from "../../data_storage/container_storage";
import { CreateContainer } from "../../api_handlers/container";
import MetatypeRelationshipStorage from "../../data_storage/metatype_relationship_storage"
import MetatypeStorage from "../../data_storage/metatype_storage"
import MetatypeRelationshipPairStorage from "../../data_storage/metatype_relationship_pair_storage"
import MetatypeKeyStorage from "../../data_storage/metatype_key_storage"
import MetatypeRelationshipKeyStorage from "../../data_storage/metatype_relationship_key_storage"
import { UserT } from "../../types/user_management/userT";
import Result from "../../result";
import { ContainerImportT } from "../../types/import/containerImportT"
import { MetatypeT } from "../../types/metatypeT";
import { MetatypeRelationshipPairT } from "../../types/metatype_relationship_pairT";
import { MetatypeKeyT, MetatypeKeysT } from "../../types/metatype_keyT";
import { MetatypeRelationshipT } from "../../types/metatype_relationshipT";
import NodeStorage from "../../data_storage/graph/node_storage"
import EdgeStorage from "../../data_storage/graph/edge_storage"
import Logger from "../../logger"
const convert = require('xml-js');

const containerStorage = ContainerStorage.Instance;
const metatypeRelationshipStorage = MetatypeRelationshipStorage.Instance;
const metatypeStorage = MetatypeStorage.Instance;
const metatypeRelationshipPairStorage = MetatypeRelationshipPairStorage.Instance;
const metatypeKeyStorage = MetatypeKeyStorage.Instance;
const metatypeRelationshipKeyStorage = MetatypeRelationshipKeyStorage.Instance;
const nodeStorage = NodeStorage.Instance;
const edgeStorage = EdgeStorage.Instance;

export default class ContainerImport {
  private static instance: ContainerImport;

  public static get Instance(): ContainerImport {
    if (!ContainerImport.instance) {
      ContainerImport.instance = new ContainerImport()
    }
    return ContainerImport.instance
  }

  private ValidateTarget(target: string): string {
    // Replace incompatible data_type properties (ID, IDREF, etc.)
    // Don't replace any IDs of other classes
    const regex = new RegExp('[1-9:-]');
    if (!['string', 'number', 'boolean', 'date', 'enumeration', 'file'].includes(target) &&
      !regex.test(target)) {
      switch (target) {
        case 'integer':
          target = 'number';
          break;
        case 'decimal':
          target = 'number';
          break;
        case 'double':
          target = 'number';
          break;
        case 'dateTimeStamp':
          target = 'date';
          break;
        case 'anyURI':
          target = 'file';
          break;
        default:
          target = 'string';
      }
    }
    return target;
  }

  private rollbackOntology(containerID: string) {
    return new Promise((resolve, reject) => {
      containerStorage.PermanentlyDelete(containerID)
        .then(_ => {
          resolve("Ontology rolled back successfully.")
        })
        .catch(_ => {
          reject("Unable to roll back ontology.")
        })
    })
  }

  public async ImportOntology(user: UserT | any, input: ContainerImportT, file: Buffer, dryrun: boolean, update: boolean, containerID: string): Promise<Result<string>> {
    if (file.length === 0) {
      const axiosConfig: AxiosRequestConfig = {
        headers: {
          "Content-Type": "application/xml;charset=UTF-8"
        },
        responseType: "text"
      }
      const resp = await axios.get(input.path!, axiosConfig);
      return new Promise<Result<string>>((resolve, reject) => {
        if (resp.status < 200 || resp.status > 299) reject(resp.status)

        if (resp.data.isError) reject(resp.data.value)

        const jsonData = convert.xml2json(resp.data, {
          compact: true,
          ignoreComment: true,
          spaces: 4
        });

        this.parseOntology(user, JSON.parse(jsonData), input.name, input.description || "", dryrun, update, containerID)
          .then((result) => {
            resolve(result)
          })
          .catch(e => {
            reject(e)
          })
      })
        .catch((e) => { return Promise.reject(Result.Failure(e)) })
    } else {
      const jsonData = convert.xml2json(file.toString('utf8'), {
        compact: true,
        ignoreComment: true,
        spaces: 4
      });
      return new Promise<Result<string>>((resolve) => {
        resolve(this.parseOntology(user, JSON.parse(jsonData), input.name, input.description || "", dryrun, update, containerID))
      })
        .catch((e) => { return Promise.reject(Result.Failure(e)) })
    }
  }

  private async parseOntology(user: UserT | any, json: any, name: string, description: string, dryrun: boolean, update: boolean, containerID: string): Promise<Result<string>> {
    return new Promise<Result<string>>(async (resolve) => {
      json = json["rdf:RDF"]
      const ontologyHead = json["owl:Ontology"];
      const annotationProperties = json["owl:AnnotationProperty"];
      const objectProperties = json["owl:ObjectProperty"];
      const datatypeProperties = json["owl:DatatypeProperty"];
      const classes = json["owl:Class"];
      const contributor = ontologyHead["dc:contributor"];

      // Declare an intersection type to add needed fields to MetatypeT
      type MetatypeExtendT = MetatypeT &
      {
        db_id?: string,
        parent_id?: string,
        properties: { [key: string]: any },
        keys: { [key: string]: any },
        updateKeys: Map<string, any>,
        updateKeyNames: { [key: string]: any }
      }

      type PropertyT = {
        value: string,
        target: string,
        property_type: string,
        restriction_type: string,
        cardinality_quantity: string
      }

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
        const classID = selectedClass._attributes["rdf:about"]
        let classLabel = selectedClass["rdfs:label"]._text;
        // if language has not been set, rdfs:label has a single string property rather than an object
        if (typeof classLabel === "undefined") {
          classLabel = selectedClass["rdfs:label"];
        }

        let parentID;
        const properties: { [key: string]: PropertyT } = {};
        if (typeof selectedClass["rdfs:subClassOf"][0] === "undefined") {
          parentID = selectedClass["rdfs:subClassOf"]._attributes["rdf:resource"];
        } else { // if no other properties, subClassOf is not an array
          parentID = selectedClass["rdfs:subClassOf"][0]._attributes["rdf:resource"];
          // loop through properties
          // if someValuesFrom -> rdf:resource !== "http://www*" then assume its a relationship, otherwise static property
          let j;
          // start at 1 since 0 is the parent ID property
          for (j = 1; j < selectedClass["rdfs:subClassOf"].length; j++) {
            const property = selectedClass["rdfs:subClassOf"][j]["owl:Restriction"];
            const onProperty = property["owl:onProperty"]._attributes["rdf:resource"];
            // object or datatype referenced will either be someValuesFrom or qualifiedCardinality and onDataRange
            let dataRange;
            let propertyType;
            let restrictionType = 'some';
            let target = 'none';
            let cardinalityQuantity = 'none';

            if (typeof property["owl:someValuesFrom"] === "undefined") {
              restrictionType = property["owl:qualifiedCardinality"] ? "exact"
                : property["owl:maxQualifiedCardinality"] ? "max"
                  : property["owl:minQualifiedCardinality"] ? "min"
                    : 'unknown restriction type';
              cardinalityQuantity = property["owl:qualifiedCardinality"] ? property["owl:qualifiedCardinality"]._text
                : property["owl:maxQualifiedCardinality"] ? property["owl:maxQualifiedCardinality"]._text
                  : property["owl:minQualifiedCardinality"] ? property["owl:minQualifiedCardinality"]._text
                    : 'unknown cardinality value';
              // Primitive type and class cardinality
              dataRange = property["owl:onDataRange"] ? property["owl:onDataRange"]._attributes["rdf:resource"].split("#")[1]
                : property["owl:onClass"] ? property["owl:onClass"]._attributes["rdf:resource"]
                  : 'unknown data range';

              target = dataRange; // This contains the class or datatype with a cardinality
              target = this.ValidateTarget(target);

              // Determine if primitive or relationship property
              const regex = new RegExp('[1-9:-]');
              if (regex.test(target)) {
                // The target is an identifier for another class
                propertyType = 'relationship';
              } else {
                propertyType = 'primitive';
              }
            } else {
              target = property["owl:someValuesFrom"]._attributes["rdf:resource"];
              if (target.match(/http:\/\/www/)) {
                propertyType = 'primitive';
                target = target.split("#")[1];
                target = this.ValidateTarget(target);
              } else {
                propertyType = 'relationship';
              }
            }
            const propertyObj = { value: onProperty, target, property_type: propertyType, restriction_type: restrictionType, cardinality_quantity: cardinalityQuantity };
            const propKey = propertyObj.value + propertyObj.target;
            properties[propKey] = propertyObj;
          }
        }

        let classDescription = "";
        if (typeof selectedClass["obo:IAO_0000115"] !== "undefined") {
          classDescription = selectedClass["obo:IAO_0000115"]._text ? selectedClass["obo:IAO_0000115"]._text : selectedClass["obo:IAO_0000115"];
        }

        // Search for and remove troublesome characters from class descriptions
        const regex = new RegExp('[’]');
        if (regex.test(classDescription)) {
          classDescription = classDescription.replace('’', "");
        }

        const thisClass = { id: classID, name: classLabel, parent_id: parentID, description: classDescription, properties, keys: [], updateKeys: new Map(), updateKeyNames: [] };
        classListMap.set(classLabel, thisClass);
        classIDMap.set(classID, thisClass)
      }

      // Relationships
      for (const relationship of objectProperties) {
        const relationshipID = relationship._attributes["rdf:about"];
        const relationshipName = relationship["rdfs:label"]._text ? relationship["rdfs:label"]._text : relationship["rdfs:label"];
        let relationshipDescription = "";
        if (typeof relationship["obo:IAO_0000115"] !== "undefined") {
          relationshipDescription = relationship["obo:IAO_0000115"]._text ? relationship["obo:IAO_0000115"]._text : relationship["obo:IAO_0000115"];
        }
        relationshipMap.set(relationshipName, { id: relationshipID, name: relationshipName, description: relationshipDescription });
        relationshipIDMap.set(relationshipID, { id: relationshipID, name: relationshipName, description: relationshipDescription })
      }
      // Add inheritance relationship to relationship map
      relationshipMap.set('inheritance', { name: 'inheritance', description: 'Identifies the parent of the entity.' })

      // Datatype Properties
      for (const dataProperty of datatypeProperties) {
        const dpID = dataProperty._attributes["rdf:about"];
        const dpName = dataProperty["rdfs:label"]._text ? dataProperty["rdfs:label"]._text : dataProperty["rdfs:label"];
        let dpDescription = "";
        if (typeof dataProperty["obo:IAO_0000115"] !== "undefined") {
          dpDescription = dataProperty["obo:IAO_0000115"]._text ? dataProperty["obo:IAO_0000115"]._text : dataProperty["obo:IAO_0000115"];
        }
        let dpEnumRange = null;
        if (typeof dataProperty["rdfs:range"] !== "undefined") {
          dpEnumRange = dataProperty["rdfs:range"]["rdfs:Datatype"] ? dataProperty["rdfs:range"]["rdfs:Datatype"] : null;

          if (dpEnumRange !== null) {
            // Add the first enum value
            let currentOption = dpEnumRange["owl:oneOf"]["rdf:Description"];
            const options = [currentOption["rdf:first"]._text]
            // Loop through the remaining enum values
            while (typeof currentOption["rdf:rest"]["rdf:Description"] !== "undefined") {
              currentOption = currentOption["rdf:rest"]["rdf:Description"];
              options.push(currentOption["rdf:first"]._text)
            }
            dpEnumRange = options;
          }
        }
        dataPropertyMap.set(dpID, { name: dpName, description: dpDescription, dp_enum: dpEnumRange });
      }

      let ontologyDescription = description || "";
      if (ontologyHead[description]) {
        ontologyDescription = ontologyHead[description]._text ? ontologyHead[description]._text : description;
      }

      if (dryrun) {
        let explainString = "<b>Ontology Extractor - Explain Plan</b><br/>";
        explainString += "Container name: " + name + "<br/>";
        explainString += "Container description: " + ontologyDescription + "<br/>";
        explainString += "# of classes/types: " + classListMap.size + "<br/>";
        explainString += '# of data properties: ' + dataPropertyMap.size + "<br/>";
        explainString += "# of relationships: " + relationshipMap.size + "<br/>";
        resolve(Result.Success(explainString));
      } else {
        // If performing a create, need to create container and retrieve container ID
        if (!update) {
          const containers = await CreateContainer(user,
            {
              name,
              description: ontologyDescription
            })
          if (containers.isError) return resolve(Result.SilentFailure(containers.error!.error));
          containerID = containers.value[0].id!;
        }

        let allRelationshipPairNames: string[] = [];

        // prepare inheritance relationship pairs
        classListMap.forEach(async (thisClass: MetatypeExtendT) => {
          // don't add parent relationship for root entity
          if (!thisClass.parent_id!.match(/owl#Thing/)) {
            allRelationshipPairNames.push(thisClass.name + ' : child of : ' + classIDMap.get(thisClass.parent_id).name)

            // add inherited properties and relationships (flatten ontology)
            let parent = classIDMap.get(thisClass.parent_id)
            // loop until root class (below owl#Thing) is reached
            while (!parent.parent_id.match(/owl#Thing/)) {
              thisClass.properties = {
                ...thisClass.properties,
                ...parent.properties
              }
              parent = classIDMap.get(parent.parent_id)
            }
            // add root class properties
            thisClass.properties = {
              ...thisClass.properties,
              ...parent.properties
            }
          }

          // prepare properties/keys and remaining relationship pairs
          // for now we just need the names for matching later
          for (const propertyName in thisClass.properties) {
            const property = thisClass.properties[propertyName];

            if (property.property_type === 'primitive') {
              const dataProp = dataPropertyMap.get(property.value);
              const propName = thisClass.name + ' : ' + dataProp.name

              thisClass.keys.push(propName)
            } else if (property.property_type === 'relationship') {
              // use relationshipIDMap for accessing relationships by ID
              const relationship = relationshipIDMap.get(property.value);
              const relationshipName = thisClass.name + ' : ' + relationship.name + ' : ' + classIDMap.get(property.target).name

              allRelationshipPairNames.push(relationshipName)
            }
          }
        })

        if (update) {
          let oldMetatypeRelationships
          let oldMetatypes
          let oldMetatypeRelationshipPairs

          // retrieve existing container, relationships, metatypes, and relationship pairs
          oldMetatypeRelationships = (await metatypeRelationshipStorage.List(containerID, 0, -1)).value
          oldMetatypes = await metatypeStorage.List(containerID, 0, -1)
          oldMetatypes = oldMetatypes.value
          oldMetatypeRelationshipPairs = (await metatypeRelationshipPairStorage.List(containerID, 0, -1)).value

          // loop through above, checking if there is anything in old that has been removed
          // if anything has been removed, check for associated nodes/edges
          // if associated data exists, raise error. Otherwise remove

          for (const metatype of oldMetatypes) {
            // metatype has been removed
            if (!classListMap.has(metatype.name)) {
              const nodes = (await nodeStorage.ListByMetatypeID(metatype.id!, 0, 10)).value

              if (nodes.length > 0) {
                resolve(Result.Failure(`Attempting to remove metatype ${metatype.name}.
                  This metatype has associated data, please delete the data before container update.`));
              } else {
                // no associated data, remove metatype
                Logger.info(`Removing metatype ${metatype.name}`)
                const removal = await metatypeStorage.PermanentlyDelete(metatype.id!)
                if (removal.error) return resolve(Result.Failure(`Unable to delete metatype ${metatype.name}`))
              }

            } else {
              // mark metatype for update and add existing IDs
              const thisMetatype = classListMap.get(metatype.name)
              thisMetatype.update = true
              thisMetatype.container_id = containerID
              thisMetatype.db_id = metatype.id
              classIDMap.set(thisMetatype.id, thisMetatype)
            }
            // check metatypeKeys
            const newMetatypeKeys = classListMap.get(metatype.name).keys
            const oldMetatypeKeys = (await metatypeKeyStorage.List(metatype.id!)).value

            for (const key of oldMetatypeKeys) {

              if (!newMetatypeKeys.includes(key.name)) {
                const nodes = (await nodeStorage.ListByMetatypeID(metatype.id!, 0, 10)).value

                if (nodes.length > 0) {
                  resolve(Result.Failure(`Attempting to remove metatype ${metatype.name} key ${key.name}.
                    This metatype has associated data, please delete the data before container update.`));
                } else {
                  // no associated data, remove key
                  Logger.info(`Removing metatype key ${key.name}`)
                  const removal = await metatypeKeyStorage.PermanentlyDelete(key.id!)
                  if (removal.error) return resolve(Result.Failure(`Unable to delete metatype key ${key.name}`))
                }

              } else {
                // update key
                const thisMetatype = classListMap.get(metatype.name)
                thisMetatype.updateKeys.set(key.name, key)
                thisMetatype.updateKeyNames.push(key.name)
              }
            }
          }

          // Ontology must first be flattened
          for (const relationshipPair of oldMetatypeRelationshipPairs) {
            if (!allRelationshipPairNames.includes(relationshipPair.name)) {

              const edges = (await edgeStorage.ListByRelationshipPairID(relationshipPair.id!, 0, 10)).value
              if (edges.length > 0) {
                resolve(Result.Failure(`Attempting to remove metatype relationship pair ${relationshipPair.name}. 
                  This relationship pair has associated data, please delete the data before container update.`));
              } else {
                // no associated data, remove relationship pair
                Logger.info(`Removing relationship pair ${relationshipPair.name}`)
                const removal = await metatypeRelationshipPairStorage.Delete(relationshipPair.id!)
                if (removal.error) return resolve(Result.Failure(`Unable to delete metatype relationship pair ${relationshipPair.name}`))
              }

            } else {
              // update key
              // use regex to parse out metatype name
              const regex = /\S*/;
              const metatypeName = relationshipPair.name.match(regex)![0]

              const thisMetatype = classListMap.get(metatypeName)
              thisMetatype.updateKeys.set(relationshipPair.name, relationshipPair)
              thisMetatype.updateKeyNames.push(relationshipPair.name)
            }
          }

          for (const relationship of oldMetatypeRelationships) {

            if (!relationshipMap.has(relationship.name)) {
              // ontological assumption: if metatypes and metatype relationship pairs are examined first, 
              // we don't need to dig into them again for metatype relationships
              // any edges instantiated from relationship pairs that depend on the relationship would have already been found
              Logger.info(`Removing relationship ${relationship.name}`)
              const removal = await metatypeRelationshipStorage.PermanentlyDelete(relationship.id!)
              if (removal.error) return resolve(Result.Failure(`Unable to delete relationship ${relationship.name}`))
            } else {
              const thisRelationship = relationshipMap.get(relationship.name)
              thisRelationship.update = true
              thisRelationship.db_id = relationship.id
            }
          }
        }

        const relationshipPromises: Promise<Result<MetatypeRelationshipT[]>>[] = [];
        const relationshipUpdates: MetatypeRelationshipT[] = [];

        relationshipMap.forEach(relationship => {
          // if not marked for update, create
          if (!relationship.update) {
            const data = {
              name: relationship.name,
              description: relationship.description
            };
            relationshipPromises.push(metatypeRelationshipStorage.Create(containerID, user.id!, data))
          } else {
            // else add to batch update
            const data = {
              name: relationship.name,
              description: relationship.description,
              id: relationship.db_id
            }
            relationshipUpdates.push(data)
          }
        })

        if (relationshipUpdates.length > 0) {
          relationshipPromises.push(metatypeRelationshipStorage.BatchUpdate(relationshipUpdates))
        }

        const relationshipResult: Result<MetatypeRelationshipT[]>[] = await Promise.all(relationshipPromises)

        // loop through promise results ensuring no errors and adding database IDs
        relationshipResult.forEach(async resultEntry => {
          if (resultEntry.isError) {
            const rollback = await this.rollbackOntology(containerID)
              .then((result) => {
                return result + " " + resultEntry.error?.error
              })
              .catch((err: string) => {
                return err + " " + resultEntry.error?.error
              })
            resolve(Result.SilentFailure(rollback))
            return
          } else {
            const resultValue = resultEntry.value[0]
            const mapValue = relationshipMap.get(resultValue.name)
            mapValue.db_id = resultValue.id
            relationshipMap.set(mapValue.name, mapValue)
          }
        })

        const classPromises: Promise<Result<MetatypeT[]>>[] = [];
        const metatypeUpdates: MetatypeT[] = [];

        classListMap.forEach(thisClass => {
          // if not marked for update, create
          if (!thisClass.update) {
            const data = {
              name: thisClass.name,
              description: thisClass.description
            };
            classPromises.push(metatypeStorage.Create(containerID, user.id!, data))
          } else {
            // else add to batch update
            const data = {
              name: thisClass.name,
              description: thisClass.description,
              metatype_id: thisClass.id
            };
            metatypeUpdates.push(data)
          }
        })

        if (metatypeUpdates.length > 0) {
          classPromises.push(metatypeStorage.BatchUpdate(metatypeUpdates))
        }

        const classResult: Result<MetatypeT[]>[] = await Promise.all(classPromises)

        // loop through promise results ensuring no errors and adding database IDs
        classResult.forEach(async resultEntry => {
          if (resultEntry.isError) {
            const rollback = await this.rollbackOntology(containerID)
              .then((result) => {
                return result + " " + resultEntry.error?.error
              })
              .catch((err: string) => {
                return err + " " + resultEntry.error?.error
              })
            resolve(Result.SilentFailure(rollback))
            return
          } else {
            const resultValue = resultEntry.value[0]
            const mapValue = classListMap.get(resultValue.name)
            mapValue.db_id = resultValue.id

            classListMap.set(mapValue.name, mapValue)
            classIDMap.set(mapValue.id, mapValue)
          }
        })

        const propertyPromises: Promise<Result<MetatypeKeyT[] | MetatypeRelationshipPairT[]>>[] = [];
        // Add metatype keys (properties) and relationship pairs
        classListMap.forEach(async (thisClass: MetatypeExtendT) => {

          const updateRelationships: MetatypeRelationshipPairT[] = [];

          // Add relationship to parent class
          const relationship = relationshipMap.get('inheritance');
          // Don't add parent relationship for root entity
          if (!thisClass.parent_id!.match(/owl#Thing/)) {

            const relationshipName = thisClass.name + ' : child of : ' + classIDMap.get(thisClass.parent_id).name

            let data: MetatypeRelationshipPairT = {
              name: relationshipName,
              description: relationship.description,
              origin_metatype_id: thisClass.db_id!,
              destination_metatype_id: classIDMap.get(thisClass.parent_id).db_id,
              relationship_id: relationship.db_id,
              relationship_type: "many:one"
            };

            if (thisClass.updateKeyNames.includes(relationshipName)) {
              const originalKeyData = thisClass.updateKeys.get(relationshipName)
              data.id = originalKeyData.id
              updateRelationships.push(data)
            } else {
              propertyPromises.push(metatypeRelationshipPairStorage.Create(containerID, user.id!, data))
            }

          }

          // Add primitive properties and other relationships
          // placeholder for keys that will be sent to BatchUpdate()
          const updateKeys: MetatypeKeysT = [];

          for (const propertyName in thisClass.properties) {
            const property = thisClass.properties[propertyName];

            if (property.property_type === 'primitive') {
              const dataProp = dataPropertyMap.get(property.value);
              let propertyOptions = [""];

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

              const keyName = thisClass.name + ' : ' + dataProp.name
              let data: MetatypeKeyT = {
                metatype_id: thisClass.db_id,
                name: keyName,
                required: false,
                property_name: dataProp.name,
                description: dataProp.description,
                data_type: property.target,
                validation: {
                  regex: "",
                  min,
                  max
                },
                options: propertyOptions,
                default_value: ""
              };

              if (thisClass.updateKeyNames.includes(keyName)) {
                const originalKeyData = thisClass.updateKeys.get(keyName)
                data.id = originalKeyData.id
                updateKeys.push(data)
              } else {
                propertyPromises.push(metatypeKeyStorage.Create(data.metatype_id!, user.id!, data));
              }

            } else if (property.property_type === 'relationship') {
              const relationship = relationshipIDMap.get(property.value);
              const relationshipID = relationshipMap.get(relationship.name).db_id
              const relationshipName = thisClass.name + ' : ' + relationship.name + ' : ' + classIDMap.get(property.target).name
              let data: MetatypeRelationshipPairT = {
                name: relationshipName,
                description: relationship.description,
                origin_metatype_id: thisClass.db_id!,
                destination_metatype_id: classIDMap.get(property.target).db_id,
                relationship_id: relationshipID,
                relationship_type: "many:many"
              };

              if (thisClass.updateKeyNames.includes(relationshipName)) {
                const originalKeyData = thisClass.updateKeys.get(relationshipName)
                data.id = originalKeyData.id
                updateRelationships.push(data)
              } else {
                propertyPromises.push(metatypeRelationshipPairStorage.Create(containerID, user.id!, data))
              }
            }
          }

          if (updateKeys.length > 0) {
            propertyPromises.push(metatypeKeyStorage.BatchUpdate(updateKeys, user.id!));
          }

          if (updateRelationships.length > 0) {
            propertyPromises.push(metatypeRelationshipPairStorage.BatchUpdate(updateRelationships))
          }

        })
        const propertyResults: Result<MetatypeKeyT[] | MetatypeRelationshipPairT[]>[] = await Promise.all(propertyPromises)
        for (const propResult of propertyResults) {
          if (propResult.isError) {
            const rollback = await this.rollbackOntology(containerID)
              .then((result) => {
                return result + " " + propResult.error?.error
              })
              .catch((err: string) => {
                return err + " " + propResult.error?.error
              })
            resolve(Result.SilentFailure(rollback))
            return
          }
        }

        if (update) {
          resolve(Result.Success(`Container ${containerID} successfully updated`))
        } else {
          resolve(Result.Success(containerID))
        }

      }
    })
      .catch<Result<string>>((e: string) => {
        return Promise.resolve(Result.SilentFailure(e))
      })
  }
}
