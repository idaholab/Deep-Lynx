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
    if (file.length == 0) {
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
      const ontology_head = json["owl:Ontology"];
      const annotation_properties = json["owl:AnnotationProperty"];
      const object_properties = json["owl:ObjectProperty"];
      const datatype_properties = json["owl:DatatypeProperty"];
      const classes = json["owl:Class"];
      const contributor = ontology_head["dc:contributor"];

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

      let class_count = 0;
      const class_list: MetatypeExtendT[] = [];
      const class_map = new Map();
      const relationship_map = new Map();
      const data_property_map = new Map();

      for (let i = 0; i < classes.length; i++) {
        const class_id = classes[i]._attributes["rdf:about"]
        let class_label = classes[i]["rdfs:label"]._text;
        // if language has not been set, rdfs:label has a single string property rather than an object
        if (typeof class_label == "undefined") {
          class_label = classes[i]["rdfs:label"];
        }

        let parent_id;
        const properties = [];
        if (typeof classes[i]["rdfs:subClassOf"][0] == "undefined") {
          parent_id = classes[i]["rdfs:subClassOf"]._attributes["rdf:resource"];
        } else { // if no other properties, subClassOf is not an array
          parent_id = classes[i]["rdfs:subClassOf"][0]._attributes["rdf:resource"];
          // loop through properties
          // if someValuesFrom -> rdf:resource != "http://www*" then assume its a relationship, otherwise static property
          let j;
          // start at 1 since 0 is the parent ID property
          for (j = 1; j < classes[i]["rdfs:subClassOf"].length; j++) {
            const property = classes[i]["rdfs:subClassOf"][j]["owl:Restriction"];
            const on_property = property["owl:onProperty"]._attributes["rdf:resource"];
            // object or datatype referenced will either be someValuesFrom or qualifiedCardinality and onDataRange
            let data_range;
            let property_type;
            let restriction_type = 'some';
            let target = 'none';
            let cardinality_quantity = 'none';

            if (typeof property["owl:someValuesFrom"] == "undefined") {
              restriction_type = property["owl:qualifiedCardinality"] ? "exact"
                : property["owl:maxQualifiedCardinality"] ? "max"
                  : property["owl:minQualifiedCardinality"] ? "min"
                    : 'unknown restriction type';
              cardinality_quantity = property["owl:qualifiedCardinality"] ? property["owl:qualifiedCardinality"]._text
                : property["owl:maxQualifiedCardinality"] ? property["owl:maxQualifiedCardinality"]._text
                  : property["owl:minQualifiedCardinality"] ? property["owl:minQualifiedCardinality"]._text
                    : 'unknown cardinality value';
              // Primitive type and class cardinality
              data_range = property["owl:onDataRange"] ? property["owl:onDataRange"]._attributes["rdf:resource"].split("#")[1]
                : property["owl:onClass"] ? property["owl:onClass"]._attributes["rdf:resource"]
                  : 'unknown data range';

              target = data_range; // This contains the class or datatype with a cardinality
              target = this.ValidateTarget(target);

              // Determine if primitive or relationship property
              const regex = new RegExp('[1-9:-]');
              if (regex.test(target)) {
                // The target is an identifier for another class
                property_type = 'relationship';
              } else {
                property_type = 'primitive';
              }
            } else {
              target = property["owl:someValuesFrom"]._attributes["rdf:resource"];
              if (target.match(/http:\/\/www/)) {
                property_type = 'primitive';
                target = target.split("#")[1];
                target = this.ValidateTarget(target);
              } else {
                property_type = 'relationship';
              }
            }
            const property_obj = { value: on_property, target, property_type, restriction_type, cardinality_quantity };
            properties.push(property_obj);
          }
        }

        let class_description = "";
        if (typeof classes[i]["obo:IAO_0000115"] != "undefined") {
          class_description = classes[i]["obo:IAO_0000115"]._text ? classes[i]["obo:IAO_0000115"]._text : classes[i]["obo:IAO_0000115"];
        }

        // Search for and remove troublesome characters from class descriptions
        const regex = new RegExp('[’]');
        if (regex.test(class_description)) {
          class_description = class_description.replace('’', "");
        }

        const this_class = { id: class_id, name: class_label, parent_id, description: class_description, properties };
        class_list.push(this_class);
        class_count++;
      }

      // Relationships
      for (let i = 0; i < object_properties.length; i++) {
        const relationship = object_properties[i];
        const relationship_id = relationship._attributes["rdf:about"];
        const relationship_name = relationship["rdfs:label"]._text ? relationship["rdfs:label"]._text : relationship["rdfs:label"];
        let relationship_description = "";
        if (typeof relationship["obo:IAO_0000115"] != "undefined") {
          relationship_description = relationship["obo:IAO_0000115"]._text ? relationship["obo:IAO_0000115"]._text : relationship["obo:IAO_0000115"];
        }
        relationship_map.set(relationship_id, { name: relationship_name, description: relationship_description });
      }
      // Add inheritance relationship to relationship map
      relationship_map.set('inheritance', { name: 'inheritance', description: 'Identifies the parent of the entity.' })

      // Datatype Properties
      for (let i = 0; i < datatype_properties.length; i++) {
        const data_property = datatype_properties[i];
        const dp_id = data_property._attributes["rdf:about"];
        const dp_name = data_property["rdfs:label"]._text ? data_property["rdfs:label"]._text : data_property["rdfs:label"];
        let dp_description = "";
        if (typeof data_property["obo:IAO_0000115"] != "undefined") {
          dp_description = data_property["obo:IAO_0000115"]._text ? data_property["obo:IAO_0000115"]._text : data_property["obo:IAO_0000115"];
        }
        let dp_enum_range = null;
        if (typeof data_property["rdfs:range"] != "undefined") {
          dp_enum_range = data_property["rdfs:range"]["rdfs:Datatype"] ? data_property["rdfs:range"]["rdfs:Datatype"] : null;

          if (dp_enum_range != null) {
            // Add the first enum value
            let current_option = dp_enum_range["owl:oneOf"]["rdf:Description"];
            const options = [current_option["rdf:first"]._text]
            // Loop through the remaining enum values
            while (typeof current_option["rdf:rest"]["rdf:Description"] != "undefined") {
              current_option = current_option["rdf:rest"]["rdf:Description"];
              options.push(current_option["rdf:first"]._text)
            }
            dp_enum_range = options;
          }
        }
        data_property_map.set(dp_id, { name: dp_name, description: dp_description, dp_enum: dp_enum_range });
      }

      let ontology_description = description || "";
      if (ontology_head[description]) {
        ontology_description = ontology_head[description]._text ? ontology_head[description]._text : description;
      }

      if (dryrun) {
        let explainString = "<b>Ontology Extractor - Explain Plan</b><br/>";
        explainString += "Container name: " + name + "<br/>";
        explainString += "Container description: " + ontology_description + "<br/>";
        explainString += "# of classes/types: " + class_count + "<br/>";
        explainString += '# of data properties: ' + data_property_map.size + "<br/>";
        explainString += "# of relationships: " + relationship_map.size + "<br/>";
        resolve(Result.Success(explainString));
      } else {
        // Issue API commands to create container, items, and relationships
        // Create the container
        const data = {
          name,
          description: ontology_description
        };
        const containers = await CreateContainer(user, data)
        if (containers.isError) return resolve(Result.SilentFailure(containers.error!.error));

        const containerID = containers.value[0].id!;

        // Create relationships
        const relationship_promises: Promise<Result<MetatypeRelationshipT[]>>[] = [];
        relationship_map.forEach(async function (value, key, map) {
          const data = {
            name: value.name,
            description: value.description
          };
          relationship_promises.push(metatypeRelationshipStorage.Create(containerID, user.id!, data))
        });
        const relationshipResult: Result<MetatypeRelationshipT[]>[] = await Promise.all(relationship_promises)
        let rel_count = 0;
        for (const [key, value] of relationship_map) {
          if (relationshipResult[rel_count].isError) {
            const rollback = await this.rollbackOntology(containerID)
              .then((result) => {
                return result + " " + relationshipResult[rel_count].error?.error
              })
              .catch((err: string) => {
                return err + " " + relationshipResult[rel_count].error?.error
              })
            resolve(Result.SilentFailure(rollback))
            return
          } else {
            const datum = relationshipResult[rel_count].value[0];
            value.db_id = datum.id;
            relationship_map.set(key, value);
            rel_count++;
          }
        }

        // Create metatypes (classes)
        const class_promises: Promise<Result<MetatypeT[]>>[] = [];
        class_list.forEach(async function (this_class: MetatypeExtendT) {
          const data = {
            name: this_class.name,
            description: this_class.description
          };
          class_promises.push(metatypeStorage.Create(containerID, user.id!, data))
        });
        const classResult: Result<MetatypeT[]>[] = await Promise.all(class_promises)
        let class_count = 0;
        for (let i = 0; i < class_list.length; i++) {
          if (classResult[class_count].isError) {
            const rollback = await this.rollbackOntology(containerID)
              .then((result) => {
                return result + " " + classResult[class_count].error?.error
              })
              .catch((err: string) => {
                return err + " " + classResult[class_count].error?.error
              })
            resolve(Result.SilentFailure(rollback))
            return
          } else {
            const this_class = class_list[i]
            const datum = classResult[class_count].value[0];
            this_class.db_id = datum.id;
            class_list[class_count] = this_class;
            class_map.set(this_class.id, this_class)
            class_count++;
          }
        }

        const property_promises: Promise<Result<MetatypeKeyT[] | MetatypeRelationshipPairT[]>>[] = [];
        // Add metatype keys (properties) and relationship pairs
        class_list.forEach(async function (this_class: MetatypeExtendT) {
          // Add relationship to parent class
          const relationship = relationship_map.get('inheritance');
          // Don't add parent relationship for root entity
          if (!this_class.parent_id!.match(/owl#Thing/)) {
            const data = {
              name: this_class.name + ' : child of : ' + class_map.get(this_class.parent_id).name,
              description: relationship.description,
              origin_metatype_id: this_class.db_id,
              destination_metatype_id: class_map.get(this_class.parent_id).db_id,
              relationship_id: relationship.db_id,
              relationship_type: "many:one"
            };
            property_promises.push(metatypeRelationshipPairStorage.Create(containerID, user.id!, data))
          }

          // Add primitive properties and other relationships
          this_class.properties.forEach(async function (property: PropertyT) {
            if (property.property_type == 'primitive') {
              const data_prop = data_property_map.get(property.value);
              let property_options = [""];
              if (data_prop.dp_enum != null) {
                property_options = data_prop.dp_enum;
              }
              // Leave 0 for unbounded and 'some' restriction type
              let min = 0;
              let max = 0;
              const cardinality_quantity = parseInt(property.cardinality_quantity);
              switch (property.restriction_type) {
                case 'exact':
                  min = cardinality_quantity;
                  max = cardinality_quantity;
                  break;
                case 'min':
                  min = cardinality_quantity;
                  break;
                case 'max':
                  max = cardinality_quantity;
                  break;
              }
              const data = {
                metatype_id: this_class.db_id,
                name: this_class.name + ' : ' + data_prop.name,
                required: false,
                property_name: data_prop.name,
                description: data_prop.description,
                data_type: property.target,
                validation: {
                  regex: "",
                  min,
                  max
                },
                options: property_options,
                defaultValue: ""
              };
              property_promises.push(metatypeKeyStorage.Create(data.metatype_id!, user.id!, data));
            } else if (property.property_type == 'relationship') {
              const relationship = relationship_map.get(property.value);
              const data = {
                name: this_class.name + ' : ' + relationship.name + ' : ' + class_map.get(property.target).name,
                description: relationship.description,
                origin_metatype_id: this_class.db_id,
                destination_metatype_id: class_map.get(property.target).db_id,
                relationship_id: relationship.db_id,
                relationship_type: "many:many"
              };
              property_promises.push(metatypeRelationshipPairStorage.Create(containerID, user.id!, data))
            }
          })
        })
        const propertyResult: Result<MetatypeKeyT[] | MetatypeRelationshipPairT[]>[] = await Promise.all(property_promises)
        for (let i = 0; i < propertyResult.length; i++) {
          if (propertyResult[i].isError) {
            const rollback = await this.rollbackOntology(containerID)
              .then((result) => {
                return result + " " + propertyResult[i].error?.error
              })
              .catch((err: string) => {
                return err + " " + propertyResult[i].error?.error
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
