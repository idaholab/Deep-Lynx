fs = require('fs');
let parser = require('xml2json');
const yargs = require('yargs');
var workerpool = require('workerpool');
var pool = workerpool.pool('./worker.js');

const argv = yargs
    .usage('Usage: <command> [options]')
    .alias('f', 'file')
    .nargs('f', 1)
    .describe('f', 'Ontology file to load')
    .alias('n', 'name')
    .nargs('n', 1)
    .describe('n', 'Name of new container to be created')
    .alias('d', 'description')
    .nargs('d', 1)
    .describe('d', 'Description of container or XML element in ontology header to parse')
    .demandOption(['f', 'n', 'd'])
    .option('hostname', {
        alias: 'o',
        description: 'Hostname for API calls to the de-lynx library',
        type: 'string',
        default: 'localhost'
    })
    .option('port', {
        alias: 'p',
        description: 'Port for API calls to the de-lynx library',
        type: 'number',
        default: 8090
    })
    .option('explain', {
        alias: 'e',
        description: 'Explain what container, classes, and relationships will be created without actually creating them',
        type: 'boolean'
    })
    .option('profiles', {
        alias: 'l',
        description: 'Add parsing of profile annotations',
        type: 'boolean'
    })
    .help()
    .alias('help', 'h')
    .argv;

