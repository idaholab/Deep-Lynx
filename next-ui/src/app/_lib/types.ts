export type ContainerT = {
    id: string;
    name: string;
    description: string;
    config: {
        data_versioning_enabled: boolean;
        ontology_versioning_enabled: boolean;
        enabled_data_sources: string[];
    };
    created_at: string;
    modified_at: string;
    created_by: string;
    modified_by: string;
};