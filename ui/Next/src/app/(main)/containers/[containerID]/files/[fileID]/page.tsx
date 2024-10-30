export default async function Home(props: {params: Promise<{fileID: string}>}) {
    const params = await props.params;
    return (
        <div>
            <h1>Specific File ID: {params.fileID}</h1>
        </div>
    );
}
