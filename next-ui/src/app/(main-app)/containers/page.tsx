import {client} from '../../_lib/api';
import {ContainerT} from '../../_lib/types';

export default async function Home() {
    const containers: ContainerT[] = await client.listContainers();
    return (
        <div>
            <h1>Containers</h1>
            <div>{containers[2].id}</div>
        </div>
    );
}
