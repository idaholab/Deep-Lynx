/* eslint-disable @typescript-eslint/ban-types */
import {BaseDomainClass, NakedDomainClass} from '../../../common_classes/base_domain_class';
import {
    IsArray,
    IsBoolean,
    IsDate,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    MinLength,
    registerDecorator,
    ValidateNested,
    ValidationOptions
} from 'class-validator';
import Result from '../../../common_classes/result';
import Authorization from '../../access_management/authorization/authorization';
import Logger from '../../../services/logger';
import {Exclude, Type} from 'class-transformer';
import Metatype from './metatype';
import MetatypeRelationship from './metatype_relationship';
import MetatypeKey from './metatype_key';
import MetatypeRelationshipKey from './metatype_relationship_key';
import MetatypeRelationshipPair from './metatype_relationship_pair';
import MetatypeInheritance from './metatype_inheritance';
import TypeMapping from '../etl/type_mapping';
import {v4 as uuidv4} from 'uuid';
import {DataSource} from "../../../interfaces_and_impl/data_warehouse/import/data_source";

/*
    ContainerConfig allows the user and system to toggle features at a container
    level. Example would be using this configuration to toggle whether or not the
    container would insert records into the nodes/edges shadow table.
 */
export class ContainerConfig extends NakedDomainClass {
    @IsBoolean()
    data_versioning_enabled = true;

    @IsBoolean()
    @IsOptional()
    ontology_versioning_enabled? = false;

    @IsOptional()
    enabled_data_sources?: string[] = [];

    @IsOptional()
    data_source_templates?: DataSourceTemplate[] = [];

    constructor(input?: {
        data_versioning_enabled: boolean;
        ontology_versioning_enabled?: boolean;
        enabled_data_sources?: string[];
        data_source_templates?: DataSourceTemplate[];
    }) {
        super();

        if (input) {
            this.ontology_versioning_enabled = input.ontology_versioning_enabled;
            this.data_versioning_enabled = input.data_versioning_enabled;
            if (input.enabled_data_sources) this.enabled_data_sources = input.enabled_data_sources;
            if (input.data_source_templates) this.data_source_templates = input.data_source_templates;
        }
    }
}

/*
    Container represents a container record in the DeepLynx database and the various
    validations required for said record to be considered valid.
 */
