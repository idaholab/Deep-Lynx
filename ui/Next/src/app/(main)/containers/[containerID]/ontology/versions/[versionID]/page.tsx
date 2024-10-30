export default async function Home(props: {params: Promise<{versionID: string}>}) {
    const params = await props.params;
    return (
        <div>
            <h1>Ontology Version ID: {params.versionID}</h1>
        </div>
    );
}
