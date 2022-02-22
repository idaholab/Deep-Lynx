/* eslint-disable @typescript-eslint/ban-types */
import {BaseDomainClass} from '../../common_classes/base_domain_class';
import {
    IsArray,
    IsBoolean,
    IsEmail,
    IsIn,
    IsOptional,
    IsString,
    MinLength,
    registerDecorator,
    ValidateIf,
    ValidationArguments,
    ValidationOptions,
} from 'class-validator';
import Config from '../../services/config';
import {v4 as uuidv4} from 'uuid';
import {Exclude, Expose, plainToClass, Transform, Type} from 'class-transformer';
import Container from '../data_warehouse/ontology/container';
import bcrypt from 'bcryptjs';
import Result from '../../common_classes/result';
const validator = require('validator');

/*
 User represents a registered Deep Lynx user along with their registered API
 KeyPairs and information regarding password reset and email validation
*/
export class User extends BaseDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    @IsIn(['saml_adfs', 'username_password'])
    identity_provider = 'username_password';

    @ValidateIf((o) => o.identity_provider !== 'username_password')
    @IsString()
    identity_provider_id?: string;

    @IsString()
    @MinLength(1)
    display_name = '';

    @IsEmail()
    email = '';

    @IsString()
    @IsOptional()
    @Exclude({toPlainOnly: true}) // we never want this to show up in a return
    password?: string;

    @IsBoolean()
    admin = false;

    @IsBoolean()
    active = true;

    @IsBoolean()
    reset_required = false;

    @IsString()
    @IsOptional()
    @Exclude({toPlainOnly: true}) // we never want this to show up in a return
    reset_token?: string;

    @IsBoolean()
    email_valid = false;

    @IsString()
    @IsOptional()
    @Exclude({toPlainOnly: true}) // we never want this to show up in a return
    email_validation_token?: string;

    @IsArray()
    permissions: string[][] = [];

    @IsArray()
    roles: string[] = [];

    // These are the user's registered API Key/Secret pairs and are used to gain
    // an access token for authentication
    keys: KeyPair[] | undefined;
    // for tracking removed keys for update
    #removedKeys: KeyPair[] | undefined;

    constructor(input: {
        identity_provider: string;
        identity_provider_id?: string;
        display_name: string;
        email: string;
        password?: string;
        admin?: boolean;
        active?: boolean;
        permissions?: string[][];
        roles?: string[];
        id?: string;
    }) {
        super();

        if (input) {
            this.identity_provider = input.identity_provider;
            if (input.identity_provider_id) this.identity_provider_id = input.identity_provider_id;
            this.display_name = input.display_name;
            this.email = input.email;
            if (input.password) this.password = input.password;
            if (input.admin) this.admin = input.admin;
            if (input.active) this.active = input.active;
            if (input.id) this.id = input.id;
            if (input.permissions) this.permissions = input.permissions;
            if (input.roles) this.roles = input.roles;
        }
    }
    get removedKeys() {
        return this.#removedKeys;
    }

    // Please use these operations when manipulating the keypairs of a user
    // even though the KeyPair property is not private, avoid mutating it - it's
    // not private due to limitations with the class-transformer package
    addKey(...keys: KeyPair[]) {
        if (!this.keys) this.keys = [];

        keys.forEach((key) => (key.user_id = this.id!));
        this.keys.push(...keys);
    }

    replaceKeys(keys: KeyPair[], removedKeys?: KeyPair[]) {
        this.keys = keys;
        if (removedKeys) this.#removedKeys = removedKeys;
    }

    // removeKeys will remove the first matching key, you must save the object
    // for changes to take place
    removeKey(...keys: KeyPair[] | string[]) {
        if (!this.keys) this.keys = [];
        if (!this.#removedKeys) this.#removedKeys = [];
        for (const key of keys) {
            if (typeof key === 'string') {
                this.keys = this.keys.filter((k) => {
                    if (k.key !== key) {
                        return true;
                    }
                    this.#removedKeys!.push(k);
                    return false;
                }, this);
            } else {
                // if it's not a string, we can safely assume it's the type
                this.keys = this.keys.filter((k) => {
                    if (k.key !== key.key) {
                        return true;
                    }
                    this.#removedKeys!.push(k);
                    return false;
                }, this);
            }
        }
    }
}

