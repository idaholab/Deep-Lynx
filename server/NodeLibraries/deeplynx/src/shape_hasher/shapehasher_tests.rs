#[cfg(test)]
mod main_tests {
    use crate::shape_hasher::Options;
    use crate::shape_hasher::hash;
    use std::fs;
    use std::collections::HashSet;
    use serde::{Deserialize, Serialize};

    #[test]
    fn nested_array() {
        let file_path = "./test_files/shape_hasher/nestedArrayTest.json";

        // Read the file's contents into a String
        let json_string = fs::read_to_string(file_path).expect("Failed to read file");

        let test_payload_different_data_types: Vec<ManufacturingItem> = serde_json::from_str(&json_string).expect("Failed to parse JSON");
        let mut regular_set = HashSet::new();

        for object in &test_payload_different_data_types {
            let object_as_string = serde_json::to_string(object).expect("Failed to serialize DataObject to string");
            regular_set.insert(hash(object_as_string, Options {
                stop_nodes: None, 
                value_nodes: None,
            }).unwrap());
        }

        assert_eq!(regular_set.len(), 2);
    }

    #[test]
    fn stop_node_test() {
        let file_path = "./test_files/shape_hasher/stopNodeTester.json";

        // Read the file's contents into a String
        let json_string = fs::read_to_string(file_path).expect("Failed to read file");
        let test_payload_different_data_types: Vec<DataObjectStopNodes> = serde_json::from_str(&json_string).expect("Failed to parse JSON");
        let mut regular_set = HashSet::new();

        for object in &test_payload_different_data_types {
            let stop_node: Vec<String> = vec!["days".to_string(), "nickname".to_string()];
            let object_as_string = serde_json::to_string(object).expect("Failed to serialize DataObject to string");
            regular_set.insert(hash(object_as_string, Options {
                stop_nodes: Some(stop_node), 
                value_nodes: None,
            }).unwrap());
        }

        assert_eq!(regular_set.len(), 1);
    }

    #[test]
    fn value_node_test() {
        let file_path = "./test_files/shape_hasher/valueNodeTester.json";

        // Read the file's contents into a String
        let json_string = fs::read_to_string(file_path).expect("Failed to read file");

        let test_payload_different_data_types: Vec<Container> = serde_json::from_str(&json_string).expect("Failed to parse JSON");
        let mut regular_set = HashSet::new();

        for object in &test_payload_different_data_types {
            let value_node: Vec<String> = vec!["variousThings.1.name".to_string()];
            let object_as_string = serde_json::to_string(object).expect("Failed to serialize DataObject to string");
            regular_set.insert(hash(object_as_string, Options {
                stop_nodes: None, 
                value_nodes: Some(value_node),
            }).unwrap());
        }

        assert_eq!(regular_set.len(), 2);
    }

    #[test]
    fn multiple_objectArray_test() {
        let file_path = "./test_files/shape_hasher/multipleObjectArrayTest.json";

        // Read the file's contents into a String
        let json_string = fs::read_to_string(file_path).expect("Failed to read file");

        let test_payload_different_data_types: Vec<ManufacturingProcessObject> = serde_json::from_str(&json_string).expect("Failed to parse JSON");
        let mut regular_set = HashSet::new();

        for object in &test_payload_different_data_types {
            let object_as_string = serde_json::to_string(object).expect("Failed to serialize DataObject to string");
            regular_set.insert(hash(object_as_string, Options {
                stop_nodes: None, 
                value_nodes: None,
            }).unwrap());
        }

        assert_eq!(regular_set.len(), 3);
    }

    #[test]
    fn complex_value_node_test() {
        let file_path = "./test_files/shape_hasher/complexValueNodeTester.json";

        // Read the file's contents into a String
        let json_string = fs::read_to_string(file_path).expect("Failed to read file");

        let test_payload_different_data_types: Vec<CarMaintenanceRecord> = serde_json::from_str(&json_string).expect("Failed to parse JSON");
        let mut regular_set = HashSet::new();

        for object in &test_payload_different_data_types {
            let value_node: Vec<String> = vec!["car.id".to_string()];
            let object_as_string = serde_json::to_string(object).expect("Failed to serialize DataObject to string");
            regular_set.insert(hash(object_as_string, Options {
                stop_nodes: None, 
                value_nodes: Some(value_node),
            }).unwrap());
        }

        assert_eq!(regular_set.len(), 2);
    }

    #[test]
    fn multipe_same_simplifier_test() {
        let file_path = "./test_files/shape_hasher/multipleSameSimplifierTest.json";

        // Read the file's contents into a String
        let json_string = fs::read_to_string(file_path).expect("Failed to read file");

        let test_payload_different_data_types: Vec<Vec<Item>> = serde_json::from_str(&json_string).expect("Failed to parse JSON");
        let mut regular_set = HashSet::new();

        for object in &test_payload_different_data_types {
            let object_as_string = serde_json::to_string(object).expect("Failed to serialize DataObject to string");
            regular_set.insert(hash(object_as_string, Options {
                stop_nodes: None, 
                value_nodes: None,
            }).unwrap());
        }

        assert_eq!(regular_set.len(), 1);
    }

