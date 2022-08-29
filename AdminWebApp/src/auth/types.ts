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
