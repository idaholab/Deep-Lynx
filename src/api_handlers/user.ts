import {UserT} from "../types/user_management/userT";
import Result from "../result";
import {Authorization} from "../user_management/authorization/authorization";
import UserStorage from "../data_storage/user_management/user_storage";

// The only connection a user has to a container are the roles that are assigned to them,
// and those roles are managed using Casbin. We use this function to fetch all users associated
// with a given container, or rather all users that have a role in given container
export async function UsersForContainer(user: UserT | undefined, containerID: string): Promise<Result<UserT[]>> {
    const e = Authorization.Instance.e

    // using the casbin filtered grouping function, fetch all permission sets for
    // container. Those permissions sets will contain all users associated with that container.
    // grouping policies follow the pattern of user id, role, domain id. In this
    // case we are fetching all grouping policies(permission sets) with a given
    // domain(container)
    const permissionSets = await e.getFilteredGroupingPolicy(2, containerID)

    const userIDs: string[] = [];

    permissionSets.map(set => {
        if(set[0]) userIDs.push(set[0])
    })

    return UserStorage.Instance.ListFromIDs(userIDs)
}
