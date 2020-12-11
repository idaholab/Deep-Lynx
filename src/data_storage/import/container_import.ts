import axios, { AxiosRequestConfig } from "axios";
import ContainerStorage from "../../data_storage/container_storage";
import {CreateContainer} from "../../api_handlers/container";
import MetatypeRelationshipStorage from "../../data_storage/metatype_relationship_storage"
import MetatypeStorage from "../../data_storage/metatype_storage"
import MetatypeRelationshipPairStorage from "../../data_storage/metatype_relationship_pair_storage"
import MetatypeKeyStorage from "../../data_storage/metatype_key_storage"
import { UserT } from "../../types/user_management/userT";
import Result from "../../result";
import { ContainerImportT } from "../../types/import/containerImportT"
import { MetatypeT } from "../../types/metatypeT";
import { MetatypeRelationshipPairT } from "../../types/metatype_relationship_pairT";
import { MetatypeKeyT } from "../../types/metatype_keyT";
import { MetatypeRelationshipT } from "../../types/metatype_relationshipT";
const convert = require('xml-js');

const containerStorage = ContainerStorage.Instance;
const metatypeRelationshipStorage = MetatypeRelationshipStorage.Instance;
const metatypeStorage = MetatypeStorage.Instance;
const metatypeRelationshipPairStorage = MetatypeRelationshipPairStorage.Instance;
const metatypeKeyStorage = MetatypeKeyStorage.Instance;

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

  public async ImportOntology(user: UserT | any, input: ContainerImportT, file: Buffer, dryrun: boolean): Promise<Result<string>> {
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

        this.parseOntology(user, JSON.parse(jsonData), input.name, input.description || "", dryrun)
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
        resolve(this.parseOntology(user, JSON.parse(jsonData), input.name, input.description || "", dryrun))
      })
        .catch((e) => { return Promise.reject(Result.Failure(e)) })
    }
  }

  private async parseOntology(user: UserT, json: any, name: string, description: string, dryrun: boolean): Promise<Result<string>> {
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
          properties: {[key: string]: any}
        }

      type PropertyT = {
        value: string,
        target: string,
        property_type: string,
        restriction_type: string,
        cardinality_quantity: string
      }

      let classCount = 0;
      const classList: MetatypeExtendT[] = [];
      const classMap = new Map();
      const relationshipMap = new Map();
      const dataPropertyMap = new Map();

      for (const selectedClass of classes) {
        const classID = selectedClass._attributes["rdf:about"]
        let classLabel = selectedClass["rdfs:label"]._text;
        // if language has not been set, rdfs:label has a single string property rather than an object
        if (typeof classLabel === "undefined") {
          classLabel = selectedClass["rdfs:label"];
        }

        let parentID;
        const properties: {[key: string]: PropertyT} = {};
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

        const thisClass = { id: classID, name: classLabel, parent_id: parentID, description: classDescription, properties };
        classList.push(thisClass);
        classCount++;
      }

      // Relationships
      for (const relationship of objectProperties) {
        const relationshipID = relationship._attributes["rdf:about"];
        const relationshipName = relationship["rdfs:label"]._text ? relationship["rdfs:label"]._text : relationship["rdfs:label"];
        let relationshipDescription = "";
        if (typeof relationship["obo:IAO_0000115"] !== "undefined") {
          relationshipDescription = relationship["obo:IAO_0000115"]._text ? relationship["obo:IAO_0000115"]._text : relationship["obo:IAO_0000115"];
        }
        relationshipMap.set(relationshipID, { name: relationshipName, description: relationshipDescription });
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
        explainString += "# of classes/types: " + classCount + "<br/>";
        explainString += '# of data properties: ' + dataPropertyMap.size + "<br/>";
        explainString += "# of relationships: " + relationshipMap.size + "<br/>";
        resolve(Result.Success(explainString));
      } else {
        // Issue API commands to create container, items, and relationships
        // Create the container
        const data = {
          name,
          description: ontologyDescription
        };
        const containers = await CreateContainer(user, data)
        if (containers.isError) return resolve(Result.SilentFailure(containers.error!.error));

        const containerID = containers.value[0].id!;

        // Create relationships
        const relationshipPromises: Promise<Result<MetatypeRelationshipT[]>>[] = [];
        relationshipMap.forEach(async (value, key, map) => {
          const data = {
            name: value.name,
            description: value.description
          };
          relationshipPromises.push(metatypeRelationshipStorage.Create(containerID, user.id!, data))
        });
        const relationshipResult: Result<MetatypeRelationshipT[]>[] = await Promise.all(relationshipPromises)
        let relCount = 0;
        for (const [key, value] of relationshipMap) {
          if (relationshipResult[relCount].isError) {
            const rollback = await this.rollbackOntology(containerID)
              .then((result) => {
                return result + " " + relationshipResult[relCount].error?.error
              })
              .catch((err: string) => {
                return err + " " + relationshipResult[relCount].error?.error
              })
            resolve(Result.SilentFailure(rollback))
            return
          } else {
            const datum = relationshipResult[relCount].value[0];
            value.db_id = datum.id;
            relationshipMap.set(key, value);
            relCount++;
          }
        }

        // Create metatypes (classes)
        const classPromises: Promise<Result<MetatypeT[]>>[] = [];
        classList.forEach(async (thisClass: MetatypeExtendT) => {
          const data = {
            name: thisClass.name,
            description: thisClass.description
          };
          classPromises.push(metatypeStorage.Create(containerID, user.id!, data))
        });
        const classResult: Result<MetatypeT[]>[] = await Promise.all(classPromises)
        let classCount = 0;
        for (const selectedClass of classList) {
          if (classResult[classCount].isError) {
            const rollback = await this.rollbackOntology(containerID)
              .then((result) => {
                return result + " " + classResult[classCount].error?.error
              })
              .catch((err: string) => {
                return err + " " + classResult[classCount].error?.error
              })
            resolve(Result.SilentFailure(rollback))
            return
          } else {
            const datum = classResult[classCount].value[0];
            selectedClass.db_id = datum.id;
            classList[classCount] = selectedClass;
            classMap.set(selectedClass.id, selectedClass)
            classCount++;
          }
        }

        const propertyPromises: Promise<Result<MetatypeKeyT[] | MetatypeRelationshipPairT[]>>[] = [];
        // Add metatype keys (properties) and relationship pairs
        classList.forEach(async (thisClass: MetatypeExtendT) => {
          // Add relationship to parent class
          const relationship = relationshipMap.get('inheritance');
          // Don't add parent relationship for root entity
          if (!thisClass.parent_id!.match(/owl#Thing/)) {
            const data = {
              name: thisClass.name + ' : child of : ' + classMap.get(thisClass.parent_id).name,
              description: relationship.description,
              origin_metatype_id: thisClass.db_id,
              destination_metatype_id: classMap.get(thisClass.parent_id).db_id,
              relationship_id: relationship.db_id,
              relationship_type: "many:one"
            };
            propertyPromises.push(metatypeRelationshipPairStorage.Create(containerID, user.id!, data))

            // Add inherited properties and relationships (flatten ontology)
            let parent = classMap.get(thisClass.parent_id)
            // Loop until root class (below owl#Thing) is reached
            while (!parent.parent_id.match(/owl#Thing/)) {
              thisClass.properties = {
                ...thisClass.properties,
                ...parent.properties
              }
              parent = classMap.get(parent.parent_id)
            }
            // Add root class properties
            thisClass.properties = {
              ...thisClass.properties,
              ...parent.properties
            }
          }

          // Add primitive properties and other relationships
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
              const data = {
                metatype_id: thisClass.db_id,
                name: thisClass.name + ' : ' + dataProp.name,
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
                defaultValue: ""
              };
              propertyPromises.push(metatypeKeyStorage.Create(data.metatype_id!, user.id!, data));
            } else if (property.property_type === 'relationship') {
              const relationship = relationshipMap.get(property.value);
              const data = {
                name: thisClass.name + ' : ' + relationship.name + ' : ' + classMap.get(property.target).name,
                description: relationship.description,
                origin_metatype_id: thisClass.db_id,
                destination_metatype_id: classMap.get(property.target).db_id,
                relationship_id: relationship.db_id,
                relationship_type: "many:many"
              };
              propertyPromises.push(metatypeRelationshipPairStorage.Create(containerID, user.id!, data))
            }
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

        resolve(Result.Success(containerID))
      }
    })
      .catch<Result<string>>((e: string) => {
        return Promise.resolve(Result.SilentFailure(e))
      })
  }
}