/*
 KeyPair represents an API Key/Secret combination used by outside services to
 gain an access token for authentication against Deep Lynx
*/
export class KeyPair extends BaseDomainClass {
    @IsString()
    key: string = Buffer.from(uuidv4()).toString('base64');

    // we set the raw secret, the saving will handle encryption - and checking
    // for the encrypted, saved secret will allow use to verify it's saved
    @IsString()
    secret_raw: string = Buffer.from(uuidv4()).toString('base64');

    @IsString()
    user_id?: string;

    @IsOptional()
    @Exclude({toPlainOnly: true}) // we never want to show the secret when this is serialized to an object
    secret?: string;

    constructor(userID?: string) {
        super();
        if (userID) this.user_id = userID;
    }

    async setSecret(): Promise<Result<boolean>> {
        try {
            const hashedSecret = await bcrypt.hash(this.secret_raw, 10);
            this.secret = hashedSecret;

            return Promise.resolve(Result.Success(true));
        } catch (error: any) {
            return Promise.resolve(Result.Failure(`unable to hash secret ${error.toString()}`));
        }
    }
}

// here are some additional user classes for convenience - this allowed us to
// more easily accept specific data structures as payloads from the http_server layer

// request for a user to finalize a password reset process
export class ResetUserPasswordPayload extends BaseDomainClass {
    @IsEmail()
    email?: string;
    @IsString()
    token?: string;
    @IsString()
    new_password?: string;

    constructor(input?: {email?: string; token?: string; newPassword?: string}) {
        super();
        if (input) {
            if (input.email) this.email = input.email;
            if (input.token) this.token = input.token;
            if (input.newPassword) this.new_password = input.newPassword;
        }
    }
}

// request for assigning roles to a user within the context of a container
export class AssignUserRolePayload extends BaseDomainClass {
    @IsString()
    user_id?: string;
    @IsString()
    container_id?: string;
    @IsString()
    @IsIn(['editor', 'user', 'admin'])
    role_name?: string;

    constructor(input?: {userID?: string; containerID?: string; roleName?: string}) {
        super();
        if (input) {
            if (input.userID) this.user_id = input.userID;
            if (input.containerID) this.container_id = input.containerID;
            if (input.roleName) this.role_name = input.roleName;
        }
    }
}

// this serves as both payload and data structure for the container invite table
export class ContainerUserInvite extends BaseDomainClass {
    @IsString()
    @IsOptional()
    id?: string;

    @IsEmail()
    email = '';

    @IsString()
    origin_user?: string;

    @IsString()
    token?: string = '';

    // because the end user of this class often needs more information about
    // the container for the invite email, we're going to include and load
    // the full container class instead of just doing the ID. The repository
    // should load the relationship on demand
    @ContainerID({message: 'Container must have valid ID'})
    @Expose({name: 'container_id', toClassOnly: true})
    @Transform(
        ({value}) => {
            const container = plainToClass(Container, {});
            container.id = value;
            return container;
        },
        {toClassOnly: true},
    )
    container: Container | undefined;

    @Type(() => Date)
    issued?: Date;

    constructor(input: {email: string; originUser?: User; token?: string; container: string | Container}) {
        super();

        if (input) {
            this.email = input.email;
            if (input.originUser) this.origin_user = input.originUser.id!;
            if (input.token) this.token = input.token;
            if (input.container instanceof Container) {
                this.container = input.container;
            } else {
                this.container = plainToClass(Container, {
                    id: input.container,
                });
            }
        }
    }
}

// use wisely as the ID is generated each time it's called - this is mainly used
// in testing and if, for whatever reason, you're running Deep Lynx with only
// basic authentication or no authentication on the http_server
export const SuperUser = new User({
    id: '0',
    identity_provider: 'username_password',
    display_name: 'Super User',
    email: Config.superuser_email,
    password: Config.superuser_password,
    active: true,
    admin: true,
});

/*
 These final operations are class-validator specific property validations
*/
export function UserID(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'UserID',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return value instanceof User && typeof value.id === 'string';
                },
            },
        });
    };
}

// we have to copy the container validator as to avoid cyclical imports
export function ContainerID(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'ContainerID',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return value instanceof Container && typeof value.id === 'string';
                },
            },
        });
    };
}
