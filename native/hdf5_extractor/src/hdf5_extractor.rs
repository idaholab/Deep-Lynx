use anyhow::Result;
use hdf5::{Dataset, File, Group};
use serde_derive::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;

#[derive(Serialize, Deserialize, Debug)]
pub struct HDF5Info {
    pub groups: HashMap<String, Vec<String>>,
    pub datasets: HashMap<String, Vec<String>>,
}

pub fn extract_hdf5_info(file_path: String) -> Result<Value> {
    let file = File::open(file_path)?;

    let root_group = file.group("/")?;
    let group_names = collect_group_names(&root_group)?;

    let mut hdf5_info = HDF5Info {
        groups: HashMap::new(),
        datasets: HashMap::new(),
    };

    collect_groups_and_datasets(&file, &group_names, &mut hdf5_info)?;

    let hdf5_info_json: Value = serde_json::to_value(&hdf5_info)?;

    Ok(hdf5_info_json)
}

fn collect_groups_and_datasets(
    file: &File,
    group_names: &[String],
    hdf5_info: &mut HDF5Info,
) -> Result<()> {
    for group_name in group_names {
        let group = file.group(group_name)?;
        let group_attrs = collect_attributes_of_group(&group)?;
        hdf5_info.groups.insert(group_name.clone(), group_attrs);

        let mut dataset_names = Vec::new();
        collect_dataset_names(&group, &mut dataset_names)?;

        for dataset_name in dataset_names {
            let dataset = file.dataset(&dataset_name)?;
            let dataset_attrs = collect_attributes_of_dataset(&dataset)?;
            hdf5_info.datasets.insert(dataset_name, dataset_attrs);
        }
    }
    Ok(())
}

fn collect_group_names(group: &Group) -> Result<Vec<String>> {
    let mut names = Vec::new();
    for member_name in group.member_names()? {
        if let Ok(subgroup) = group.group(&member_name) {
            let full_name = subgroup.name();
            names.push(full_name.to_string());
            names.extend(collect_group_names(&subgroup)?);
        }
    }
    Ok(names)
}

fn collect_dataset_names(group: &Group, names: &mut Vec<String>) -> Result<()> {
    for dataset in group.datasets()? {
        names.push(dataset.name());
    }
    Ok(())
}

fn collect_attributes_of_group(group: &Group) -> Result<Vec<String>> {
    let mut attrs = Vec::new();
    for name in group.attr_names()? {
        attrs.push(name);
    }
    Ok(attrs)
}

fn collect_attributes_of_dataset(dataset: &Dataset) -> Result<Vec<String>> {
    let mut attrs = Vec::new();
    for name in dataset.attr_names()? {
        attrs.push(name);
    }
    Ok(attrs)
}
