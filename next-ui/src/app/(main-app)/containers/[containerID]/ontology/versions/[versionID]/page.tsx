export default function Home({params}: {params: {versionID: string}}) {
    return (
        <div>
            <h1>Ontology Version ID: {params.versionID}</h1>
        </div>
    );
}
