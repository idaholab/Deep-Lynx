/* eslint-disable @typescript-eslint/ban-types */
import {BaseDomainClass, NakedDomainClass} from '../../../common_classes/base_domain_class';
import {IsBoolean, IsDate, IsIn, IsNotEmpty, IsOptional, IsString, MinLength, ValidateNested} from 'class-validator';
import Result from '../../../common_classes/result';
import Authorization from '../../access_management/authorization/authorization';
import Logger from '../../../services/logger';
import {Type} from 'class-transformer';

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

    constructor(input?: {data_versioning_enabled: boolean; ontology_versioning_enabled?: boolean}) {
        super();

        if (input) {
            this.ontology_versioning_enabled = input.ontology_versioning_enabled;
            this.data_versioning_enabled = input.data_versioning_enabled;
        }
    }
}

/*
    Container represents a container record in the Deep Lynx database and the various
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

    constructor(input: {name: string; description: string; config?: ContainerConfig}) {
        super();

        // we have to do this because class-transformer doesn't know to create
        // an object with our specifications for the parameter
        if (input) {
            this.name = input.name;
            this.description = input.description;
            input.config ? (this.config = input.config) : (this.config = new ContainerConfig());
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
    @IsIn(['information', 'warning', 'error'])
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
        type: 'information' | 'warning' | 'error';
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