function validateTarget(target) {
    // Replace incompatible data_type properties (ID, IDREF, etc.)
    // Don't replace any IDs of other classes
    const regex = new RegExp('[1-9:-]');
    if (!['string', 'number', 'boolean', 'date', 'enumeration', 'file'].includes(target) && 
            !regex.test(target)) {
        // console.log('Nonmatching target: ' + target)
        switch(target) {
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

fs.readFile(argv.file, function(err, data) {
    let ontology_json = parser.toJson(data);
    let json = JSON.parse(ontology_json);

    // Write a json file from the provided ontology file
    // fs.writeFile( './diamond.json', json, function(err) {
    //     if (err) throw err;
    //     console.log('File saved successfully');
    // });

    let ontology_head = json["rdf:RDF"]["owl:Ontology"];
    let annotation_properties = json["rdf:RDF"]["owl:AnnotationProperty"];
    let object_properties = json["rdf:RDF"]["owl:ObjectProperty"];
    let datatype_properties = json["rdf:RDF"]["owl:DatatypeProperty"];
    let classes = json["rdf:RDF"]["owl:Class"];
    // console.log("Ontology Head: ", ontology_head);
    let contributor  = ontology_head["dc:contributor"];
    // console.log("Contributors: ", contributor);

    let class_count = 0;
    let class_list = [];
    let class_map = new Map();
    let relationship_map = new Map();
    let data_property_map = new Map();

    for (let i = 0; i < classes.length; i++) {
        let class_id = classes[i]["rdf:about"]
        let class_label = classes[i]["rdfs:label"]["$t"];
        // if language has not been set, rdfs:label has a single string property rather than an object
        if (typeof class_label == "undefined") {
            class_label = classes[i]["rdfs:label"];
        }

        let parent_id;
        let properties = [];
        if (typeof classes[i]["rdfs:subClassOf"][0] == "undefined") {
            parent_id = classes[i]["rdfs:subClassOf"]["rdf:resource"];
        } else { // if no other properties, subClassOf is not an array
            parent_id = classes[i]["rdfs:subClassOf"][0]["rdf:resource"];
            // loop through properties
            // if someValuesFrom -> rdf:resource != "http://www*" then assume its a relationship, otherwise static property
            let j;
            // start at 1 since 0 is the parent ID property
            for (j = 1; j < classes[i]["rdfs:subClassOf"].length; j++) {
                let property = classes[i]["rdfs:subClassOf"][j]["owl:Restriction"];
                let on_property = property["owl:onProperty"]["rdf:resource"];
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
                    cardinality_quantity = property["owl:qualifiedCardinality"] ? property["owl:qualifiedCardinality"]["$t"]
                        : property["owl:maxQualifiedCardinality"] ? property["owl:maxQualifiedCardinality"]["$t"]
                        : property["owl:minQualifiedCardinality"] ? property["owl:minQualifiedCardinality"]["$t"]
                        : 'unknown cardinality value';
                    // Primitive type and class cardinality
                    data_range = property["owl:onDataRange"] ? property["owl:onDataRange"]["rdf:resource"].split("#")[1]
                        : property["owl:onClass"] ? property["owl:onClass"]["rdf:resource"]
                        : 'unknown data range';

                    target = data_range; // This contains the class or datatype with a cardinality
                    target = validateTarget(target);

                    // Determine if primitive or relationship property
                    const regex = new RegExp('[1-9:-]');
                    if (regex.test(target)) {
                        // The target is an identifier for another class
                        property_type = 'relationship';
                    } else {
                        property_type = 'primitive';
                    }
                } else {
                    target = property["owl:someValuesFrom"]["rdf:resource"];
                    if (target.match(/http:\/\/www/)) {
                        property_type = 'primitive';
                        target = target.split("#")[1];
                        target = validateTarget(target);
                    } else {
                        property_type = 'relationship';
                    }
                }
                let property_obj = {value: on_property, target: target, property_type: property_type, restriction_type: restriction_type, cardinality_quantity: cardinality_quantity};
                // console.log(property_obj);
                properties.push(property_obj);
            }
        }

        let class_description = "";
        if (typeof classes[i]["obo:IAO_0000115"] != "undefined") {
            class_description = classes[i]["obo:IAO_0000115"]["$t"] ? classes[i]["obo:IAO_0000115"]["$t"] : classes[i]["obo:IAO_0000115"];
        }

        // Search for and remove troublesome characters from class descriptions
        const regex = new RegExp('[’]');
        if (regex.test(class_description)) {
            // console.log('Old description: ' + class_description);
            class_description = class_description.replace('’', "");
            // console.log('New description: ' + class_description);
        }

        let this_class = {id: class_id, name: class_label, parent_id: parent_id, description: class_description, properties: properties};
        class_list.push(this_class);

        // console.log(class_label);
        // console.log(this_class);
        class_count++;
    }

    // Relationships
    // console.log(object_properties);
    for (i = 0; i < object_properties.length; i++) { 
        let relationship = object_properties[i];
        let relationship_id = relationship["rdf:about"];
        let relationship_name = relationship["rdfs:label"]["$t"] ? relationship["rdfs:label"]["$t"] : relationship["rdfs:label"];
        let relationship_description = relationship["obo:IAO_0000115"] ? relationship["obo:IAO_0000115"] : "";
        relationship_map.set(relationship_id, {name: relationship_name, description: relationship_description});
    }
    // Add inheritance relationship to relationship map
    relationship_map.set('inheritance', {name: 'inheritance', description: 'Identifies the parent of the entity.'})

    // Datatype Properties
    for (i = 0; i < datatype_properties.length; i++) { 
        let data_property = datatype_properties[i];
        let dp_id = data_property["rdf:about"];
        let dp_name = data_property["rdfs:label"]["$t"] ? data_property["rdfs:label"]["$t"] : data_property["rdfs:label"];
        let dp_description = "";
        if (typeof data_property["obo:IAO_0000115"] != "undefined") {
            dp_description = data_property["obo:IAO_0000115"]["$t"] ? data_property["obo:IAO_0000115"]["$t"] : data_property["obo:IAO_0000115"];
        }
        let dp_enum_range = null;
        if (typeof data_property["rdfs:range"] != "undefined") {
            dp_enum_range = data_property["rdfs:range"]["rdfs:Datatype"] ? data_property["rdfs:range"]["rdfs:Datatype"] : null;
            
            if (dp_enum_range != null) {
                // Add the first enum value
                let current_option = dp_enum_range["owl:oneOf"]["rdf:Description"];
                let options = [current_option["rdf:first"]]
                // Loop through the remaining enum values
                while(typeof current_option["rdf:rest"]["rdf:Description"] != "undefined") {
                    current_option = current_option["rdf:rest"]["rdf:Description"];
                    options.push(current_option["rdf:first"])
                }
                // console.log('Type: ' + JSON. stringify(dp_enum_range["owl:oneOf"]["rdf:Description"]["rdf:type"]))
                // console.log('Rest: ' + JSON. stringify(dp_enum_range["owl:oneOf"]["rdf:Description"]["rdf:rest"]))
                dp_enum_range = options;
            }
        }
        data_property_map.set(dp_id, {name: dp_name, description: dp_description, dp_enum: dp_enum_range});
    }
    // console.log(data_property_list);

    ontology_description = ontology_head[argv.description] ? ontology_head[argv.description] : argv.description;

    if (argv.explain) {
        console.log("Ontology Extractor - Explain Plan\n")
        console.log("Container name:           " + argv.name);
        console.log("Container description:    " + ontology_description);
        console.log("# of classes/types to add: " + class_count);
        console.log('# of data properties: ' + data_property_map.size);
        console.log("Relationships to create:   ")
        const rel_iterator = relationship_map.values();
        for (i = 0; i < relationship_map.size; i++) {
            console.log("\t" + rel_iterator.next().value.name)
        }
        console.log("API call base URL:         " + argv.hostname + ":" + argv.port);
        console.log("Ontology head: \n", ontology_head);
    } else {
        // Issue API commands to create container, items, and relationships
        hostname = argv.hostname;
        port = argv.port;

        pool.proxy()
            .then(async function (worker) {
                // Create the container
                console.log('Begin ontology creation within Deep Lynx database')
                const data = JSON.stringify({
                    name: argv.name,
                    description: ontology_description
                });
                let http_promise = await worker.apiCall(hostname, port, '/containers', data);
                jsonReturn = JSON.parse(http_promise);
                if (jsonReturn.value == null) {
                    console.log('Container may already exist. Please see error above.')
                    return process.exit(1);
                }
                containerID = jsonReturn.value[0].id;
                // console.log(containerID);

                // Create relationships
                console.log('Relationship list length: ' + relationship_map.size);
                console.log('Creating relationships...');
                let path = '/containers/'+containerID+'/metatype_relationships';
                let promises = [];
                relationship_map.forEach(async function(value, key, map) {
                    const data = JSON.stringify({
                        name: value.name,
                        description: value.description
                    });
                    promises.push(worker.apiCall(hostname, port, path, data));
                });
                await Promise.all(promises).then(buffer_data => {
                    
                    let buffer_count = 0;
                    relationship_map.forEach(async function(value, key, map) {
                        // console.log(buffer_count + ': ' + buffer_data[buffer_count])
                        const datum = JSON.parse(buffer_data[buffer_count]);
                        value.db_id = datum.value[0].id;
                        relationship_map.set(key, value);
                        buffer_count++;
                    })
                    // console.log(relationship_map.values());
                });
                
                // Create metatypes (classes) 
                console.log('Class list length: ' + class_list.length);
                console.log('Creating classes/metatypes...');
                path = '/containers/'+containerID+'/metatypes';
                let class_promises = [];
                class_list.forEach(async function(this_class) {
                    const data = JSON.stringify({
                        name: this_class["name"],
                        description: this_class["description"]
                    });
                    class_promises.push(worker.apiCall(hostname, port, path, data)); 
                });
                await Promise.all(class_promises).then(buffer_data => {
                    let buffer_count = 0;
                    class_list.forEach(function(this_class) {
                        const datum = JSON.parse(buffer_data[buffer_count]);
                        this_class.db_id = datum.value[0].id;
                        class_list[buffer_count] = this_class;
                        class_map.set(this_class.id, this_class)
                        buffer_count++;
                    })
                });
                
                console.log('Creating class/metatype properties...');
                let property_data = [];
                // Add metatype keys (properties) and relationship pairs
                class_list.forEach(async function(this_class) {
                    // Add relationship to parent class
                    const type_path = '/containers/'+containerID+'/metatype_relationship_pairs';
                    const relationship = relationship_map.get('inheritance');
                    // Don't add parent relationship for root entity
                    if (!this_class.parent_id.match(/owl#Thing/)) {
                        const data = JSON.stringify({
                            name: this_class["name"] + ' : child of : ' + class_map.get(this_class.parent_id).name,
                            description: relationship.description,
                            origin_metatype_id: this_class.db_id,
                            destination_metatype_id: class_map.get(this_class.parent_id).db_id,
                            relationship_id: relationship.db_id,
                            relationship_type: "many:one"
                        });
                        // console.log('Parent: ' + data)
                        property_data.push(worker.apiCall(hostname, port, type_path, data));
                    }

                    // Add primitive properties and other relationships
                    this_class.properties.forEach(async function(property) {
                        if (property.property_type == 'primitive') {
                            const type_path = '/containers/'+containerID+'/metatypes/'+this_class.db_id+'/keys';
                            const data_prop = data_property_map.get(property.value);
                            let property_options = [""];
                            if (data_prop.dp_enum != null) {
                                property_options = data_prop.dp_enum;
                            }
                            // Leave 0 for unbounded and 'some' restriction type
                            let min = 0;
                            let max = 0;
                            const cardinality_quantity = parseInt(property.cardinality_quantity);
                            switch(property.restriction_type) {
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
                            const data = JSON.stringify({
                                name: this_class["name"] + ' : ' + data_prop.name,
                                required: false,
                                property_name: data_prop.name,
                                description: data_prop.description,
                                data_type: property.target,
                                cardinality: 1,
                                validation: {
                                    regex: "",
                                    min: min,
                                    max: max
                                },
                                unique: true,
                                options: property_options,
                                defaultValue: ""
                            });
                            // console.log('Primitive: ' + data)
                            property_data.push(worker.apiCall(hostname, port, type_path, data));
                        } else if (property.property_type == 'relationship') {
                            const type_path = '/containers/'+containerID+'/metatype_relationship_pairs';
                            const relationship = relationship_map.get(property.value);
                            const data = JSON.stringify({
                                name: this_class["name"] + ' : ' + relationship.name + ' : ' + class_map.get(property.target).name,
                                description: relationship.description,
                                origin_metatype_id: this_class.db_id,
                                destination_metatype_id: class_map.get(property.target).db_id,
                                relationship_id: relationship.db_id,
                                relationship_type: "many:many"
                            });
                            // console.log('Relationship: ' + data)
                            property_data.push(worker.apiCall(hostname, port, type_path, data));
                        }
                    })
                })
                await Promise.all(property_data).then(buffer_data => {
                    console.log('Ontology creation is complete!')
                    // console.log(buffer_data)
                });
                
            })
            .catch(function (err) {
                console.error(err);
            })
            .then(function () {
                // Required to terminate pool and end script
                pool.terminate();
            });
    }
});
