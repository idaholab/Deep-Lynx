import {BaseDomainClass} from "../../base_domain_class";
import {IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength} from "class-validator";
import Result from "../../result";
import Authorization from "../../user_management/authorization/authorization";
import Logger from "../../services/logger";

export default class Container extends BaseDomainClass {
    @IsOptional()
    @IsUUID()
    id?: string

    @IsOptional()
    @IsBoolean()
    archived?: boolean

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    name: string = ""

    @IsNotEmpty()
    @IsString()
    description: string = ""

    /**
     *
     * @param input
     */
    constructor(input: {name: string, description: string}) {
        super();

        // we have to do this because class-transformer doesn't know to create
        // an object with our specifications for the parameter
        if(input) {
            this.name = input.name
            this.description = input.description
        }
    }

    // setPermissions creates or repairs the Casbin entries for this container
    // this allows for access control
    async setPermissions(): Promise<Result<boolean>> {
        if(!this.id) return new Promise(resolve => resolve(Result.Failure('container instance lacking id')))

        const e = await Authorization.enforcer()

        const containerUserRead = await e.addPolicy('user', this.id, 'containers', 'read');
        if(!containerUserRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyUserRead = await e.addPolicy('user', this.id, 'ontology', 'read');
        if(!ontologyUserRead) Logger.error(`unable to add editor policy to new container`);

        const dataUserRead = await e.addPolicy('user', this.id, 'data', 'read');
        if(!dataUserRead) Logger.error(`unable to add editor policy to new container`);

        // editor
        const containerRead = await e.addPolicy('editor', this.id, 'containers', 'read');
        if(!containerRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyRead = await e.addPolicy('editor', this.id, 'ontology', 'write');
        if(!ontologyRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyWrite = await e.addPolicy('editor', this.id, 'ontology', 'read');
        if(!ontologyWrite) Logger.error(`unable to add editor policy to new container`);

        const dataRead = await e.addPolicy('editor', this.id, 'data', 'write');
        if(!dataRead) Logger.error(`unable to add editor policy to new container`);

        const dataWrite = await e.addPolicy('editor', this.id, 'data', 'read');
        if(!dataWrite) Logger.error(`unable to add editor policy to new container`);

        // admin
        const userRead = await e.addPolicy('admin', this.id, 'users', 'read');
        if(!userRead) Logger.error(`unable to add admin policy to new container`)

        const userWrite = await e.addPolicy('admin', this.id,  'users', 'write');
        if(!userWrite) Logger.error(`unable to add admin policy to new container`)

        const containerAdminWrite = await e.addPolicy('admin', this.id, 'containers', 'write');
        if(!containerAdminWrite) Logger.error(`unable to add editor policy to new container`);

        const containerAdminRead = await e.addPolicy('admin', this.id, 'containers', 'read');
        if(!containerAdminRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyAdminRead = await e.addPolicy('admin', this.id, 'ontology', 'write');
        if(!ontologyAdminRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyAdminWrite = await e.addPolicy('admin', this.id, 'ontology', 'read');
        if(!ontologyAdminWrite) Logger.error(`unable to add editor policy to new container`);

        const dataAdminRead = await e.addPolicy('admin', this.id, 'data', 'write');
        if(!dataAdminRead) Logger.error(`unable to add editor policy to new container`);

        const dataAdminWrite = await e.addPolicy('admin', this.id, 'data', 'read');
        if(!dataAdminWrite) Logger.error(`unable to add editor policy to new container`);

        return new Promise(resolve => resolve(Result.Success(true)))
    }
}
