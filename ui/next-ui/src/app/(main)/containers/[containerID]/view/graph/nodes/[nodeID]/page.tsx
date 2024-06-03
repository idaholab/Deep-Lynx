export default function Home({params}: {params: {nodeID: string}}) {
    return (
        <div>
            <h1>Selected Node ID: {params.nodeID}</h1>
        </div>
    );
}