export default class Container extends BaseDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsOptional()
    @IsBoolean()
    archived?: boolean;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    name = '';

    @IsNotEmpty()
    @IsString()
    description = '';

    @ValidateNested()
    @Type(() => ContainerConfig)
    config?: ContainerConfig;

    constructor(input: {name: string; description: string; config?: ContainerConfig; id?: string}) {
        super();

        // we have to do this because class-transformer doesn't know to create
        // an object with our specifications for the parameter
        if (input) {
            this.name = input.name;
            this.description = input.description;
            input.config ? (this.config = input.config) : (this.config = new ContainerConfig());
            if (input.id) this.id = input.id;
        }
    }

    // setPermissions creates or repairs the Casbin entries for this container
    // this allows for access control
    async setPermissions(): Promise<Result<boolean>> {
        if (!this.id) return new Promise((resolve) => resolve(Result.Failure('container instance lacking id')));

        const e = await Authorization.enforcer();

        const containerUserRead = await e.addPolicy('user', this.id, 'containers', 'read');
        if (!containerUserRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyUserRead = await e.addPolicy('user', this.id, 'ontology', 'read');
        if (!ontologyUserRead) Logger.error(`unable to add editor policy to new container`);

        const dataUserRead = await e.addPolicy('user', this.id, 'data', 'read');
        if (!dataUserRead) Logger.error(`unable to add editor policy to new container`);

        // editor
        const containerRead = await e.addPolicy('editor', this.id, 'containers', 'read');
        if (!containerRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyRead = await e.addPolicy('editor', this.id, 'ontology', 'write');
        if (!ontologyRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyWrite = await e.addPolicy('editor', this.id, 'ontology', 'read');
        if (!ontologyWrite) Logger.error(`unable to add editor policy to new container`);

        const dataRead = await e.addPolicy('editor', this.id, 'data', 'write');
        if (!dataRead) Logger.error(`unable to add editor policy to new container`);

        const dataWrite = await e.addPolicy('editor', this.id, 'data', 'read');
        if (!dataWrite) Logger.error(`unable to add editor policy to new container`);

        // admin
        const userRead = await e.addPolicy('admin', this.id, 'users', 'read');
        if (!userRead) Logger.error(`unable to add admin policy to new container`);

        const userWrite = await e.addPolicy('admin', this.id, 'users', 'write');
        if (!userWrite) Logger.error(`unable to add admin policy to new container`);

        const containerAdminWrite = await e.addPolicy('admin', this.id, 'containers', 'write');
        if (!containerAdminWrite) Logger.error(`unable to add editor policy to new container`);

        const containerAdminRead = await e.addPolicy('admin', this.id, 'containers', 'read');
        if (!containerAdminRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyAdminRead = await e.addPolicy('admin', this.id, 'ontology', 'write');
        if (!ontologyAdminRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyAdminWrite = await e.addPolicy('admin', this.id, 'ontology', 'read');
        if (!ontologyAdminWrite) Logger.error(`unable to add editor policy to new container`);

        const dataAdminRead = await e.addPolicy('admin', this.id, 'data', 'write');
        if (!dataAdminRead) Logger.error(`unable to add editor policy to new container`);

        const dataAdminWrite = await e.addPolicy('admin', this.id, 'data', 'read');
        if (!dataAdminWrite) Logger.error(`unable to add editor policy to new container`);

        return new Promise((resolve) => resolve(Result.Success(true)));
    }
}

export class ContainerAlert extends NakedDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    container_id?: string;

    @IsString()
    @IsIn(['info', 'warning', 'error'])
    type?: string;

    @IsString()
    message?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    created_at?: Date;

    @IsOptional()
    @IsString()
    created_by?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    acknowledged_at?: Date;

    @IsOptional()
    @IsString()
    acknowledged_by?: string;

    constructor(input: {
        containerID: string;
        type: 'info' | 'warning' | 'error';
        message: string;
        createdBy?: string;
        acknowledgedAt?: Date;
        acknowledgedBy?: string;
    }) {
        super();

        if (input) {
            this.container_id = input.containerID;
            this.type = input.type;
            this.message = input.message;
            if (input.acknowledgedAt) this.acknowledged_at = input.acknowledgedAt;
            if (input.acknowledgedBy) this.acknowledged_by = input.acknowledgedBy;
            if (input.createdBy) this.created_by = input.createdBy;
        }
    }
}

export class ContainerExport extends NakedDomainClass {
    @IsOptional()
    @IsNumber()
    version?: number;

    @IsOptional()
    metatypes?: Metatype[];

    @IsOptional()
    metatype_keys?: MetatypeKey[];

    @IsOptional()
    relationships?: MetatypeRelationship[];

    @IsOptional()
    relationship_keys?: MetatypeRelationshipKey[];

    @IsOptional()
    relationship_pairs?: MetatypeRelationshipPair[];

    @IsOptional()
    metatype_inheritance?: MetatypeInheritance[];

    @IsOptional()
    data_sources?: DataSource[];

    @IsOptional()
    type_mappings?: TypeMapping[];

    constructor(input?: {
        version?: number;
        metatypes?: Metatype[];
        metatype_keys?: MetatypeKey[];
        relationships?: MetatypeRelationship[];
        relationship_keys?: MetatypeRelationshipKey[];
        relationship_pairs?: MetatypeRelationshipPair[];
        metatype_inheritance?: MetatypeInheritance[];
    }) {
        super();
        if (input) {
            this.version = input.version;
            this.metatypes = input.metatypes;
            this.metatype_keys = input.metatype_keys;
            this.relationships = input.relationships;
            this.relationship_keys = input.relationship_keys;
            this.relationship_pairs = input.relationship_pairs;
            if (input.metatype_inheritance) this.metatype_inheritance = input.metatype_inheritance;
        }
    }
}

export class ContainerPermissionSet extends NakedDomainClass {
    @IsOptional()
    @IsArray()
    containers: string[] | undefined;

    @IsOptional()
    @IsArray()
    ontology: string[] | undefined;

    @IsOptional()
    @IsArray()
    data: string[] | undefined;

    @IsOptional()
    @IsArray()
    users: string[] | undefined;

    constructor(input: {containers?: string[]; ontology?: string[]; data?: string[]; users?: string[]}) {
        super();
        if (input) {
            this.containers = input.containers;
            this.ontology = input.ontology;
            this.data = input.data;
            this.users = input.users;
        }
    }

    async writePermissions(userID: string, containerID: string): Promise<Result<boolean>> {
        const e = await Authorization.enforcer();

        await e.loadPolicy();

        await e.removePolicy(userID, containerID, 'containers', 'read');
        await e.removePolicy(userID, containerID, 'containers', 'write');
        await e.removePolicy(userID, containerID, 'ontology', 'read');
        await e.removePolicy(userID, containerID, 'ontology', 'write');
        await e.removePolicy(userID, containerID, 'data', 'read');
        await e.removePolicy(userID, containerID, 'data', 'write');
        await e.removePolicy(userID, containerID, 'users', 'read');
        await e.removePolicy(userID, containerID, 'users', 'write');

        Logger.info(`removed all casbin policies for user ID ${userID}`);

        if (this.containers && this.containers.length > 0) {
            this.containers.forEach((permission) => {
                e.addPolicy(userID, containerID, 'containers', permission).catch((e) =>
                    Logger.error(`error while setting container permissions for user ${userID}: ${e}`),
                );
                Logger.info(`added casbin policy container ${permission} for user ID ${userID}`);
            });
        }

        if (this.ontology && this.ontology.length > 0) {
            this.ontology.forEach((permission) => {
                e.addPolicy(userID, containerID, 'ontology', permission).catch((e) =>
                    Logger.error(`error while setting container permissions for user ${userID}: ${e}`),
                );
                Logger.info(`added casbin policy ontology ${permission} for user ID ${userID}`);
            });
        }

        if (this.data && this.data.length > 0) {
            this.data.forEach((permission) => {
                e.addPolicy(userID, containerID, 'data', permission).catch((e) =>
                    Logger.error(`error while setting container permissions for user ${userID}: ${e}`),
                );
                Logger.info(`added casbin policy data ${permission} for user ID ${userID}`);
            });
        }

        if (this.users && this.users.length > 0) {
            this.users.forEach((permission) => {
                e.addPolicy(userID, containerID, 'users', permission).catch((e) =>
                    Logger.error(`error while setting container permissions for user ${userID}: ${e}`),
                );
                Logger.info(`added casbin policy users ${permission} for user ID ${userID}`);
            });
        }

        return Promise.resolve(Result.Success(true));
    }
}

export class DataSourceTemplate extends NakedDomainClass{
    @IsOptional()
    @IsUUID()
    id?: string;

    @IsString()
    name?: string;

    @CustomFieldEncrypted()
    @CustomFieldRequired()
    @Type(() => CustomTemplateField)
    @ValidateNested({each: true})
    custom_fields?: CustomTemplateField[]

    // "redirect_address" and "authorized" will be used for auth redirects to authorize the given adapter
    // to access this container. These two fields may be removed later when a better adapter auth system is
    // put into place, but we need to leave them here for the time being.
    @IsOptional()
    @IsString()
    redirect_address?: string;

    @IsBoolean()
    authorized = false;

    constructor(input?: {
        id?: string;
        name: string;
        custom_fields?: CustomTemplateField[]
        redirect_address?: string;
    }) {
        super();
        if (input) {
            this.id = input.id ? input.id : uuidv4();
            this.name = input.name;
            if (input.custom_fields) this.custom_fields = input.custom_fields;
            if (input.redirect_address) this.redirect_address = input.redirect_address;
        }
    }
}

export function CustomFieldRequired(validationOptions?: ValidationOptions) {
    return (object: Object, propertyName: string) => {
        registerDecorator({
            name: 'All required fields must have a value present',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any) {
                    const fields = value as CustomTemplateField[];

                    // Skip validation if fields are not defined or empty
                    if (!fields || fields.length === 0) return true;

                    for (const field of fields) {
                        if (field.required === true && field.value === undefined) {
                            return false;
                        }
                    }

                    return true;
                }
            }
        })
    }
}

export function CustomFieldEncrypted(validationOptions?: ValidationOptions) {
    return (object: Object, propertyName: string) => {
        registerDecorator({
            name: 'All encrypted fields must be required and have a value present',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any) {
                    const fields = value as CustomTemplateField[];

                    // Skip validation if fields are not defined or empty
                    if (!fields || fields.length === 0) return true;

                    for (const field of fields) { // fail validation if a field needs to be encrypted but is not required or unspecified
                        if (field.encrypt === true && !field.required) {
                            return false;
                        }
                    }

                    return true;
                }
            }
        })
    }
}

export class CustomTemplateField {
    name?: string;

    @Exclude({ toPlainOnly: true })
    value?: string;

    encrypt?: boolean;

    required?: boolean;

    constructor(
        name?: string,
        value?: string,
        encrypt?: boolean,
        required?: boolean
    ) {
        this.name = name;
        this.value = value;
        this.encrypt = encrypt;
        this.required = required;
    }
}