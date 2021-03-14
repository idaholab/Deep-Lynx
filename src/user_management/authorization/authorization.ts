import {Enforcer, newEnforcer} from "casbin";
import TypeORMAdapter from "typeorm-adapter";
import Config from "../../services/config"
import {isUserT, UserT} from "../../types/user_management/userT";


// Authorization in Deep Lynx uses the https://casbin.org/ library. Please use
// their documentation when attempting to make changes to the authorization layer.
export class Authorization {
    private e!: Enforcer;

    // In order to store the casbin configuration and policy files we use the
    // TypeORM ORM adapter. PLEASE only use it here.
    public async enforcer(): Promise<Enforcer> {
        if(!this.e) {
            const a = await TypeORMAdapter.newAdapter({
                type: 'postgres',
                url: Config.core_db_connection_string,
            });

            const e = await newEnforcer(Config.auth_config_file, a);

            this.e = e
        }

        return new Promise(resolve => resolve(this.e))
    }

    async AuthUser(user: UserT | any, action: "write" | "read", resource:string, domain?: string): Promise<boolean>{
        await this.enforcer() // insure it's connected
        if(isUserT(user)){
            if(user.admin) return true;

            if(!domain) {
                domain = "all"
            }

            await this.e.loadPolicy()
            return await this.e.enforce(user.id, domain, resource, action)
        }

        return false
    }

    async AssignRole(userID:string, role:string, domain?:string): Promise<boolean> {
        await this.enforcer() // insure it's connected
        if(!domain) domain = "all";

        await this.DeleteAllRoles(userID, domain)

        return this.e.addRoleForUser(userID, role, domain)
    }

    async RolesForUser(userID: string, domainID: string): Promise<string[]> {
        await this.enforcer() // insure it's connected
        return this.e.getRolesForUser(userID, domainID)
    }

    // permissions for user returns an array of strings with the following format
    // containerID, resource, allowed action
    async PermissionsForUser(userID: string): Promise<string[][]> {
        await this.enforcer() // insure it's connected
        const permissionReturn: string[][] = []

        // retrieves the containers in which the user has a role - response is an array of strings with the format
        // userID, role, containerID
        const roles = await this.e.getFilteredGroupingPolicy(0, userID)

        for (const role of roles) {
            // permissions return is an array of strings that follows the pattern of
            // role name, containerID, resource, actions - we only need resource and actions
            const permissions = await this.e.getImplicitPermissionsForUser(userID, role[2])
            permissions.map(perm => perm.shift())
            permissionReturn.push(...permissions)
        }

        return new Promise(resolve => resolve(permissionReturn))
    }

    async DeleteAllRoles(userID:string, domain?:string): Promise<boolean> {
        await this.enforcer() // insure it's connected
        if(!domain) domain = "all";

        await this.e.deleteRolesForUser(userID, domain)

        // for whatever reason we must save the policy on a deletion, but we don't
        // have to anywhere else?
        return this.e.savePolicy();
    }
}

export default new Authorization()

