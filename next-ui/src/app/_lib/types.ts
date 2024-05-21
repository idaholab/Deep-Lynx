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

export type UserT = {
    id: string;
    role: string;
    identity_provider_id: string;
    identity_provider: string;
    display_name: string;
    email: string;
    active: boolean;
    admin: boolean;
    permissions: string[][];
    iat: number;
    exp: number;
    token: string;
};

export type KeyPairT = {
    user_id: string;
    key: string;
    secret_raw: string;
};
