import {BaseDomainClass} from "../base_domain_class";
import {IsArray, IsBoolean, IsDate, IsEmail, IsIn, IsOptional, IsString, IsUUID, MinLength} from "class-validator";
import Config from "../services/config"
import uuid from "uuid";
import {Exclude, Expose, plainToClass, Transform, Type} from "class-transformer";
import {ContainerID} from "../services/validators";
import Container from "../data_warehouse/ontology/container";

export default class User extends BaseDomainClass {
    @IsOptional()
    @IsUUID()
    id?: string

    @IsString()
    @IsIn(["saml_adfs", "username_password"])
    identity_provider: string = "username_password"

    @IsString()
    identity_provider_id?: string

    @IsString()
    @MinLength(1)
    display_name: string = ""

    @IsEmail()
    email: string = ""

    @IsString()
    @Exclude() // we never want this to show up in a return
    password: string = ""

    @IsBoolean()
    admin: boolean = false

    @IsBoolean()
    active: boolean = true

    @IsBoolean()
    reset_required: boolean = false

    @IsString()
    @IsOptional()
    @Exclude() // we never want this to show up in a return
    reset_token?: string

    @IsBoolean()
    email_valid: boolean = false

    @IsString()
    @IsOptional()
    @Exclude() // we never want this to show up in a return
    email_validation_token?: string

    @IsArray()
    permissions: string[][] = []

    keys: KeyPair[] | undefined
    // for tracking removed keys for update
    #removedKeys: KeyPair[] | undefined

    constructor(input: {
        identity_provider: string,
        identity_provider_id?: string,
        display_name: string,
        email: string,
        password: string,
        admin?: boolean,
        active?: boolean,
        id?: string
    }) {
        super();

        if(input) {
            this.identity_provider = input.identity_provider
            if(input.identity_provider_id) this.identity_provider_id = input.identity_provider_id
            this.display_name = input.display_name
            this.email = input.email
            this.password = input.password
            if(input.admin) this.admin = input.admin
            if(input.active) this.active = input.active
            if(input.id) this.id = input.id
        }
    }
    get removedKeys() {
        return this.#removedKeys
    }

    addKey(...keys: KeyPair[]) {
        if(!this.keys) this.keys = []

        keys.forEach(key => key.user_id = this.id!)
        this.keys.push(...keys)
    }

    replaceKeys(keys: KeyPair[], removedKeys?: KeyPair[]) {
        this.keys = keys
        if(removedKeys) this.#removedKeys = removedKeys
    }

    // removeKeys will remove the first matching key, you must save the object
    // for changes to take place
    removeKey(...keys: KeyPair[] | string[]) {
        if(!this.keys) this.keys = []
        if(!this.#removedKeys) this.#removedKeys = []
        for(const key of keys) {
            if(typeof key === 'string') {
                this.keys = this.keys.filter(k => {
                    if(k.key!== key) {
                        return false
                    }
                    this.#removedKeys!.push(k)
                }, this)
            } else {
                // if it's not a string, we can safely assume it's the type
                this.keys = this.keys.filter(k => {
                    if(k.key !== key.key ) {
                        return false
                    }
                    this.#removedKeys!.push(k)
                }, this)
            }
        }
    }
}

export class KeyPair extends BaseDomainClass {
    @IsString()
    key: string = Buffer.from(uuid.v4()).toString('base64')

    // we set the raw secret, the saving will handle encryption - and checking
    // for the encrypted, saved secret will allow use to verify it's saved
    @IsString()
    secret_raw: string = Buffer.from(uuid.v4()).toString('base64')

    @IsString()
    user_id?: string

    @IsOptional()
    @Exclude() // we never want to show the secret when this is serialized to an object
    secret? : string

    constructor(userID?: string) {
        super();
        if(userID) this.user_id = userID
    }
}

// here are some additional user classes and exports for convenience
export class ResetUserPasswordPayload extends BaseDomainClass {
    @IsEmail()
    email?: string
    @IsString()
    token?: string
    @IsString()
    new_password?: string
}

export class AssignUserRolePayload extends BaseDomainClass {
    @IsUUID()
    user_id?: string
    @IsUUID()
    container_id?: string
    @IsString()
    @IsIn(["editor", "user", "admin"])
    role_name?: string
}

// this serves as both payload and data structure for the container invite table
export class ContainerUserInvite extends  BaseDomainClass {
    @IsUUID()
    @IsOptional()
    id?: string

    @IsEmail()
    email: string = ""

    @IsString()
    origin_user?: string

    @IsString()
    token: string = ""

    // because the end user of this class often needs more information about
    // the container for the invite email, we're going to include and load
    // the full container class instead of just doing the ID. The repository
    // should load the relationship on demand
    @ContainerID({message: "Container must have valid ID"})
    @Expose({name: "container_id", toClassOnly: true})
    @Transform(({value}) => {
        const container = plainToClass(Container, {})
        container.id = value
        return container
    }, {toClassOnly: true})
    container: Container | undefined

    @IsDate()
    @Type(() => Date)
    issued?: Date

    constructor(input: {
        email: string,
        originUser?: User,
        token: string,
        container: string | Container
    }) {
        super();

        if(input) {
            this.email = input.email
            if(input.originUser) this.origin_user = input.originUser.id!
            this.token = input.token
            if(input.container instanceof Container) {
                this.container = input.container
            } else {
                this.container  = plainToClass(Container, {id: input.container})
            }
        }
    }
}

export const SuperUser = new User({
    id: uuid.v4(),
    identity_provider: "username_password",
    display_name: "Super User",
    email: Config.superuser_email,
    password: Config.superuser_password,
    active: true,
    admin: true
})