    #[test]
    fn simple_test() {
        let file_path = "./test_files/shape_hasher/simpleTest.json";

        // Read the file's contents into a String
        let json_string = fs::read_to_string(file_path).expect("Failed to read file");

        let test_payload_different_data_types: Vec<DataObject> = serde_json::from_str(&json_string).expect("Failed to parse JSON");
        let mut regular_set = HashSet::new();

        for object in &test_payload_different_data_types {
            let object_as_string = serde_json::to_string(object).expect("Failed to serialize DataObject to string");
            regular_set.insert(hash(object_as_string, Options {
                stop_nodes: None, 
                value_nodes: None,
            }).unwrap());
        }

        assert_eq!(regular_set.len(), 1);
    }

    #[test]
    fn data_type_test() {
        let file_path = "./test_files/shape_hasher/dataTypeTest.json";

        // Read the file's contents into a String
        let json_string = fs::read_to_string(file_path).expect("Failed to read file");
        let test_payload_different_data_types: Vec<DataObject> = serde_json::from_str(&json_string).expect("Failed to parse JSON");
        let mut regular_set = HashSet::new();

        for object in &test_payload_different_data_types {
            let object_as_string = serde_json::to_string(object).expect("Failed to serialize DataObject to string");
            regular_set.insert(hash(object_as_string, Options {
                stop_nodes: None, 
                value_nodes: None,
            }).unwrap());
        }

        assert_eq!(regular_set.len(), 3);
    }

    //below two structs are for the simple and data type test cases
    #[derive(Debug, Serialize, Deserialize)]
    struct DataObject {
        objectId: u32,
        name: NameVariant,
        creationDate: String,
    }
    
    #[derive(Debug, Serialize, Deserialize, PartialEq, Eq, Hash)]
    #[serde(untagged)]
    enum NameVariant {
        Bool(bool),
        Str(String),
        Int(u32),
    }

    //below structs are used for multiple object array test
    #[derive(Debug, Serialize, Deserialize)]
    struct ManufacturingProcessObject {
        ManufacturingProcess: ManufacturingDetails,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct ManufacturingDetails {
        keys: ManufacturingKeys,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct ManufacturingKeys {
        id: String,
        name: String,
        description: String,
        array: Vec<serde_json::Value>,  // Using Value here since array contains mixed types
    }

    //below structs are used for complex value node test
    #[derive(Debug, Serialize, Deserialize)]
    struct CarMaintenanceRecord {
        car: Car,
        car_maintenance: CarMaintenance,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct Car {
        id: String,
        name: String,
        manufacturer: Manufacturer,
        tire_pressures: Vec<TirePressure>,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct Manufacturer {
        id: String,
        name: String,
        location: String,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct TirePressure {
        id: String,
        measurement_unit: String,
        measurement: f64,
        measurement_name: String,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct CarMaintenance {
        id: String,
        name: String,
        start_date: String,
        average_visits_per_year: u32,
        maintenance_entries: Vec<MaintenanceEntry>,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct MaintenanceEntry {
        id: u32,
        check_engine_light_flag: bool,
        #[serde(rename = "type")] // Renaming the field during deserialization
        type_: String,
        parts_list: Vec<Part>,
    }

    #[derive(Debug, Serialize, Deserialize)]
    struct Part {
        id: String,
        name: String,
        price: f64,
        quantity: u32,
    }

    //below structs are used in nested array test
    #[derive(Debug, Deserialize, Serialize)]
    struct ManufacturingItem {
        ManufacturingProcess: ManufacturingProcess,
    }

    #[derive(Debug, Deserialize, Serialize)]
    struct ManufacturingProcess {
        keys: Key,
        children: Children,
    }

    #[derive(Debug, Deserialize, Serialize)]
    struct Key {
        id: String,
        name: String,
        description: String,
    }

    #[derive(Debug, Deserialize, Serialize)]
    struct Children {
        ArrayOne: Vec<ArrayItem>,
        ArrayTwo: Vec<ArrayItem>,
    }

    #[derive(Debug, Deserialize, Serialize)]
    struct ArrayItem {
        id: String,
    }

    //below structs are used in stop node test
    #[derive(Debug, Deserialize, Serialize)]
    struct DataObjectStopNodes {
        objectId: u32,
        name: String,
        nickname: Option<String>,
        creationDate: String,
        days: Option<u32>,
    }

    //below tests are used in value node test
    #[derive(Debug, Deserialize, Serialize)]
    struct Container {
        variousThings: Vec<Thing>,
    }

    #[derive(Debug, Deserialize, Serialize)]
    struct Thing {
        id: u32,
        name: String,
        awesome: Option<bool>,
    }

    //below struct used in multiple same simplifier test
    #[derive(Debug, Deserialize, Serialize)]
    struct Item {
        id: String,
    }
}