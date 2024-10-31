export default async function Home(props: {params: Promise<{templateID: string}>}) {
    const params = await props.params;
    return (
        <div>
            <h1>Specific Data Source Template: {params.templateID}</h1>
        </div>
    );
}
