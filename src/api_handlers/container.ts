import Result from "../result";
import {UserT} from "../types/user_management/userT";
import {ContainersT, ContainerT} from "../types/containerT";
import ContainerStorage from "../data_storage/container_storage";
import {Authorization} from "../user_management/authorization/authorization"
import Logger from "../logger";
import {AssignUserRoleNoCheck} from "../user_management/users";

// Container creation must also handle creation of policies regarding the management of said container
// because of this, creation is pulled out into its own function vs. simply connecting the storage
// layer to the api.
export async function CreateContainer(user:UserT | any, input:any): Promise<Result<ContainersT>> {
    const storage = ContainerStorage.Instance;
    const e = Authorization.Instance.e;

    const containers = await storage.Create((user as UserT).id!, input);
    if(containers.isError) return Promise.resolve(containers);

    // loop through each container, adding policy to Casbin for it. Each Container
    // is a domain, with roles being domain specific.
    for(const container of containers.value) {

        // user
        const containerUserRead = await e.addPolicy('user', container.id!, 'containers', 'read');
        if(!containerUserRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyUserRead = await e.addPolicy('user', container.id!, 'ontology', 'read');
        if(!ontologyUserRead) Logger.error(`unable to add editor policy to new container`);

        const dataUserRead = await e.addPolicy('user', container.id!, 'data', 'read');
        if(!dataUserRead) Logger.error(`unable to add editor policy to new container`);

        // editor
        const containerRead = await e.addPolicy('editor', container.id!, 'containers', 'read');
        if(!containerRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyRead = await e.addPolicy('editor', container.id!, 'ontology', 'write');
        if(!ontologyRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyWrite = await e.addPolicy('editor', container.id!, 'ontology', 'read');
        if(!ontologyWrite) Logger.error(`unable to add editor policy to new container`);

        const dataRead = await e.addPolicy('editor', container.id!, 'data', 'write');
        if(!dataRead) Logger.error(`unable to add editor policy to new container`);

        const dataWrite = await e.addPolicy('editor', container.id!, 'data', 'read');
        if(!dataWrite) Logger.error(`unable to add editor policy to new container`);

        // admin
        const userRead = await e.addPolicy('admin', container.id!, 'users', 'read');
        if(!userRead) Logger.error(`unable to add admin policy to new container`)

        const userWrite = await e.addPolicy('admin', container.id!, 'users', 'write');
        if(!userWrite) Logger.error(`unable to add admin policy to new container`)

        const containerAdminWrite = await e.addPolicy('admin', container.id!, 'containers', 'write');
        if(!containerAdminWrite) Logger.error(`unable to add editor policy to new container`);

        const containerAdminRead = await e.addPolicy('admin', container.id!, 'containers', 'read');
        if(!containerAdminRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyAdminRead = await e.addPolicy('admin', container.id!, 'ontology', 'write');
        if(!ontologyAdminRead) Logger.error(`unable to add editor policy to new container`);

        const ontologyAdminWrite = await e.addPolicy('admin', container.id!, 'ontology', 'read');
        if(!ontologyAdminWrite) Logger.error(`unable to add editor policy to new container`);

        const dataAdminRead = await e.addPolicy('admin', container.id!, 'data', 'write');
        if(!dataAdminRead) Logger.error(`unable to add editor policy to new container`);

        const dataAdminWrite = await e.addPolicy('admin', container.id!, 'data', 'read');
        if(!dataAdminWrite) Logger.error(`unable to add editor policy to new container`);
    }

    // assign the creating user Admin privileges for each container created
    for(const container of containers.value) {
       const result = await AssignUserRoleNoCheck(user, {
            user_id: user.id,
            container_id: container.id,
            role_name: "admin"
        })

       if(result.isError) {
            Logger.error(`unable to assign role to user for newly created container ${result.error}`)
        }
    }

    return Promise.resolve(containers)
}

// ListContainers will list ONLY the containers that the provided user is allowed
// access to. Admin will return all containers
export async function ListContainers(user: UserT | undefined): Promise<Result<ContainerT[]>>{
    // casbin enforcer
   const e = Authorization.Instance.e;

   if(!user || user.admin) {
       return ContainerStorage.Instance.List()
   }

    // using the casbin filtered grouping function, fetch all permission sets for
    // user. Those permissions sets will contain all domains, or containers, a user
    // is a part of. With that information we can then query for the entirety of
    // the container information

    // grouping policies follow the pattern of user id, role, domain id. In this
    // case we are fetching all grouping policies(permission sets) with a given
    // userID
   const permissionSets = await e.getFilteredGroupingPolicy(0, user.id!)

   const containerIDs: string[] = [];

   // extract the container id, the third argument, from each returned set
   permissionSets.map(set => {
       if(set[2]) containerIDs.push((set[2]))
   })

   if(containerIDs.length === 0) {
        return new Promise(resolve => resolve(Result.Success([])))
    }


   return ContainerStorage.Instance.ListFromIDS(containerIDs)
}

export async function RepairContainerPermissions(containerID: string): Promise<boolean> {
    const e = Authorization.Instance.e;

    const containerUserRead = await e.addPolicy('user', containerID, 'containers', 'read');
    if(!containerUserRead) Logger.error(`unable to add editor policy to new container`);

    const ontologyUserRead = await e.addPolicy('user', containerID, 'ontology', 'read');
    if(!ontologyUserRead) Logger.error(`unable to add editor policy to new container`);

    const dataUserRead = await e.addPolicy('user', containerID, 'data', 'read');
    if(!dataUserRead) Logger.error(`unable to add editor policy to new container`);

    // editor
    const containerRead = await e.addPolicy('editor', containerID, 'containers', 'read');
    if(!containerRead) Logger.error(`unable to add editor policy to new container`);

    const ontologyRead = await e.addPolicy('editor', containerID, 'ontology', 'write');
    if(!ontologyRead) Logger.error(`unable to add editor policy to new container`);

    const ontologyWrite = await e.addPolicy('editor', containerID, 'ontology', 'read');
    if(!ontologyWrite) Logger.error(`unable to add editor policy to new container`);

    const dataRead = await e.addPolicy('editor', containerID, 'data', 'write');
    if(!dataRead) Logger.error(`unable to add editor policy to new container`);

    const dataWrite = await e.addPolicy('editor', containerID, 'data', 'read');
    if(!dataWrite) Logger.error(`unable to add editor policy to new container`);

    // admin
    const userRead = await e.addPolicy('admin', containerID, 'users', 'read');
    if(!userRead) Logger.error(`unable to add admin policy to new container`)

    const userWrite = await e.addPolicy('admin', containerID, 'users', 'write');
    if(!userWrite) Logger.error(`unable to add admin policy to new container`)

    const containerAdminWrite = await e.addPolicy('admin', containerID, 'containers', 'write');
    if(!containerAdminWrite) Logger.error(`unable to add editor policy to new container`);

    const containerAdminRead = await e.addPolicy('admin', containerID, 'containers', 'read');
    if(!containerAdminRead) Logger.error(`unable to add editor policy to new container`);

    const ontologyAdminRead = await e.addPolicy('admin', containerID, 'ontology', 'write');
    if(!ontologyAdminRead) Logger.error(`unable to add editor policy to new container`);

    const ontologyAdminWrite = await e.addPolicy('admin', containerID, 'ontology', 'read');
    if(!ontologyAdminWrite) Logger.error(`unable to add editor policy to new container`);

    const dataAdminRead = await e.addPolicy('admin', containerID, 'data', 'write');
    if(!dataAdminRead) Logger.error(`unable to add editor policy to new container`);

    const dataAdminWrite = await e.addPolicy('admin', containerID, 'data', 'read');
    if(!dataAdminWrite) Logger.error(`unable to add editor policy to new container`);

    return new Promise(resolve => resolve(true))
}

