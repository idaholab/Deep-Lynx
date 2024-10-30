export default async function Home(props: {params: Promise<{nodeID: string}>}) {
    const params = await props.params;
    return (
        <div>
            <h1>Selected Node ID: {params.nodeID}</h1>
        </div>
    );
}
