export default async function Home(props: {params: Promise<{importID: string}>}) {
    const params = await props.params;
    return (
        <div>
            <h1>Import ID: {params.importID}</h1>
        </div>
    );
}
